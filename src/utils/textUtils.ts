import * as vscode from "vscode";

export function getTextKey(
  document: vscode.TextDocument,
  variableName: string,
  lineNumber: number,
  columnNumber: number
): string {
  return `${document.fileName}_${variableName}_${lineNumber}_${columnNumber}`;
}

export function getDecorationRange(
  line: vscode.TextLine,
  equalSignIndex: number
): vscode.Range {
  const startPosition = new vscode.Position(
    line.lineNumber,
    line.firstNonWhitespaceCharacterIndex + equalSignIndex + 1
  );
  const endPosition = new vscode.Position(
    line.lineNumber,
    line.range.end.character
  );
  return new vscode.Range(startPosition, endPosition);
}
