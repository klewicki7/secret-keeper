import * as vscode from "vscode";

let decorationTypes: { [key: string]: vscode.TextEditorDecorationType } = {};

export function getDecorationTypes() {
    return decorationTypes;
}

export function setDecorationType(key: string, decorationType: vscode.TextEditorDecorationType) {
    decorationTypes[key] = decorationType;
}

export function deleteDecorationType(key: string) {
    if (decorationTypes[key]) {
        decorationTypes[key].dispose();
        delete decorationTypes[key];
    }
}

export function clearDecorationTypes() {
    for (const key in decorationTypes) {
        decorationTypes[key].dispose();
    }
    decorationTypes = {};
}