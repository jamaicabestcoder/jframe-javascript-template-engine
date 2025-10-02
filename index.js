/**
 * Main entry point for the templating engine
 */

// Import individual components first
import { Tokenizer } from './src/tokenizer.js';
import { Parser } from './src/parser.js';
import { Compiler } from './src/compiler.js';
import { Renderer } from './src/renderer.js';
import { BindingManager } from './src/binding.js';

/**
 * Templating Engine - main class that orchestrates the entire process
 */
export class Jframe {
  constructor() {
    this.tokenizer = new Tokenizer();
    this.parser = new Parser();
    this.compiler = new Compiler();
    this.renderer = new Renderer();
    this.bindingManager = new BindingManager();
    this.renderedElements = new Map();
  }

  /**
   * Compiles a template string into a render function
   * @param {string} template - Template string
   * @returns {Function} Compiled render function
   */
  compile(template) {
    if (typeof template !== 'string') {
      throw new Error('Template must be a string');
    }

    // Step 1: Tokenize
    const tokens = this.tokenizer.tokenize(template);

    // Step 2: Parse
    const ast = this.parser.parse(tokens);

    // Step 3: Compile
    return this.compiler.compile(ast);
  }

  /**
   * Renders a template with the given data context
   * @param {string|HTMLElement} target - Template string or DOM element
   * @param {Object} context - Data context
   * @param {boolean} enableBinding - Enable two-way data binding
   * @returns {string|HTMLElement} Rendered HTML or element
   */
  render(target, context = {}, enableBinding = false) {
    if (typeof target === 'string') {
      // Original behavior - return HTML string
      const compiled = this.compile(target);
      return this.renderer.render(compiled, context);
    } else if (target instanceof HTMLElement) {
      // New behavior - render directly to DOM element
      return this._renderToElement(target, context, enableBinding);
    } else {
      throw new Error('Target must be a string template or DOM element');
    }
  }

  /**
   * Renders template to DOM element
   * @private
   */
  _renderToElement(element, context, enableBinding) {
    const template = element.innerHTML;
    const compiled = this.compile(template);
    const html = this.renderer.render(compiled, context);

    // Update element content
    element.innerHTML = html;

    // FIX: Store the element reference properly
    this.renderedElements.set(element, {
      context: { ...context }, // Clone the context
      enableBinding,
      template: template // Store original template
    });

    if (enableBinding) {
      this._setupBindings(element, context);
    }

    return element;
  }

  /**
   * Sets up two-way data binding for form elements
   * @private
   */
  _setupBindings(element, context) {
    // Find all elements with data-bind attribute
    const bindableElements = element.querySelectorAll('[data-bind]');

    bindableElements.forEach(el => {
      const path = el.getAttribute('data-bind');
      if (path) {
        this.bindingManager.bindElement(el, context, path);
      }
    });

    // Also check the container element itself
    if (element.hasAttribute('data-bind')) {
      const path = element.getAttribute('data-bind');
      this.bindingManager.bindElement(element, context, path);
    }
  }

  /**
   * Updates an existing rendered element with new data
   * @param {HTMLElement} element - Previously rendered element
   * @param {Object} newContext - New data context
   */
  update(element, newContext = {}) {
    const rendered = this.renderedElements.get(element);
    if (!rendered) {
      console.error('Element not found in renderedElements:', element);
      console.error('Available elements:', Array.from(this.renderedElements.keys()));
      throw new Error('Element was not rendered by this engine instance');
    }

    // Merge contexts properly
    const updatedContext = { ...rendered.context, ...newContext };

    // Re-render with the original template
    const compiled = this.compile(rendered.template);
    const html = this.renderer.render(compiled, updatedContext);
    element.innerHTML = html;

    // Update stored context
    rendered.context = updatedContext;
    this.renderedElements.set(element, rendered);

    // Re-setup bindings if they were enabled
    if (rendered.enableBinding) {
      this._setupBindings(element, updatedContext);
    }

    return element;
  }

  /**
   * Clears all bindings and rendered elements
   */
  destroy() {
    this.bindingManager.clear();
    this.renderedElements.clear();
  }
}

// Create default instance for easy use
export const jframe = new Jframe();

// Export individual components directly from their modules
export { Tokenizer } from './src/tokenizer.js';
export { Parser } from './src/parser.js';
export { Compiler } from './src/compiler.js';
export { Renderer } from './src/renderer.js';
export { BindingManager } from './src/binding.js';