"use strict";
import * as fs from "fs";
import * as vscode from "vscode";
import {Constants} from "./../constants";

export class Configuration {

    /**
     * These are the required inital configuration from the extension "vscode-documents-scripting"
     */
    private static InitialConfiguration = {
        name: "Launch Script on Server",
        request: "launch",
        type: "janus",
        script: "",
        username: "",
        password: "",
        principal: "",
        host: "localhost",
        applicationPort: 11000,
        debuggerPort: 8089,
        stopOnEntry: false,
        log: {
            fileName: "${workspaceRoot}/vscode-janus-debug-launch.log",
            logLevel: {
                default: "Debug",
            },
        },
    };

    /**
     * These properties are required from the launch configuration
     */
    private static requiredConfigurationProperties = [
        "username",
        "password",
        "principal",
        "host"
    ];

    public static async CheckLaunchConfiguration(): Promise<void> {
        if (!fs.existsSync(Constants.LaunchConfigurationPath)) {
            await this.CreateLaunchConfiguration();
        } else {
            // check if there is a configuration with request type "launch"
            let launchConfiguration = null;

            try {
                let launchConfigurationContent = fs.readFileSync(Constants.LaunchConfigurationPath).toString();

                if (launchConfigurationContent !== "") {
                    launchConfiguration = JSON.parse(launchConfigurationContent);
                } else {
                    launchConfiguration = {};
                }
            } catch (error) {
                throw new Error("Your launch configuration has an invalud structure");
            }

            if (launchConfiguration.hasOwnProperty("configurations")) {
                if (!Array.isArray(launchConfiguration.configurations)) {
                    throw new Error(`Your launch configuration has an invalid structure: Expected property "configurations" to be an array, instead got ${typeof launchConfiguration.configurations}`);
                }

                let validConfigurations = launchConfiguration.configurations.filter((configuration) => {
                    return configuration.request === "launch";
                });

                if (validConfigurations.length < 1) {
                    await this.CreateLaunchConfiguration();
                } else if (validConfigurations.length > 1) {
                    throw new Error(`Found multiple launch configurations in your launch.json`);
                }

                // this is need for later use
                let indexOf = launchConfiguration.configurations.indexOf(validConfigurations[0]);

                // check if the required properties are set
                let allPropertiesSet = this.requiredConfigurationProperties.every((property) => {
                    if (typeof validConfigurations[0][property] !== "string") {
                        return false;
                    } else {
                        return true;
                    }
                });

                if (!allPropertiesSet) {
                    // if one property is invalid, ask for all
                    validConfigurations[0] = await this.CreateLaunchConfiguration(false);
                }

                // Write configuration file
                launchConfiguration.configurations[indexOf] = validConfigurations[0];
                fs.writeFileSync(Constants.LaunchConfigurationPath, JSON.stringify(launchConfiguration, null, "\t"));
            } else {
                await this.CreateLaunchConfiguration();
            }
        }
    }

    public static async CreateLaunchConfiguration(writeConfiguration: boolean = true): Promise<any> {
        let configuration = this.InitialConfiguration;

        // ask for each required property
        for (let property of this.requiredConfigurationProperties) {
            let value = await vscode.window.showInputBox({
                prompt: `Type in the ${property}`,
                password: (property === "password")
            });

            configuration[property] = value;
        }

        if (writeConfiguration) {
            let output = {
                configurations: [
                    configuration
                ]
            };

            fs.writeFileSync(Constants.LaunchConfigurationPath, JSON.stringify(output, null, "\t"));
        }

        return configuration;
    }
}
