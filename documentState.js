const vscode = require("vscode");
const path = require("path");
const { DOMParser } = require("@xmldom/xmldom");
const { VALIDATION, PROCESSING } = require("./constants");

/**
 * Tracks and manages the state of a single XML document being processed by xml2rfc
 * Handles content tracking, XML validation, and UI state for preview panels
 */
class DocumentState {
  /**
   * Creates a new document state tracker
   * @param {vscode.TextDocument} document - The VS Code document to track
   * @param {Function} onProcessingNeeded - Callback when processing should be triggered
   */
  constructor(document, onProcessingNeeded = null) {
    // Identity
    this.uri = document.uri.toString();
    this.fileName = path.basename(document.fileName);

    // Content tracking
    this._lastModified = Date.now();
    this._lastContent = null;

    // Parsed XML state
    this.isValidXml = false;
    this.isRfcXml = false;
    this.parsedDoc = null;

    // Processing state
    this.isProcessing = false;
    this.lastProcessingError = null;
    this.lastDiagnostics = [];
    this.processingTimer = null;

    // UI state
    this.previewPanel = null;
    this.cachedHtml = null;

    // Callback for triggering processing
    this._onProcessingNeeded = onProcessingNeeded;

    // Initialize from document
    this.updateFromDocument(document);
  }

  /**
   * Updates document state when content changes
   * @param {vscode.TextDocument} document - Updated document
   */
  updateFromDocument(document) {
    // Clear any pending processing
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    const currentContent = document.getText();

    // Skip expensive parsing if content hasn't changed
    if (currentContent === this._lastContent) {
      return;
    }

    this._lastContent = currentContent;
    this._lastModified = Date.now();
    this._parseAndComputeState(currentContent);
    this._invalidateCache();

    // Schedule debounced processing
    if (this.needsProcessing() && this._onProcessingNeeded) {
      this.processingTimer = setTimeout(() => {
        this.processingTimer = null;
        this._onProcessingNeeded(document, this);
      }, PROCESSING.DEBOUNCE_DELAY_MS);
    }
  }

  /**
   * Marks document as currently being processed
   */
  startProcessing() {
    this.isProcessing = true;
    this.lastProcessingError = null;
  }

  /**
   * Marks document as finished processing
   * @param {Error|null} error - Processing error if any
   * @param {string|null} html - Generated HTML content if successful
   */
  finishProcessing(error = null, html = null) {
    this.isProcessing = false;
    this.lastProcessingError = error;
    if (html && !error) {
      this.cachedHtml = html;
    }
  }

  /**
   * Sets the preview panel for this document
   * @param {vscode.WebviewPanel} panel - The preview panel
   */
  setPreviewPanel(panel) {
    this.previewPanel = panel;
  }

  /**
   * Updates the preview panel content
   * @param {string} html - HTML content to display
   */
  updatePreviewPanel(html) {
    if (this.previewPanel) {
      this.previewPanel.webview.html = html;
    }
  }

  /**
   * Reveals the preview panel if it exists
   * @returns {boolean} True if panel was revealed, false otherwise
   */
  revealPreviewPanel() {
    if (this.previewPanel) {
      this.previewPanel.reveal(vscode.ViewColumn.Beside);
      return true;
    }
    return false;
  }

  /**
   * Determines if this document should be processed by xml2rfc
   * @returns {boolean} True if valid RFC XML, false otherwise
   */
  shouldProcess() {
    return this.isValidXml && this.isRfcXml;
  }

  /**
   * Determines if this document needs processing
   * @returns {boolean} True if processing is needed, false otherwise
   */
  needsProcessing() {
    return this.shouldProcess() && !this.cachedHtml && !this.isProcessing;
  }

  /**
   * Cleans up resources when document is closed
   */
  dispose() {
    // Clear processing timer
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    if (this.previewPanel) {
      this.previewPanel.dispose();
      this.previewPanel = null;
    }

    // Clear all state to prevent memory leaks
    this._invalidateCache();
    this._lastContent = null;
    this.parsedDoc = null;
    this.lastDiagnostics = [];
    this.lastProcessingError = null;
    this.isProcessing = false;
  }

  /**
   * Parses and computes document state from XML content
   * @param {string} content - The XML content
   * @private
   */
  _parseAndComputeState(content) {
    const validation = this._parseAndValidateXML(content);
    this.isValidXml = validation.isValid;
    this.isRfcXml = validation.isRfc;
    this.parsedDoc = validation.parsedDoc;
  }

  /**
   * Parses and validates XML content
   * @param {string} content - The XML content to validate
   * @returns {Object} Validation result with isValid, isRfc, and parsedDoc
   * @private
   */
  _parseAndValidateXML(content) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/xml");

      const errors = doc.getElementsByTagName(VALIDATION.XML_PARSER_ERROR_TAG);
      if (errors.length > 0) {
        return { isValid: false, isRfc: false, parsedDoc: null };
      }

      const rootElement = doc.documentElement;
      const isRfc =
        rootElement && rootElement.tagName === VALIDATION.RFC_ROOT_ELEMENT;

      return { isValid: true, isRfc: isRfc, parsedDoc: doc };
    } catch (e) {
      return { isValid: false, isRfc: false, parsedDoc: null };
    }
  }

  /**
   * Invalidates cached HTML content
   * @private
   */
  _invalidateCache() {
    this.cachedHtml = null;
  }
}

module.exports = DocumentState;
