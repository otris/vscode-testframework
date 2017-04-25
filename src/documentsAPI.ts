"use strict";
import * as documentsAPI from 'node-documents-scripting';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import {Constants} from './constants';
import {Configuration} from "./configuration/configuration";

export class DocumentsAPI {

    /**
     * Creates a LoginData object required for the authentication with the DOCUMENTS server
     * @returns The created LoginData-object
     */
    static async CreateLoginData(): Promise<documentsAPI.LoginData> {
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
    static async ExecuteScript(scriptPath: vscode.Uri): Promise<string> {
        if (!fs.existsSync(scriptPath.fsPath)) {
            throw new Error(`The script "${scriptPath.fsPath}" doesn't exists.`);
        }

        if (!fs.statSync(scriptPath.fsPath).isFile()) {
            throw new Error(`You need to pass a javascript file, not a folder.`);
        }

        let scriptName = path.basename(scriptPath.fsPath, ".js");
        vscode.window.setStatusBarMessage(`Execute script ${scriptName}`, Constants.DEFAULT_STATUSBAR_DELAY);

        // execute script and catch the script output
        let loginData = await this.CreateLoginData();
        let executionResult = await documentsAPI.sdsSession(loginData, [scriptName], documentsAPI.runScript);
        let output = executionResult.filter(result => {
            return result.startsWith("Return-Value");
        });

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
    static async UploadScript(scriptPath: vscode.Uri) {
        if (!fs.existsSync(scriptPath.fsPath)) {
            throw new Error(`The script "${scriptPath.fsPath}" doesn't exists.`);
        }

        if (!fs.statSync(scriptPath.fsPath).isFile()) {
            throw new Error(`You need to pass a javascript file, not a folder.`);
        }

        let scriptName = path.basename(scriptPath.fsPath, ".js");
        vscode.window.setStatusBarMessage(`Upload script ${scriptName}`, Constants.DEFAULT_STATUSBAR_DELAY);

        let fileContent = fs.readFileSync(scriptPath.fsPath).toString();
        let loginData = await this.CreateLoginData();
        await documentsAPI.sdsSession(loginData, [scriptName, fileContent], documentsAPI.uploadScript);
    }
    
}