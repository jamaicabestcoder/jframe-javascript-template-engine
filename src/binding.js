/**
 * Binding Manager - handles two-way data binding
 */
export class BindingManager {
  constructor() {
    this.bindings = new Map();
    this.observers = new Map();
  }

  /**
   * Creates two-way binding for form elements
   * @param {HTMLElement} element - DOM element to bind
   * @param {Object} data - Data object
   * @param {string} path - Property path in data object
   */
  bindElement(element, data, path) {
    const bindingId = `${element.id}-${path}`;
    
    // Set initial value
    this._updateElement(element, this._getValue(data, path));

    // Create observer if not exists
    if (!this.observers.has(path)) {
      this._createObserver(data, path);
    }

    // Store binding
    this.bindings.set(bindingId, { element, data, path });

    // Add event listeners for two-way binding
    this._addBindingListeners(element, data, path);
  }

  /**
   * Updates all elements bound to a specific path
   */
  updateBoundElements(path, value) {
    for (const [bindingId, binding] of this.bindings) {
      if (binding.path === path) {
        this._updateElement(binding.element, value);
      }
    }
  }

  /**
   * Creates property observer using Proxy
   */
  _createObserver(data, path) {
    if (typeof data !== 'object' || data === null) return;

    const [root, ...rest] = path.split('.');
    
    if (rest.length === 0) {
      // Simple property
      this._makeObservable(data, root, path);
    } else {
      // Nested property
      let current = data[root];
      let currentPath = root;
      
      for (const prop of rest) {
        if (current && typeof current === 'object') {
          this._makeObservable(current, prop, path);
          currentPath += '.' + prop;
          current = current[prop];
        }
      }
    }
  }

  /**
   * Makes a property observable using getter/setter
   */
  _makeObservable(obj, prop, fullPath) {
    if (!obj || typeof obj !== 'object') return;

    let value = obj[prop];

    Object.defineProperty(obj, prop, {
      get() {
        return value;
      },
      set: (newValue) => {
        if (value !== newValue) {
          value = newValue;
          this.updateBoundElements(fullPath, newValue);
        }
      },
      enumerable: true,
      configurable: true
    });

    // If it's an object, make it deeply observable
    if (value && typeof value === 'object') {
      this._makeDeeplyObservable(value, fullPath);
    }
  }

  /**
   * Makes all properties of an object observable
   */
  _makeDeeplyObservable(obj, basePath) {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      const nestedPath = basePath ? `${basePath}.${key}` : key;
      this._makeObservable(obj, key, nestedPath);
    }
  }

  /**
   * Adds event listeners for two-way binding
   */
  _addBindingListeners(element, data, path) {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'input':
      case 'textarea':
      case 'select':
        element.addEventListener('input', (e) => {
          this._setValue(data, path, e.target.value);
        });
        break;
      
      case 'input':
        if (element.type === 'checkbox') {
          element.addEventListener('change', (e) => {
            this._setValue(data, path, e.target.checked);
          });
        } else if (element.type === 'radio') {
          element.addEventListener('change', (e) => {
            if (e.target.checked) {
              this._setValue(data, path, e.target.value);
            }
          });
        }
        break;
    }
  }

  /**
   * Updates element value based on type
   */
  _updateElement(element, value) {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'input':
        if (element.type === 'checkbox') {
          element.checked = !!value;
        } else if (element.type === 'radio') {
          element.checked = element.value === value;
        } else {
          element.value = value != null ? value : '';
        }
        break;
      
      case 'textarea':
      case 'select':
        element.value = value != null ? value : '';
        break;
      
      default:
        element.textContent = value != null ? value : '';
        break;
    }
  }

  /**
   * Gets nested property value
   */
  _getValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Sets nested property value
   */
  _setValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (current[key] === undefined) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Clears all bindings
   */
  clear() {
    this.bindings.clear();
    this.observers.clear();
  }
}