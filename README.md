# xml2rfc Preview

Preview RFC XML files as HTML and see xml2rfc warnings and errors directly in VS
Code.

## What it does

- **Shows xml2rfc warnings and errors** in the Problems panel as you type
- **Generates HTML previews** of RFC XML documents
- **Updates automatically** as you edit the XML content

## Requirements

- Install [xml2rfc](https://pypi.org/project/xml2rfc/): `pip install xml2rfc`
- VS Code 1.75.0 or later

**Recommended**: Install a generic XML extension like
[XML by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)
for general XML validation and formatting. This extension only shows
xml2rfc-specific errors.

## Usage

1. Open an RFC XML file in VS Code
2. xml2rfc warnings and errors appear automatically in the Problems panel
3. Click the preview button in the editor title bar
4. HTML preview opens in a side panel

## Troubleshooting

- **xml2rfc not found**: Make sure xml2rfc is installed and in your PATH
- **No preview appears**: Only works with valid RFC XML files (must have `<rfc>`
  root element)
- **XML errors**: Check the Problems panel for detailed error locations

## License

MIT
