"use strict";
import * as fs from "fs";
import * as documentsAPI from "node-documents-scripting";
import * as path from "path";
import * as vscode from "vscode";
import {Configuration} from "./configuration/configuration";
import {Constants} from "./constants";

interface ScriptOutput {
    scriptError: number,
    scriptErrorMessage: string,
    scriptWarnings: string,
    returnType: string,
    returnValue: string
};

export class DocumentsAPI {

    /**
     * Creates a LoginData object required for the authentication with the DOCUMENTS server
     * @returns The created LoginData-object
     */
    public static async CreateLoginData(): Promise<documentsAPI.LoginData> {
        // check if launch configuration exists
        await Configuration.CheckLaunchConfiguration();

        // get the path where the launch.json is stored
        return new documentsAPI.LoginData(Constants.LaunchConfigurationPath);
    }

    /**
     * Executes a script on the server. Ensure that the script exists on the server.
     * @param scriptPath - URI to the script on the local file system
     * @returns the script output
     */
    public static async ExecuteScript(scriptPath: vscode.Uri, loginData: documentsAPI.LoginData = null): Promise<string> {
        let scriptName = path.basename(scriptPath.fsPath, ".js");
        vscode.window.setStatusBarMessage(`Execute script ${scriptName}`, Constants.DEFAULT_STATUSBAR_DELAY);

        // execute script and catch the script output
        if (loginData === null) {
            loginData = await this.CreateLoginData();
        }

        let executionResult = await documentsAPI.sdsSession(loginData, [{name: scriptName}], documentsAPI.runScript);
        let parsedOutput = this.ParseScriptOutput(executionResult[0].output as string);

        if (typeof parsedOutput.scriptError === "undefined" || parsedOutput.scriptError !== 0) {
            throw new Error(`An error occured while executing the script ${scriptPath.fsPath}: \n${parsedOutput.scriptErrorMessage}`);
        }

        return parsedOutput.returnValue;
    }

    /**
     * Uploads a script to the documents server
     * @param scriptPath - URI to the script on the local file system
     */
    public static async UploadScript(scriptPath: string, loginData: documentsAPI.LoginData = null) {
        let scriptName = path.basename(scriptPath, ".js");

        if (loginData === null) {
            loginData = await this.CreateLoginData();
        }

        let fileContent = fs.readFileSync(scriptPath).toString();
        await documentsAPI.sdsSession(loginData, [{name: scriptName, sourceCode: fileContent}], documentsAPI.uploadScript);
    }

    public static async UploadAllScripts(scripts: vscode.Uri[]) {
        if (scripts.length > 0) {
            vscode.window.setStatusBarMessage(`Upload ${scripts.length} script(s)`);

            // the uploadAll-function expect an array of objects with the source code and the name of the scripts
            let loginData = await this.CreateLoginData();

            for (let script of scripts) {
                let scriptPath: string;

                if (script instanceof vscode.Uri) {
                    scriptPath = script.fsPath;
                } else {
                    scriptPath = script as string;
                }

                await this.UploadScript(scriptPath, loginData);
            }

            vscode.window.setStatusBarMessage("");
        }
    }

    private static ParseScriptOutput(output: string): ScriptOutput {
        if (output === "") {
            throw new Error("The structure of script output is invalid: The script output is empty.");
        }

        let indexOf = output.indexOf("Script-Error");
        if (indexOf === -1) {
            throw new Error("The structure of the script output is invalid: Can't find the error tag.");
        } else {
            output = output.substr(indexOf);
        }

        // parse the output string
        let splitted = output.split("\n");

        if (splitted.length !== 5) {
            throw new Error("The structure of the script output is invalid: Expected 5 elements inside the splitted output array, insted got: " + JSON.stringify(splitted));
        }

        let scriptOutput = {
            scriptError: parseInt(splitted[0].replace("Script-Error:", "").trim()),
            scriptErrorMessage: splitted[1].replace("Script-ErrorMsg:", "").trim(),
            scriptWarnings: splitted[2].replace("Script-Warnings:", "").trim(),
            returnType: splitted[3].replace("Return-Type:", "").trim(),
            returnValue: splitted[4].replace("Return-Value:", "").trim()
        };

        // converting values (this is more correct for comparing later...)
        for (let key in scriptOutput) {
            if (scriptOutput.hasOwnProperty(key)) {
                if (scriptOutput[key] === "") {
                    scriptOutput[key] = undefined;
                }
            }
        }

        return scriptOutput;
    }
}
