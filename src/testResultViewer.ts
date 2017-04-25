"use strict";
import * as vscode from "vscode";
import HtmlViewer from "./htmlViewer";

export default class TestResultViewer {

    private testResults: string;

    /**
     * Erzeugt ein Viewer zum Anzeigen der Testergebnisse
     * @param uri {string} - String mit den Testergebnissen im XML-Format.
     */
    constructor(testResults: string) {
        this.testResults = testResults;
    }

    /**
     * Erzeugt ein Viewer zum Anzeigen der Testergebnisse aus einer XML-Datei
     * @param uri {vscode.Uri} - Pfad zur Datei mit den Testergebnissen
     */
    public static FromFile(uri: vscode.Uri): TestResultViewer {
        let fs = require("fs");

        if (!fs.existsSync(uri.fsPath)) {
            throw new Error("Unable to create TestResultViewer: The path doesn't exists: " + uri.path);
        }

        return new TestResultViewer(fs.readFileSync(uri.fsPath));
    }

    /**
     * Zeigt die Testergebnisse an
     */
    public displayTestResults() {
        // Template-Datei zum Darstellen der Testergebnisse laden
        let fs = require("fs");
        let templateFilePath = vscode.extensions.getExtension("otris.vscode-testframework").extensionPath + "/src/html/testResultViewTemplate.html";

        fs.readFile(templateFilePath, (err, data) => {
            if (err) {
                throw err;
            }

            // Platzhalter ersetzen
            let htmlContent = data.toString().replace("%PAGE_TITLE%", "Testergebnisse");

            // Testergebnisse parsen und in Platzhalter ersetzen
            let parseString = require("xml2js").parseString;
            parseString(this.testResults, (error, results) => {
                let testResults = results;

                if (error) {
                    throw new Error("Unable to parse the test results: " + error);
                }

                // Der Parser erzeugt ein seltsames Objekt. Damit es später leichter verwendet werden kann, wird es hier umstrukturiert
                let testsuites = [];

                if (testResults.hasOwnProperty("otrTest")) {
                    testResults = testResults.otrTest;
                }

                if (testResults.hasOwnProperty("TestLog")) {
                    testResults = testResults.TestLog;
                }

                if (testResults.hasOwnProperty("0")) {
                    testResults = testResults["0"];
                }

                if (testResults.hasOwnProperty("TestSuite")) {
                    testResults = testResults.TestSuite;
                }

                if (!Array.isArray(testResults)) {
                    throw new Error("Unable to parse the test results.");
                }

                let parsedTestResults = [];
                testResults.forEach((testsuite) => {
                    if (!testsuite.hasOwnProperty("TestCase") || !(testsuite.hasOwnProperty("$") && testsuite.$.hasOwnProperty("name"))) {
                        throw new Error("Unable to parse the test results");
                    }

                    let testsuiteName = testsuite.$.name;
                    let testcases = testsuite.TestCase;
                    if (!Array.isArray(testcases)) {
                        throw new Error("Unable to parse the test results.");
                    }

                    let parsedTestSuite = {
                        name: testsuiteName,
                        tests: []
                    };

                    testcases.forEach((testcase) => {
                        let testName;
                        let testingTime;
                        let error;

                        if (!testcase.hasOwnProperty("$") || !testcase.$.hasOwnProperty("name")) {
                            throw new Error("Unable to parse the test results");
                        } else {
                            testName = testcase.$.name;
                        }

                        if (testcase.hasOwnProperty("Error")) {
                            error = testcase.Error;

                            if (!testcase.hasOwnProperty("Error")
                                || !testcase.Error.hasOwnProperty("0")
                                || !testcase.Error[0].hasOwnProperty("_")
                                || !testcase.Error[0].hasOwnProperty("$")
                                || !testcase.Error[0].$.hasOwnProperty("file")
                                || !testcase.Error[0].$.hasOwnProperty("line")) {

                                throw new Error("Unable to parse the test results.");
                            }

                            error = {
                                errorMessage: testcase.Error[0]._,
                                file: testcase.Error[0].$.file,
                                line: testcase.Error[0].$.line,
                            };
                        }

                        if (testcase.hasOwnProperty("TestingTime")) {
                            testingTime = testcase.TestingTime;
                        }

                        parsedTestSuite.tests.push({
                            testName,
                            testingTime,
                            error
                        });
                    });

                    parsedTestResults.push(parsedTestSuite);
                });

                // Html-Datei in VSCode anzeigen
                htmlContent = htmlContent.replace("%TEST_RESULTS%", JSON.stringify(parsedTestResults));
                new HtmlViewer(htmlContent).viewHtml();
            });
        });
    }
}
