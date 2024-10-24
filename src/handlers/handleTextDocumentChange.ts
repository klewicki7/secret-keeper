import * as vscode from "vscode";
import { getDecorationTypes, setDecorationType, deleteDecorationType } from "../global";
import { getTextKey, getDecorationRange } from "../utils/textUtils";

export async function handleTextDocumentChange(
  event: vscode.TextDocumentChangeEvent,
  context: vscode.ExtensionContext
) {
  const editor = vscode.window.activeTextEditor;
  if (editor && event.document === editor.document) {
    const secretStorage = context.secrets;

    for (const change of event.contentChanges) {
      const line = editor.document.lineAt(change.range.start.line);
      const lineText = line.text.trim();
      const equalSignIndex = lineText.indexOf("=");

      if (equalSignIndex === -1) {
        continue;
      }

      const variableName = lineText.substring(0, equalSignIndex).trim();
      const textKey = getTextKey(
        editor.document,
        variableName,
        change.range.start.line,
        line.firstNonWhitespaceCharacterIndex
      );

      const hiddenVariable = await secretStorage.get(textKey);
      if (hiddenVariable) {
        const decoration = { range: getDecorationRange(line, equalSignIndex) };
        deleteDecorationType(textKey);
        const newDecorationType = vscode.window.createTextEditorDecorationType({
          textDecoration: "none; filter: blur(5px);",
        });
        setDecorationType(textKey, newDecorationType);
        editor.setDecorations(newDecorationType, [decoration]);
      }
    }
  }
}