/**
 * Utility functions for the templating engine
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (str == null) return '';
  
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely gets a nested property from an object using dot notation
 * @param {Object} obj - Object to get property from
 * @param {string} path - Dot notation path (e.g., 'user.name')
 * @returns {*} Property value or undefined if not found
 */
export function deepGet(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!path) return obj;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') return undefined;
    result = result[key];
  }
  
  return result;
}

/**
 * Validates if a string is a valid JavaScript identifier path
 * @param {string} path - Path to validate
 * @returns {boolean} True if valid
 */
export function isValidPath(path) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(path);
}