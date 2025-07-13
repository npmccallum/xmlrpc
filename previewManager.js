/**
 * Manages webview preview panels for xml2rfc output
 */
const vscode = require("vscode");
const { UI } = require("./constants");

// Loading template for preview panels
const LOADING_TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Loading xml2rfc Preview</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        padding: 2rem;
        text-align: center;
        color: var(--vscode-editor-foreground);
        background-color: var(--vscode-editor-background);
      }
    </style>
  </head>
  <body>
    <h1>Loading Preview</h1>
    <p>Preparing xml2rfc preview for {{fileName}}...</p>
  </body>
</html>`;

class PreviewManager {
  constructor() {
    // Simple constructor - no file I/O needed
  }

  /**
   * Creates a new preview panel
   * @param {string} fileName - Name of the file being previewed
   * @param {Function} onDispose - Callback when panel is disposed
   * @returns {vscode.WebviewPanel} The created panel
   */
  createPreviewPanel(fileName, onDispose) {
    const panel = vscode.window.createWebviewPanel(
      "xml2rfcPreview",
      `📄 ${fileName}`,
      UI.PREVIEW_COLUMN,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.onDidDispose(onDispose);
    return panel;
  }

  /**
   * Shows loading content in panel
   * @param {vscode.WebviewPanel} panel - The webview panel
   * @param {string} fileName - Name of file being processed
   */
  showLoading(panel, fileName) {
    panel.webview.html = LOADING_TEMPLATE.replace("{{fileName}}", fileName);
  }

  /**
   * Updates panel with HTML content
   * @param {vscode.WebviewPanel} panel - The webview panel
   * @param {string} html - HTML content to display
   */
  updateContent(panel, html) {
    if (panel) {
      panel.webview.html =
        html || this.getErrorHtml("Failed to generate preview");
    }
  }

  /**
   * Generates HTML for error messages
   * @param {string} message - The error message to display
   * @param {Array} [diagnostics] - Array of diagnostic objects to display
   * @returns {string} HTML content
   */
  getErrorHtml(message, diagnostics) {
    const errorList =
      diagnostics && diagnostics.length > 0
        ? diagnostics
            .map((d) => `<li>Line ${d.line + 1}: ${d.message}</li>`)
            .join("")
        : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>xml2rfc Preview Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 2rem;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
          }
          h1 {
            color: var(--vscode-errorForeground);
            margin-bottom: 1rem;
          }
          ul {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 1rem;
            border-radius: 3px;
            margin: 1rem 0;
          }
          li {
            margin: 0.5rem 0;
          }
          .no-errors {
            font-style: italic;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <h1>❌ ${message}</h1>
        ${
          errorList
            ? `<ul>${errorList}</ul>`
            : '<p class="no-errors">No specific errors detected.</p>'
        }
        <p>Check the Problems panel for detailed error locations.</p>
      </body>
      </html>
    `;
  }
}

module.exports = PreviewManager;
