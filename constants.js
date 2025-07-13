/**
 * Constants used throughout the xml2rfc extension
 */

const PROCESSING = {
  TIMEOUT_MS: 30000,
  MAX_BUFFER_BYTES: 1024 * 1024,
  TEMP_FILE_PREFIX: "xml2rfc",
  DEBOUNCE_DELAY_MS: 250,
};

const ERRORS = {
  FILE_WRITE: "Failed to write temporary XML file",
  FILE_READ: "Failed to read generated HTML file",
  INVALID_OUTPUT: "xml2rfc did not generate valid HTML output",
  COMMAND_NOT_FOUND:
    "xml2rfc command not found. Please install xml2rfc: pip install xml2rfc",
  TIMEOUT: "xml2rfc process timed out",
  INVALID_DOCUMENT: "No active editor found. Please open an XML file first.",
  WRONG_LANGUAGE:
    "This command only works with XML files. Please open an XML file.",
};

const UI = {
  PREVIEW_COLUMN: 2, // vscode.ViewColumn.Two
  MAX_LINE_LENGTH: Number.MAX_VALUE,
};

const VALIDATION = {
  RFC_ROOT_ELEMENT: "rfc",
  XML_PARSER_ERROR_TAG: "parsererror",
};

module.exports = {
  PROCESSING,
  ERRORS,
  UI,
  VALIDATION,
};
