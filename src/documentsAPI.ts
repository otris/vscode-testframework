"use strict";
import * as fs from "fs";
import * as documentsAPI from "node-documents-scripting";
import * as path from "path";
import * as vscode from "vscode";
import {Configuration} from "./configuration/configuration";
import {Constants} from "./constants";

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
        let executionResult = await documentsAPI.sdsSession(loginData, [scriptName], documentsAPI.runScript);
        let output = executionResult.filter((result) => {
            return result.startsWith("Return-Value");
        });
        if (loginData === null) {
            loginData = await this.CreateLoginData();
        }

        if (output.length < 0) {
            throw new Error(`Unable to get script output after executing script "${scriptName}"`);

        }

        // output[0] = "Return-Value: ..."
        return output[0].substr(13);
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

        }


    }
}
