import * as vscode from "vscode";

interface Variable {
  [key: string]: {
    value: string;
    hidden: boolean;
  };
}

let decorationTypes: { [key: string]: vscode.TextEditorDecorationType } = {};

function getTextKey(
  document: vscode.TextDocument,
  variableName: string,
  lineNumber: number,
  columnNumber: number
): string {
  return `${document.fileName}_${variableName}_${lineNumber}_${columnNumber}`;
}

function getDecorationRange(
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

function toggleVariableDecoration(
  editor: vscode.TextEditor,
  context: vscode.ExtensionContext,
  textKey: string,
  lineText: string,
  decoration: vscode.DecorationOptions
) {
  const hiddenVariables = context.globalState.get<Variable>(
    "hiddenVariables",
    {}
  );

  if (!hiddenVariables[textKey] || !hiddenVariables[textKey].hidden) {
    context.globalState.update("hiddenVariables", {
      ...hiddenVariables,
      [textKey]: { value: lineText, hidden: true },
    });

    const decorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: "none; filter: blur(5px);",
    });
    decorationTypes[textKey] = decorationType;
    editor.setDecorations(decorationType, [decoration]);
  } else {
    context.globalState.update("hiddenVariables", {
      ...hiddenVariables,
      [textKey]: { value: lineText, hidden: false },
    });

    const decorationType = decorationTypes[textKey];
    if (decorationType) {
      decorationType.dispose();
      delete decorationTypes[textKey];
    }
  }
}

function handleTextDocumentChange(
  event: vscode.TextDocumentChangeEvent,
  context: vscode.ExtensionContext
) {
  const editor = vscode.window.activeTextEditor;
  if (editor && event.document === editor.document) {
    const hiddenVariables = context.globalState.get<Variable>(
      "hiddenVariables",
      {}
    );

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

      if (hiddenVariables[textKey] && hiddenVariables[textKey].hidden) {
        const decoration = { range: getDecorationRange(line, equalSignIndex) };
        const decorationType = decorationTypes[textKey];
        if (decorationType) {
          decorationType.dispose();
        }

        const newDecorationType = vscode.window.createTextEditorDecorationType({
          textDecoration: "none; filter: blur(5px);",
        });
        decorationTypes[textKey] = newDecorationType;
        editor.setDecorations(newDecorationType, [decoration]);
      }
    }
  }
}

function restoreHiddenVariables(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument
) {
  const hiddenVariables = context.globalState.get<Variable>(
    "hiddenVariables",
    {}
  );
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

      if (hiddenVariables[textKey] && hiddenVariables[textKey].hidden) {
        const decoration = { range: getDecorationRange(line, equalSignIndex) };

        const decorationType = vscode.window.createTextEditorDecorationType({
          textDecoration: "none; filter: blur(5px);",
        });
        decorationTypes[textKey] = decorationType;
        editor.setDecorations(decorationType, [decoration]);
      }
    }
  }
}

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
    for (const textKey in decorationTypes) {
      if (textKey.startsWith(document.fileName)) {
        decorationTypes[textKey].dispose();
        delete decorationTypes[textKey];
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
  for (const key in decorationTypes) {
    decorationTypes[key].dispose();
  }
  decorationTypes = {};

  // Clear global state
  context.globalState.update("hiddenVariables", {});
}
