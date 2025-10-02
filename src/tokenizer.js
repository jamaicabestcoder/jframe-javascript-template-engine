/**
 * Tokenizer - converts template strings into tokens
 */

// Token types
export const TOKEN_TYPES = {
  TEXT: 'TEXT',
  VAR: 'VAR',                    // {{variable}}
  RAW: 'RAW',                    // {{{variable}}}
  IF_START: 'IF_START',          // {{#if condition}}
  IF_END: 'IF_END',              // {{/if}}
  EACH_START: 'EACH_START',      // {{#each items}}
  EACH_END: 'EACH_END',          // {{/each}}
};

/**
 * Tokenizer class - converts template strings to tokens
 */
export class Tokenizer {
  /**
   * Tokenizes a template string
   * @param {string} template - Template string to tokenize
   * @returns {Array} Array of tokens
   */
  tokenize(template) {
    
    if (typeof template !== 'string') {
      throw new Error('Template must be a string');
    }

    // Handle empty template
    if (template.length === 0) {
      return [];
    }

    const tokens = [];
    let position = 0;
    const length = template.length;
    let textBuffer = '';

    while (position < length) {
      const char = template[position];
      // Check for opening braces with bounds checking
      if (char === '{' && 
          position + 1 < length && 
          template[position + 1] === '{') {
        
        // Save any accumulated text
        if (textBuffer.length > 0) {
          tokens.push({
            type: TOKEN_TYPES.TEXT,
            value: textBuffer
          });
          textBuffer = '';
        }

        // Check if it's raw triple braces with bounds checking
        let isRaw = false;
        let exprStart = position + 2;
        
        if (position + 2 < length && template[position + 2] === '{') {
          isRaw = true;
          exprStart = position + 3;
        }

        // Find the closing braces
        const closeMarker = isRaw ? '}}}' : '}}';
        const closeIndex = template.indexOf(closeMarker, exprStart);
        
        if (closeIndex === -1) {
          throw new Error(`Unclosed expression at position ${position}`);
        }

        // Extract and process the expression
        const expression = template.substring(exprStart, closeIndex).trim();
        this._processExpression(expression, isRaw, tokens);

        // Move position past the closing braces
        position = closeIndex + closeMarker.length;
      } else {
        // Accumulate regular text
        textBuffer += char;
        position++;
      }
    }

    // Add any remaining text
    if (textBuffer.length > 0) {
      tokens.push({
        type: TOKEN_TYPES.TEXT,
        value: textBuffer
      });
    }
    return tokens;
  }

  /**
   * Processes expression content and creates appropriate tokens
   * @private
   */
  _processExpression(expression, isRaw, tokens) {
    
    if (isRaw) {
      tokens.push({
        type: TOKEN_TYPES.RAW,
        expression: expression
      });
      return;
    }

    // Handle directives
    if (expression.startsWith('#if ')) {
      const condition = expression.slice(4).trim();
      if (!condition) throw new Error('If directive requires a condition');
      tokens.push({
        type: TOKEN_TYPES.IF_START,
        condition: condition
      });
    } else if (expression.startsWith('#each ')) {
      const items = expression.slice(6).trim();
      if (!items) throw new Error('Each directive requires an items expression');
      tokens.push({
        type: TOKEN_TYPES.EACH_START,
        items: items
      });
    } else if (expression === '/if') {
      tokens.push({
        type: TOKEN_TYPES.IF_END
      });
    } else if (expression === '/each') {
      tokens.push({
        type: TOKEN_TYPES.EACH_END
      });
    } else if (expression.startsWith('/')) {
      throw new Error(`Unknown closing directive: ${expression}`);
    } else {
      // Regular variable
      tokens.push({
        type: TOKEN_TYPES.VAR,
        expression: expression
      });
    }
  }
}