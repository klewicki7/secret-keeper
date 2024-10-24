import * as vscode from "vscode";
import { toggleVariableDecoration } from "./commands/toggleVariableDecoration";
import { handleTextDocumentChange } from "./handlers/handleTextDocumentChange";
import { restoreHiddenVariables } from "./handlers/restoreHiddenVariables";
import { getTextKey, getDecorationRange } from "./utils/textUtils";
import { clearDecorationTypes, deleteDecorationType, getDecorationTypes } from "./global";

export function activate(context: vscode.ExtensionContext) {
  context.globalState.setKeysForSync(["hiddenVariables"]);

  const toggleVariableCommand = vscode.commands.registerCommand(
    "secret-keeper-vscode.toggleVariable",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const selection = editor.selection;
        const line = document.lineAt(selection.active.line);
        const lineText = line.text.trim();
        const equalSignIndex = lineText.indexOf("=");

        if (equalSignIndex === -1) {
          vscode.window.showInformationMessage(
            "No variable assignment found on this line."
          );
          return;
        }

        const variableName = lineText.substring(0, equalSignIndex).trim();
        const textKey = getTextKey(
          document,
          variableName,
          selection.active.line,
          line.firstNonWhitespaceCharacterIndex
        );
        const decoration = { range: getDecorationRange(line, equalSignIndex) };

        toggleVariableDecoration(
          editor,
          context,
          textKey,
          lineText,
          decoration
        );
      } else {
        vscode.window.showInformationMessage("No active editor found.");
      }
    }
  );

  context.subscriptions.push(toggleVariableCommand);
  vscode.workspace.onDidChangeTextDocument((event) =>
    handleTextDocumentChange(event, context)
  );

  vscode.workspace.onDidOpenTextDocument((document) =>
    restoreHiddenVariables(context, document)
  );

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      restoreHiddenVariables(context, editor.document);
    }
  });

  vscode.workspace.onDidSaveTextDocument((document) =>
    restoreHiddenVariables(context, document)
  );

  vscode.workspace.onDidCloseTextDocument((document) => {
    // Optionally, you can clear decorations for closed documents
    for (const textKey in getDecorationTypes()) {
      if (textKey.startsWith(document.fileName)) {
        deleteDecorationType(textKey);
      }
    }
  });

  // Restore hidden variables for all open documents when the extension is activated
  vscode.workspace.textDocuments.forEach((document) =>
    restoreHiddenVariables(context, document)
  );
}

export function deactivate(context: vscode.ExtensionContext) {
  // Clear all decorations
  clearDecorationTypes();

  // Clear global state
  context.globalState.update("hiddenVariables", {});
}