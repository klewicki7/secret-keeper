import * as vscode from "vscode";
import { getDecorationTypes, setDecorationType, deleteDecorationType } from "../global";
import { getTextKey, getDecorationRange } from "../utils/textUtils";

export async function toggleVariableDecoration(
  editor: vscode.TextEditor,
  context: vscode.ExtensionContext,
  textKey: string,
  lineText: string,
  decoration: vscode.DecorationOptions
) {
  const secretStorage = context.secrets;
  const hiddenVariable = await secretStorage.get(textKey);

  if (!hiddenVariable) {
    await secretStorage.store(
      textKey,
      JSON.stringify({ value: lineText, hidden: true })
    );
    const decorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: "none; filter: blur(5px);",
    });
    setDecorationType(textKey, decorationType);
    editor.setDecorations(decorationType, [decoration]);
  } else {
    await secretStorage.delete(textKey);
    deleteDecorationType(textKey);
  }
}