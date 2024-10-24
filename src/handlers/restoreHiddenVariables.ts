import * as vscode from "vscode";
import { setDecorationType } from "../global";
import { getTextKey, getDecorationRange } from "../utils/textUtils";

export async function restoreHiddenVariables(
    context: vscode.ExtensionContext,
    document: vscode.TextDocument
) {
    const secretStorage = context.secrets;
    const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document === document
    );

    if (editor) {
        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const line = document.lineAt(lineNum);
            const lineText = line.text.trim();
            const equalSignIndex = lineText.indexOf("=");

            if (equalSignIndex === -1) {
                continue;
            }

            const variableName = lineText.substring(0, equalSignIndex).trim();
            const textKey = getTextKey(
                document,
                variableName,
                lineNum,
                line.firstNonWhitespaceCharacterIndex
            );

            const hiddenVariable = await secretStorage.get(textKey);
            if (hiddenVariable) {
                const decoration = { range: getDecorationRange(line, equalSignIndex) };

                const decorationType = vscode.window.createTextEditorDecorationType({
                    textDecoration: "none; filter: blur(5px);",
                });
                setDecorationType(textKey, decorationType);
                editor.setDecorations(decorationType, [decoration]);
            }
        }
    }
}