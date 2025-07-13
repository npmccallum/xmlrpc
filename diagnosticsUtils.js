/**
 * Utilities for creating and managing VS Code diagnostics
 */
const vscode = require("vscode");
const { UI } = require("./constants");

/**
 * Creates VS Code diagnostics from internal diagnostic objects
 * @param {Array} diagnostics - Array of internal diagnostic objects
 * @returns {Array} Array of vscode.Diagnostic objects
 */
function createVSCodeDiagnostics(diagnostics) {
  if (!Array.isArray(diagnostics)) {
    return [];
  }

  return diagnostics.map((d) => {
    const range = new vscode.Range(d.line, 0, d.line, UI.MAX_LINE_LENGTH);
    return new vscode.Diagnostic(range, d.message, d.severity);
  });
}

/**
 * Updates diagnostics for a document in the diagnostic collection
 * @param {vscode.DiagnosticCollection} collection - The diagnostic collection
 * @param {vscode.Uri} uri - Document URI
 * @param {Array} diagnostics - Array of internal diagnostic objects
 */
function updateDiagnostics(collection, uri, diagnostics) {
  if (!collection) return;

  collection.delete(uri);

  if (diagnostics && diagnostics.length > 0) {
    const vscDiagnostics = createVSCodeDiagnostics(diagnostics);
    collection.set(uri, vscDiagnostics);
  }
}

module.exports = {
  createVSCodeDiagnostics,
  updateDiagnostics,
};
