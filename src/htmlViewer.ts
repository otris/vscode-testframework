"use strict";
import * as vscode from "vscode";
import TestResultViewer from "./testResultViewer";

export default class HtmlViewer {

    private htmlCode: string;

    /**
     * Erzeugt einen HtmlViewer zum Rendern von HTML-Inhalten
     * @param htmlCode {string} - Anzuzeigender HTML-Inhalt
     * @param addBasicHtmlWrapper [boolean=false] - Fügt den Standard-HTML-Wrapper hinzu
     */
    constructor(htmlCode: string, addBasicHtmlWrapper: boolean = false) {
        if (addBasicHtmlWrapper) {
            htmlCode = `\
                <html>\
                    <head>\
                        <title>Pagetitle</title>\
                    </head>\
                    <body>\
                        ${htmlCode}
                    </body>\
                </html>`;
        }

        this.htmlCode = htmlCode;
    }

    /**
     * Erzeugt einen HTML-Viewer aus einer Datei.
     * @param uri {vscode.Uri} - Pfad zur Datei, die eingelesen werden soll.
     */
    public static FromFile(uri: vscode.Uri): HtmlViewer {
        let fs = require("fs");

        if (fs.existsSync(uri.path)) {
            return new HtmlViewer(fs.readFileSync(uri.path));
        } else {
            throw new Error("Unable to create HtmlViewer: The path doesn't exists: " + uri.path);
        }
    }

    /**
     * Rendert den HTML-Inhalt
     */
    public viewHtml() {
        // Datei schreiben
        let filePath = this.writeHtmlFile();

        // Datei in VSCode anzeigen (fullscreen)
        vscode.commands.executeCommand("vscode.previewHtml", vscode.Uri.file(filePath), vscode.ViewColumn.One);
    }

    /**
     * Schreibt den HTML-Code in eine Datei im Buildverzeichnis.
     */
    private writeHtmlFile(): string {
        // Datei schreiben
        let fs = require("fs");
        let filePath = vscode.workspace.rootPath + "/build/htmlViewer.html";

        fs.writeFileSync(filePath, this.htmlCode);
        return filePath;
    }
}
