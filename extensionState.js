const vscode = require("vscode");
const DocumentState = require("./documentState");
const ProcessingService = require("./processingService");
const PreviewManager = require("./previewManager");
const { ERRORS, PROCESSING, UI } = require("./constants");
const { updateDiagnostics } = require("./diagnosticsUtils");

class ExtensionState {
  constructor() {
    this.documents = new Map();
    this.diagnosticCollection = null;
    this.previewManager = new PreviewManager();
  }

  /**
   * Initializes the extension state with VS Code objects
   * @param {vscode.ExtensionContext} context - VS Code extension context
   */
  initialize(context) {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("xml2rfc");
    context.subscriptions.push(this.diagnosticCollection);
  }

  /**
   * Gets or creates document state for a given document
   * @param {vscode.TextDocument} document - The document to track
   * @returns {DocumentState} The document state instance
   */
  getOrCreateDocumentState(document) {
    const uri = document.uri.toString();

    if (!this.documents.has(uri)) {
      this.documents.set(
        uri,
        new DocumentState(document, (doc, state) =>
          this._scheduleProcessing(doc, state)
        )
      );
    }

    return this.documents.get(uri);
  }

  /**
   * Removes and cleans up document state
   * @param {vscode.Uri} documentUri - URI of document to remove
   */
  removeDocumentState(documentUri) {
    const uri = documentUri.toString();
    const state = this.documents.get(uri);

    if (state) {
      state.dispose();
      this.documents.delete(uri);

      // Clear diagnostics for this file
      if (this.diagnosticCollection) {
        this.diagnosticCollection.delete(documentUri);
      }
    }
  }

  /**
   * Handles document update events
   * @param {vscode.TextDocument} document - Updated document
   * @returns {DocumentState|null} The document state if processed
   */
  handleDocumentUpdate(document) {
    // Skip .git files to prevent duplicate diagnostics
    if (document.fileName.endsWith(".git")) {
      return;
    }

    const state = this.getOrCreateDocumentState(document);
    state.updateFromDocument(document);

    // Update diagnostics if processing isn't needed or scheduled
    // Processing will handle diagnostics when it completes
    if (!state.needsProcessing()) {
      this._updateDiagnostics(document, state);
    }

    return state;
  }

  /**
   * Updates diagnostics for a document
   * @param {vscode.TextDocument} document - The document
   * @param {DocumentState} state - Document state
   * @private
   */
  _updateDiagnostics(document, state) {
    updateDiagnostics(
      this.diagnosticCollection,
      document.uri,
      state.lastDiagnostics
    );
  }

  /**
   * Schedules document processing with xml2rfc
   * @param {vscode.TextDocument} document - Document to process
   * @param {DocumentState} state - Document state object
   * @private
   */
  async _scheduleProcessing(document, state) {
    state.startProcessing();

    try {
      const processingService = new ProcessingService();
      const result = await processingService.processDocument(
        document,
        (diags) => {
          state.lastDiagnostics = diags;
          this._updateDiagnostics(document, state);
        }
      );

      state.finishProcessing(null, result.html);
      state.updatePreviewPanel(
        result.html ||
          this.previewManager.getErrorHtml(
            "Failed to compile RFC XML",
            result.diagnostics
          )
      );
    } catch (error) {
      state.finishProcessing(error);
      state.updatePreviewPanel(
        this.previewManager.getErrorHtml(
          "Processing Error",
          state.lastDiagnostics
        )
      );
    }
  }

  /**
   * Cleans up all extension resources
   */
  dispose() {
    // Dispose all document states
    for (const state of this.documents.values()) {
      state.dispose();
    }
    this.documents.clear();

    // Clear and dispose diagnostics
    if (this.diagnosticCollection) {
      this.diagnosticCollection.clear();
      this.diagnosticCollection.dispose();
      this.diagnosticCollection = null;
    }

    // Clear preview manager references
    this.previewManager = null;
  }
}

module.exports = ExtensionState;
