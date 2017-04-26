"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {Configuration} from "./configuration/configuration";
import {Constants} from "./constants";
import {DocumentsAPI} from "./documentsAPI";
import TestResultViewer from "./testResultViewer";

/**
 * Executes the passed testsuites
 * @param files - Array with a set of URI's which referes to the local file
 */
async function executeTests(files: vscode.Uri[]): Promise<string> {
    let testResults = "";

    // Don't use a for-each-loop, because the "await"-keyword doesn't work inside
    // Because we execute a large amount of scripts create the login data here instead of
    // create it every time in the execute function
    let loginData = await DocumentsAPI.CreateLoginData();
    for (let file of files) {
        testResults += await DocumentsAPI.ExecuteScript(file, loginData);
    }

    // the final test result output has to be surrounded by "<TestLog>" and "</TestLog>"
    // because we are executing the testsuites one after another, the tags can occur multiple times
    testResults = testResults.replace(/<\/?TestLog>/g, "");

    return `<TestLog>${testResults}</TestLog>`;
}

/**
 * Uploads a folder recursivly
 * @param folderPath - Path to the local folder
 */
async function uploadFolderRec(folderPath: string) {
    let files = [];

    try {
        files = readDir(folderPath);
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new Error(`Unable to upload folder "${folderPath}": The folder doesn't exists.`);
        } else {
            throw new Error(`Unkown error: ${error.message}`);
        }
    }

    // vscode.window.setStatusBarMessage(`Import ${files.length} files...`, Constants.DEFAULT_STATUSBAR_DELAY);
    await DocumentsAPI.UploadAllScripts(files);
}

/**
 * Reads a directory recursivly
 * @param dir - Path to the local folder
 * @param fileList - Array with a set of file paths
 */
function readDir(dir: string, fileList: string[] = []): string[] {
    dir = path.normalize(dir);

    if (!path.isAbsolute(dir)) {
        dir = path.join(vscode.workspace.rootPath, dir);
    }

    let files = fs.readdirSync(dir);
    files.forEach(function(file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            fileList = readDir(path.join(dir, file), fileList);
        } else if (file.endsWith(".js")) {
            fileList.push(path.join(dir, file));
        }
    });

    return fileList;
}

export function activate(context: vscode.ExtensionContext) {

    /**
     * Command for executing the defined tests
     */
    context.subscriptions.push(vscode.commands.registerCommand("extension.runTests", async () => {
        // import testframework
        vscode.window.setStatusBarMessage("Upload testframwork...", Constants.DEFAULT_STATUSBAR_DELAY);
        let testframeworkPath = path.normalize(require.resolve("otrTest") + "/../../jscript");
        vscode.window.setStatusBarMessage(`Upload directory ${testframeworkPath}`, Constants.DEFAULT_STATUSBAR_DELAY);
        await uploadFolderRec(testframeworkPath);

        // import project source files
        vscode.window.setStatusBarMessage("Upload projects source files...", Constants.DEFAULT_STATUSBAR_DELAY);
        vscode.window.setStatusBarMessage(`Upload directory ./src/jscript`, Constants.DEFAULT_STATUSBAR_DELAY);
        await uploadFolderRec("src/jscript");

        // import and execute test scripts
        vscode.window.setStatusBarMessage(`Upload directory ./src/test`, Constants.DEFAULT_STATUSBAR_DELAY);
        await uploadFolderRec("src/test");

        let testScripts = await vscode.workspace.findFiles("src/test/**/*.js", "**/node_modules/**");
        vscode.window.setStatusBarMessage(`Executing ${testScripts.length} test suites...`, Constants.DEFAULT_STATUSBAR_DELAY);
        executeTests(testScripts).then((testResults) => {
            // create build directory (if not exists)
            let buildDir = vscode.workspace.rootPath + "/build";

            try {
                fs.mkdirSync(buildDir);
            } catch (error) {
                if (error.code !== "EEXIST") { // directory already exists
                    throw new Error(`Unknown error: ${error.code}`);
                }
            }

            // write the test execution output inside a xml file in the build directory
            let testResultsFilePath = buildDir + "/testResults.xml";
            fs.writeFile(testResultsFilePath, testResults, (err) => {
                if (err) {
                    throw err;
                }

                // display the test results
                vscode.window.setStatusBarMessage("Render test results...", Constants.DEFAULT_STATUSBAR_DELAY);
                TestResultViewer.FromFile(vscode.Uri.file(testResultsFilePath)).displayTestResults();
            });
        });
    }));
}
