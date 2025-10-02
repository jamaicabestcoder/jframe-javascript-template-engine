/**
 * Renderer - executes compiled templates with data context
 */

/**
 * Renderer class - manages template rendering
 */
export class Renderer {
  /**
   * Renders a template with the given context
   * @param {Function} compiledTemplate - Compiled template function
   * @param {Object} context - Data context
   * @returns {string} Rendered HTML
   */
  render(compiledTemplate, context = {}) {
    if (typeof compiledTemplate !== 'function') {
      throw new Error('Compiled template must be a function');
    }

    if (typeof context !== 'object' || context === null) {
      throw new Error('Context must be an object');
    }

    try {
      return compiledTemplate(context);
    } catch (error) {
      throw new Error(`Rendering failed: ${error.message}`);
    }
  }
}