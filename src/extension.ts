'use strict';
import * as vscode from 'vscode';
import * as documentsAPI from 'node-documents-scripting';
import * as path from 'path';
import * as fs from 'fs';
import TestResultViewer from "./testResultViewer";

async function executeScript(loginData: documentsAPI.LoginData, file: vscode.Uri): Promise<string> {
    let testName = path.basename(file.fsPath, ".js");
    vscode.window.setStatusBarMessage("Execute test " + testName);

    let executionResult = await documentsAPI.sdsSession(loginData, [testName], documentsAPI.runScript);
    let output = executionResult.filter(result => {
        return result.startsWith("Return-Value");
    });

    if (output.length < 0) {
        throw new Error("Something went wrong...");
    }

    return output[0];
}

async function executeTests(loginData: documentsAPI.LoginData, files: vscode.Uri[]): Promise<string> {
    let testResults = "";

    // Kein forEach verwenden, da await sonst nicht funktioniert!    
    for (let file of files) {
        let output = await executeScript(loginData, file);
        testResults += output.substr(13);
    }

    // Es sind nun eventuell mehrere Tags "<TestLog>" und "</TestLog>" enthalten, diese umschließen aber die Testergebnisse
    testResults = testResults.split("<TestLog>").join("");
    testResults = testResults.split("</TestLog>").join("");

    return "<TestLog>" + testResults + "</TestLog>";
}

export function activate(context: vscode.ExtensionContext) {

    /**
     * Kommando zum Ausführen der Tests
     */
    context.subscriptions.push(vscode.commands.registerCommand("extension.runTests", async () => {
        // Login-Daten für das Documents-Plugin erzeugen
        let launchConfigurationPath = path.normalize(vscode.workspace.rootPath + "/.vscode/launch.json");
        let loginData = new documentsAPI.LoginData(launchConfigurationPath);
        
        // Imports (Testframework, Sourcen...)
        vscode.window.setStatusBarMessage("Searching testframwork...");
        let frameworkFiles = await vscode.workspace.findFiles("bower_components/otrTest/src/jscript/**/*.js", "**/node_modules/**");
        vscode.window.setStatusBarMessage("Import " + frameworkFiles.length + " files...");
        await frameworkFiles.forEach(async (file) => {
            let fileContent = fs.readFileSync(file.fsPath).toString();
            await documentsAPI.sdsSession(loginData, [path.parse(file.fsPath).name, fileContent], documentsAPI.uploadScript);
        });

        // Sourcen importieren
        vscode.window.setStatusBarMessage("Searching for the source files of the project...");
        let sourceFiles = await vscode.workspace.findFiles("src/jscript/**/*.js", "**/node_modules/**");
        vscode.window.setStatusBarMessage("Import " + sourceFiles.length + " files...");
        await sourceFiles.forEach(async file => {
            let fileContent = fs.readFileSync(file.fsPath).toString();
            await documentsAPI.sdsSession(loginData, [path.parse(file.fsPath).name, fileContent], documentsAPI.uploadScript);
        });

        // Testskripte ausführen
        vscode.window.setStatusBarMessage("Searching for test scripts...");
        let testScripts = await vscode.workspace.findFiles("src/test/**/*.js", "**/node_modules/**");
        let testResults = executeTests(loginData, testScripts).then(testResults => {
            // Buildverzeichnis erstellen (wenn nicht existiert)
            let buildDir = vscode.workspace.rootPath + "/build";

            try {
                fs.mkdirSync(buildDir);
            } catch (error) {
                if (error.code !== "EEXIST") { // Existiert schon
                    throw error;
                }
            }

            // Eine XML-Datei aus der Ausgabe erzeugen und im Buildverzeichnis ablegen
            let testResultsFilePath = buildDir + "/testResults.xml";
            fs.writeFile(testResultsFilePath, testResults, (err) => {
                if (err) {
                    throw err;
                }

                // Testergebnisse anzeigen
                vscode.window.setStatusBarMessage("Render test results...", 5000);
                TestResultViewer.FromFile(vscode.Uri.file(testResultsFilePath)).displayTestResults();
            });
        });
        
        //     // ---------------- NUR WÄHREND DER ENTWICKLUNG -----------------
        // let testResults = '<otrTest><TestLog><TestSuite name="otrUnitTestContainer"><TestCase name="otrUpgrade.createFileType"><TestingTime>257000</TestingTime></TestCase><TestCase name="otrUpgrade.createFileType.NoData"><TestingTime>6000</TestingTime></TestCase><TestCase name="otrUpgrade.createFileType.InvalidTitle"><TestingTime>21000</TestingTime></TestCase><TestCase name="otrUpgrade.createFileType.FileTypeTwice"><TestingTime>281000</TestingTime></TestCase><TestCase name="otrUpgrade.attachAccessProfileToFileType"><TestingTime>353000</TestingTime></TestCase><TestCase name="otrUpgrade.attachAccessProfileToFileType.NoDataORWrongData"><TestingTime>423000</TestingTime></TestCase><TestCase name="otrUpgrade.attachUserAccessToFileType"><TestingTime>774000</TestingTime></TestCase><TestCase name="otrUpgrade.attachUserAccessToFileType.NoDataORWrongData"><TestingTime>400000</TestingTime></TestCase><TestCase name="otrUpgrade.attachMailTemplateToFileType"><TestingTime>357000</TestingTime></TestCase><TestCase name="otrUpgrade.attachMailTemplateToFileType.NoDataORWrongData"><TestingTime>1000</TestingTime></TestCase><TestCase name="otrUpgrade.attachHitListToFiletype"><TestingTime>450000</TestingTime></TestCase><TestCase name="otrUpgrade.attachHitListToFiletype.NoDataORWrongData"><TestingTime>2000</TestingTime></TestCase><TestCase name="otrUpgrade.setFileClassProtection"><TestingTime>324000</TestingTime></TestCase><TestCase name="otrUpgrade.isFileTypeReleased"><TestingTime>519000</TestingTime></TestCase><TestCase name="otrUpgrade.isFileTypeAvailable"><TestingTime>269000</TestingTime></TestCase><TestCase name="otrUpgrade.deleteProtectedFileFieldOnFileType"><TestingTime>312000</TestingTime></TestCase></TestSuite><TestSuite name="otrUnitTestContainer"><TestCase name="otrUpgrade.createFileType"><TestingTime>257000</TestingTime></TestCase><TestCase name="otrUpgrade.createFileType.NoData"><TestingTime>6000</TestingTime></TestCase><TestCase name="otrUpgrade.createFileType.InvalidTitle"><TestingTime>21000</TestingTime></TestCase><TestCase name="otrUpgrade.createFileType.FileTypeTwice"><TestingTime>281000</TestingTime></TestCase><TestCase name="otrUpgrade.attachAccessProfileToFileType"><TestingTime>353000</TestingTime></TestCase><TestCase name="otrUpgrade.attachAccessProfileToFileType.NoDataORWrongData"><TestingTime>423000</TestingTime></TestCase><TestCase name="otrUpgrade.attachUserAccessToFileType"><TestingTime>774000</TestingTime></TestCase><TestCase name="otrUpgrade.attachUserAccessToFileType.NoDataORWrongData"><TestingTime>400000</TestingTime></TestCase><TestCase name="otrUpgrade.attachMailTemplateToFileType"><TestingTime>357000</TestingTime></TestCase><TestCase name="otrUpgrade.attachMailTemplateToFileType.NoDataORWrongData"><TestingTime>1000</TestingTime></TestCase><TestCase name="otrUpgrade.attachHitListToFiletype"><TestingTime>450000</TestingTime></TestCase><TestCase name="otrUpgrade.attachHitListToFiletype.NoDataORWrongData"><TestingTime>2000</TestingTime></TestCase><TestCase name="otrUpgrade.setFileClassProtection"><TestingTime>324000</TestingTime></TestCase><TestCase name="otrUpgrade.isFileTypeReleased"><TestingTime>519000</TestingTime></TestCase><TestCase name="otrUpgrade.isFileTypeAvailable"><TestingTime>269000</TestingTime></TestCase><TestCase name="otrUpgrade.deleteProtectedFileFieldOnFileType"><TestingTime>312000</TestingTime></TestCase></TestSuite><TestSuite name="otrUnitTestContainer"><TestCase name="otrRiskAssessmentAPI.questionnaires.getQuestionnaireById"><Error file="test.otrUnitTestOutput.js" line="134"><![CDATA[otrRiskAssessmentAPI::questionnaires::createQuestionnaire: Assertion failed! Variable fields.otrConnectedContractType is not defined!]]></Error><TestingTime>0</TestingTime></TestCase><TestCase name="dummyTest"><TestingTime>312000</TestingTime></TestCase></TestSuite></TestLog></otrTest>';
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}