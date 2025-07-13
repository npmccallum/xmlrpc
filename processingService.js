const fs = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const { ERRORS, PROCESSING } = require("./constants");
const cp = require("child_process");
const vscode = require("vscode");

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Diagnostic parsing patterns
const VALIDATION_ERROR_PATTERN = /^(.+?)\((\d+)\): (Warning|Error): (.+)$/;
const XML_ERROR_PATTERN = /^(.+?): Line (\d+): (.+)$/;

/**
 * Handles processing XML documents through the xml2rfc command line tool
 */
class ProcessingService {
  constructor() {
    // No initialization needed
  }

  /**
   * Processes a document through xml2rfc
   * @param {vscode.TextDocument} document - Document to process
   * @param {Function} onDiagnostics - Callback for diagnostics
   * @returns {Promise<Object>} Object containing diagnostics and html
   * @throws {Error} If processing fails
   */
  async processDocument(document, onDiagnostics) {
    // Input validation
    if (!document || typeof document.getText !== "function") {
      throw new Error("Invalid document provided");
    }
    if (typeof onDiagnostics !== "function") {
      throw new Error("Invalid diagnostics callback provided");
    }

    const tempXmlFile = this._getTempFilePath("xml");
    const tempHtmlFile = this._getTempFilePath("html");

    try {
      // Write temp XML file
      await writeFile(tempXmlFile, document.getText(), "utf8");

      // Execute xml2rfc
      const result = await this._executeXml2rfc(tempXmlFile, tempHtmlFile);

      // Process results (both success and error cases)
      onDiagnostics(result.diagnostics);
      return result;
    } catch (error) {
      throw this._normalizeError(error);
    } finally {
      // Cleanup temp files
      await this._cleanupFiles(tempXmlFile, tempHtmlFile);
    }
  }

  /**
   * Executes xml2rfc command
   * @param {string} tempXmlFile - Path to temp XML file
   * @param {string} tempHtmlFile - Path to output HTML file
   * @returns {Promise<Object>} Object containing diagnostics and html
   * @private
   */
  async _executeXml2rfc(tempXmlFile, tempHtmlFile) {
    const cmd = `xml2rfc --no-dtd --no-network --html --out "${tempHtmlFile}" "${tempXmlFile}"`;
    const options = {
      timeout: PROCESSING.TIMEOUT_MS,
      maxBuffer: PROCESSING.MAX_BUFFER_BYTES,
    };

    try {
      const { stderr } = await promisify(cp.exec)(cmd, options);
      const diagnostics = this._parseDiagnostics(stderr);
      const html = await readFile(tempHtmlFile, "utf8");
      return { diagnostics, html, errorDetails: null };
    } catch (err) {
      // Always parse stderr for diagnostics, even when command fails
      const diagnostics = this._parseDiagnostics(err.stderr || "");

      if (err.code === "ENOENT") {
        throw new Error(ERRORS.COMMAND_NOT_FOUND);
      } else if (err.killed) {
        throw new Error(ERRORS.TIMEOUT);
      }

      // For validation errors, return diagnostics with error details
      const errorDetails =
        err.stderr || err.message || "Unknown error occurred";
      return {
        html: null,
        diagnostics,
        errorDetails,
      };
    }
  }

  /**
   * Parses xml2rfc stderr output into VS Code diagnostics
   * @param {string} stderr - The stderr output from xml2rfc
   * @returns {Array} Array of diagnostic objects
   */
  _parseDiagnostics(stderr) {
    if (!stderr) return [];

    const lines = stderr.split("\n");
    const diagnostics = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      let match = line.match(VALIDATION_ERROR_PATTERN);
      if (match) {
        const [, , lineNum, severity, message] = match;
        diagnostics.push({
          line: Math.max(0, parseInt(lineNum) - 1),
          severity:
            severity === "Warning"
              ? vscode.DiagnosticSeverity.Warning
              : vscode.DiagnosticSeverity.Error,
          message: message.trim(),
        });
        continue;
      }

      match = line.match(XML_ERROR_PATTERN);
      if (match) {
        const [, , lineNum, message] = match;
        diagnostics.push({
          line: Math.max(0, parseInt(lineNum) - 1),
          severity: vscode.DiagnosticSeverity.Error,
          message: message.trim(),
        });
      }
    }

    return diagnostics;
  }

  /**
   * Gets path for a temporary file
   * @param {string} ext - File extension
   * @returns {string} Temporary file path
   * @private
   */
  _getTempFilePath(ext) {
    return `${os.tmpdir()}/${PROCESSING.TEMP_FILE_PREFIX}-${Date.now()}.${ext}`;
  }

  /**
   * Cleans up temporary files
   * @param {...string} files - Files to delete
   * @returns {Promise} Completion promise
   * @private
   */
  async _cleanupFiles(...files) {
    await Promise.all(files.map((file) => unlink(file).catch(() => {})));
  }

  /**
   * Normalizes errors to Error instances
   * @param {*} error - Error to normalize
   * @returns {Error} Normalized error
   * @private
   */
  _normalizeError(error) {
    if (error instanceof Error) return error;
    return new Error(error.message || ERRORS.INVALID_OUTPUT);
  }
}

module.exports = ProcessingService;
