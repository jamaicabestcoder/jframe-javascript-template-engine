/**
 * Compiler - converts AST to executable JavaScript functions
 */

import { escapeHtml, deepGet, isValidPath } from './utils.js';

/**
 * Compiler class - generates render functions from AST
 */
export class Compiler {
  /**
   * Compiles AST to a render function
   * @param {Object} ast - Abstract Syntax Tree
   * @returns {Function} Compiled render function
   */
  compile(ast) {
    if (!ast || ast.type !== 'Root') {
      throw new Error('Invalid AST: expected Root node');
    }

    const jsCode = this._generateJSCode(ast);

    // Create function using Function constructor (safe for browser)
    try {
      return new Function('ctx', jsCode);
    } catch (error) {
      throw new Error(`Compilation failed: ${error.message}. Generated code: ${jsCode}`);
    }
  }

  /**
   * Generates JavaScript code from AST
   * @private
   */
  _generateJSCode(ast) {
    const lines = [
      '"use strict";',
      'var output = [];',
      `var __escape = ${escapeHtml.toString()};`,
      `var __get = ${deepGet.toString()};`
    ];

    // Generate code for each child node
    ast.children.forEach(child => {
      lines.push(...this._generateNodeCode(child));
    });

    lines.push('return output.join("");');
    return lines.join('\n');
  }

  /**
   * Generates JavaScript code for a single AST node
   * @private
   */
  _generateNodeCode(node, loopContext = null) {
    const lines = [];

    switch (node.type) {
      case 'Text':
        lines.push(`output.push(${JSON.stringify(node.value)});`);
        break;

      case 'Variable':
        lines.push(...this._generateVariableCode(node.expression, false, loopContext));
        break;

      case 'RawVariable':
        lines.push(...this._generateVariableCode(node.expression, true, loopContext));
        break;

      case 'If':
        lines.push(...this._generateIfCode(node, loopContext));
        break;

      case 'Each':
        lines.push(...this._generateEachCode(node, loopContext));
        break;

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    return lines;
  }

  /**
   * Generates code for variable expressions
   * @private
   */
  _generateVariableCode(expression, isRaw, loopContext) {
    const lines = [];

    // Validate expression
    if (!expression.trim()) {
      throw new Error('Empty variable expression');
    }

    const accessCode = this._generateAccessCode(expression, loopContext);
    if (isRaw) {
      lines.push(`output.push(String(${accessCode}));`);
    } else {
      lines.push(`output.push(__escape(${accessCode}));`);
    }

    return lines;
  }

  /**
   * Generates safe property access code for complex expressions
   * @private
   */
  _generateAccessCode(expression, loopContext) {
    // Handle 'this' in loop context
    if (expression === 'this') {
      return loopContext ? loopContext.itemName : 'ctx';
    }

    // Handle 'this.property' in loop context
    if (expression.startsWith('this.')) {
      const prop = expression.slice(5);
      if (loopContext) {
        return this._compileComplexExpression(`${loopContext.itemName}.${prop}`, loopContext);
      }
      return this._compileComplexExpression(`ctx.${prop}`, loopContext);
    }

    // Handle complex expressions with method calls, arithmetic, etc.
    if (this._isComplexExpression(expression)) {
      return this._compileComplexExpression(expression, loopContext);
    }

    // Simple identifier or dot notation
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(expression)) {
      return `__get(ctx, ${JSON.stringify(expression)})`;
    }

    throw new Error(`Invalid variable expression: ${expression}`);
  }

  /**
   * Checks if expression contains complex operations
   * @private
   */
  _isComplexExpression(expr) {
    const complexPatterns = [
      /\(/,
      /\)/,
      /\+/,
      /\-/,
      /\*/,
      /\//,
      /\.length\b/,
      /\.split\b/,
      /\.join\b/,
      /\.toUpperCase\b/,
      /\.toLowerCase\b/,
      /\.trim\b/,
      /\.slice\b/,
      /\.substring\b/,
      /\.charAt\b/,
      /\.filter\b/,
      /=>/,
      /@index/
    ];

    return complexPatterns.some(pattern => pattern.test(expr));
  }

  /**
   * Compiles complex JavaScript expressions
   * @private
   */
  _compileComplexExpression(expression, loopContext) {
    let jsExpr = expression;

    // Handle @index replacement
    if (jsExpr.includes('@index')) {
      if (loopContext && loopContext.indexName) {
        jsExpr = jsExpr.replace(/@index/g, loopContext.indexName);
      } else {
        jsExpr = jsExpr.replace(/@index/g, '0');
      }
    }

    // Handle 'this' replacement in loop context
    if (loopContext) {
      if (jsExpr === 'this') {
        jsExpr = loopContext.itemName;
      } else if (jsExpr.startsWith('this.')) {
        jsExpr = loopContext.itemName + '.' + jsExpr.slice(5);
      }
    }

    // Handle arrow functions by converting them to regular functions
    if (jsExpr.includes('=>')) {
      jsExpr = jsExpr.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*(.+)/g, 'function($1) { return $2 }');
    }

    // Validate the expression
    try {
      // Test if it's valid JS
      new Function('return ' + jsExpr);
      return jsExpr;
    } catch (error) {
      throw new Error(`Invalid complex expression: "${expression}". Error: ${error.message}`);
    }
  }

  /**
   * Generates code for if directives
   * @private
   */
  _generateIfCode(node, loopContext) {
    const lines = [];
    const conditionCode = this._generateConditionCode(node.condition, loopContext);

    lines.push(`if (${conditionCode}) {`);

    node.children.forEach(child => {
      const childLines = this._generateNodeCode(child, loopContext);
      childLines.forEach(line => lines.push('  ' + line));
    });

    lines.push('}');

    return lines;
  }

  /**
   * Generates code for condition expressions
   * @private
   */
  _generateConditionCode(condition, loopContext) {
    condition = condition.trim();

    // Handle comparison operations like (eq a b), (lt a b), etc.
    const comparisonMatch = condition.match(/^\((\w+)\s+([^)]+)\s+([^)]+)\)$/);
    if (comparisonMatch) {
      const [, operator, left, right] = comparisonMatch;
      const leftCode = this._generateComparisonOperand(left.trim(), loopContext);
      const rightCode = this._generateComparisonOperand(right.trim(), loopContext);

      switch (operator) {
        case 'eq':
          return `${leftCode} === ${rightCode}`;
        case 'neq':
          return `${leftCode} !== ${rightCode}`;
        case 'gt':
          return `${leftCode} > ${rightCode}`;
        case 'gte':
          return `${leftCode} >= ${rightCode}`;
        case 'lt':
          return `${leftCode} < ${rightCode}`;
        case 'lte':
          return `${leftCode} <= ${rightCode}`;
        case 'and':
          return `${leftCode} && ${rightCode}`;
        case 'or':
          return `${leftCode} || ${rightCode}`;
        default:
          throw new Error(`Unsupported comparison operator: ${operator}`);
      }
    }

    // Handle complex conditions - Use _generateAccessCode for proper context access
    if (this._isComplexExpression(condition)) {
      const valueCode = this._generateAccessCode(condition, loopContext);
      return `!!(${valueCode})`;
    }

    // Handle 'this.property' in loop context
    if (condition.startsWith('this.')) {
      const prop = condition.slice(5);
      if (loopContext) {
        return `!!${loopContext.itemName}.${prop}`;
      }
      return `!!__get(ctx, ${JSON.stringify(prop)})`;
    }

    // Handle simple truthy checks
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(condition)) {
      const valueCode = this._generateAccessCode(condition, loopContext);
      return `!!${valueCode}`;
    }

    throw new Error(`Invalid condition expression: ${condition}`);
  }

  /**
   * Generates code for comparison operands (handles strings, numbers, and variables)
   * @private
   */
  _generateComparisonOperand(operand, loopContext) {
    operand = operand.trim();

    // If it's a quoted string, return as string literal
    if ((operand.startsWith("'") && operand.endsWith("'")) ||
      (operand.startsWith('"') && operand.endsWith('"'))) {
      return operand;
    }

    // If it's a number, return as number
    if (!isNaN(operand) && operand.trim() !== '') {
      return operand;
    }

    // Handle complex expressions
    if (this._isComplexExpression(operand)) {
      return this._compileComplexExpression(operand, loopContext);
    }

    // Otherwise treat as variable reference
    return this._generateAccessCode(operand, loopContext);
  }

  /**
   * Generates code for each directives
   * @private
   */
  _generateEachCode(node, parentLoopContext) {
    const lines = [];
    const itemsCode = this._generateAccessCode(node.items, parentLoopContext);

    // Generate unique variable names to avoid conflicts
    const loopId = Math.random().toString(36).substr(2, 9);
    const itemName = `item_${loopId}`;
    const indexName = `index_${loopId}`;
    const arrayName = `items_${loopId}`;
    
    // Create loop context with indexName for @index replacement
    const loopContext = { 
      itemName, 
      indexName, 
      parent: parentLoopContext 
    };

    lines.push(`var ${arrayName} = ${itemsCode};`);
    lines.push(`if (Array.isArray(${arrayName})) {`);
    lines.push(`  for (var ${indexName} = 0; ${indexName} < ${arrayName}.length; ${indexName}++) {`);
    lines.push(`    var ${itemName} = ${arrayName}[${indexName}];`);

    // Pass loopContext to child nodes for @index and this replacement
    node.children.forEach(child => {
      const childLines = this._generateNodeCode(child, loopContext);
      childLines.forEach(line => lines.push('      ' + line));
    });

    lines.push('  }');
    lines.push('}');

    return lines;
  }
}