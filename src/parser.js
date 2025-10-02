/**
 * Parser - builds Abstract Syntax Tree from tokens
 */

// AST Node types
export const NODE_TYPES = {
  TEXT: 'Text',
  VARIABLE: 'Variable',
  RAW_VARIABLE: 'RawVariable',
  IF: 'If',
  EACH: 'Each',
  ROOT: 'Root'
};

/**
 * Parser class - converts tokens to AST
 */
export class Parser {
  /**
   * Parses tokens into an AST
   * @param {Array} tokens - Tokens from tokenizer
   * @returns {Object} Root AST node
   */
  parse(tokens) {
    if (!Array.isArray(tokens)) {
      throw new Error('Tokens must be an array');
    }

    const root = {
      type: NODE_TYPES.ROOT,
      children: []
    };

    let position = 0;
    
    // Parse all tokens
    const parseResult = this._parseTokens(tokens, position);
    root.children = parseResult.nodes;
    
    if (parseResult.position < tokens.length) {
      throw new Error('Unexpected tokens at end of template');
    }

    return root;
  }

  /**
   * Recursively parses tokens into AST nodes
   * @private
   */
  _parseTokens(tokens, startPosition) {
    const nodes = [];
    let position = startPosition;

    while (position < tokens.length) {
      const token = tokens[position];

      switch (token.type) {
        case 'TEXT':
          nodes.push({
            type: NODE_TYPES.TEXT,
            value: token.value
          });
          position++;
          break;

        case 'VAR':
          nodes.push({
            type: NODE_TYPES.VARIABLE,
            expression: token.expression
          });
          position++;
          break;

        case 'RAW':
          nodes.push({
            type: NODE_TYPES.RAW_VARIABLE,
            expression: token.expression
          });
          position++;
          break;

        case 'IF_START':
          const ifResult = this._parseBlock(tokens, position, 'IF_START', 'IF_END', NODE_TYPES.IF);
          nodes.push(ifResult.node);
          position = ifResult.nextPosition;
          break;

        case 'EACH_START':
          const eachResult = this._parseBlock(tokens, position, 'EACH_START', 'EACH_END', NODE_TYPES.EACH);
          nodes.push(eachResult.node);
          position = eachResult.nextPosition;
          break;

        case 'IF_END':
        case 'EACH_END':
          // We've reached the end of a block, return control to parent
          return {
            nodes,
            position
          };

        default:
          throw new Error(`Unknown token type: ${token.type}`);
      }
    }

    return {
      nodes,
      position
    };
  }

  /**
   * Parses block structures (if, each)
   * @private
   */
  _parseBlock(tokens, startPosition, startType, endType, nodeType) {
    const startToken = tokens[startPosition];
    
    if (startToken.type !== startType) {
      throw new Error(`Expected ${startType} at position ${startPosition}`);
    }

    // Parse children (everything until matching end tag)
    const childResult = this._parseTokens(tokens, startPosition + 1);
    
    // Check if we have the correct end tag
    if (childResult.position >= tokens.length || tokens[childResult.position].type !== endType) {
      // FIXED: Added the missing closing brace in error messages
      const directiveName = startType.toLowerCase().replace('_start', '');
      throw new Error(`Unclosed {{#${directiveName}}} directive`);
    }

    let node;
    if (nodeType === NODE_TYPES.IF) {
      node = {
        type: NODE_TYPES.IF,
        condition: startToken.condition,
        children: childResult.nodes
      };
    } else if (nodeType === NODE_TYPES.EACH) {
      node = {
        type: NODE_TYPES.EACH,
        items: startToken.items,
        children: childResult.nodes
      };
    }

    return {
      node,
      nextPosition: childResult.position + 1 // Move past the end tag
    };
  }
}