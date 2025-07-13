const vscode = require("vscode");
const ExtensionState = require("./extensionState");
const { ERRORS } = require("./constants");

// Global singleton
const extensionState = new ExtensionState();

/**
 * Activates the xml2rfc extension
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function activate(context) {
  // Initialize extension state
  extensionState.initialize(context);

  // Register event listeners
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      extensionState.handleDocumentUpdate(event.document);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      extensionState.handleDocumentUpdate(document);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        extensionState.handleDocumentUpdate(editor.document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      extensionState.removeDocumentState(document.uri);
    })
  );

  // Register preview command
  context.subscriptions.push(
    vscode.commands.registerCommand("xml2rfc.preview", () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showInformationMessage(ERRORS.INVALID_DOCUMENT);
        return;
      }

      if (editor.document.languageId !== "xml") {
        vscode.window.showInformationMessage(ERRORS.WRONG_LANGUAGE);
        return;
      }

      const state = extensionState.getOrCreateDocumentState(editor.document);
      if (state.revealPreviewPanel()) {
        return;
      }

      const panel = extensionState.previewManager.createPreviewPanel(
        state.fileName,
        () => state.setPreviewPanel(null)
      );

      state.setPreviewPanel(panel);

      if (state.cachedHtml) {
        extensionState.previewManager.updateContent(panel, state.cachedHtml);
      } else {
        extensionState.previewManager.showLoading(panel, state.fileName);
        extensionState._scheduleProcessing(editor.document, state);
      }
    })
  );

  // Process active document on activation
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    extensionState.handleDocumentUpdate(activeEditor.document);
  }
}

/**
 * Deactivates the xml2rfc extension
 */
function deactivate() {
  extensionState.dispose();
}

module.exports = {
  activate,
  deactivate,
};
