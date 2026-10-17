
const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);

  // Prevent spreadsheet formula injection.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  // Escape embedded quotes and wrap fields containing special characters.
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

export const toCsv = (
  headers: string[],
  rows: unknown[][],
): string => {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  // UTF-8 BOM improves compatibility with spreadsheet applications.
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
};
