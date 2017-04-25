"use strict";
import * as path from "path";
import * as vscode from "vscode";

export class Constants {

    /**
     * Time in milliseconds, when the status bar text should disappear
     */
    public static DEFAULT_STATUSBAR_DELAY: number = 5000;

    /**
     * Path to the launch configuration file
     */
    public static LaunchConfigurationPath = path.normalize(vscode.workspace.rootPath + "/.vscode/launch.json");
}
