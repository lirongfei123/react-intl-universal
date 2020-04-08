import {extensions, window} from 'vscode';
import * as vscode from 'vscode';
import utils from './utils';
import * as fs from 'fs';
import defaultConfig from './defaultConfig';
const path = require('path');
class Config {
    publisher = 'rongpingli';
    name = 'dataworks-intl';
    vsConfigFile = vscode.workspace.getConfiguration(this.name);
    lastConfig: any = {};
    async getConfig() {
        var localConfigFileName = this.vsConfigFile.get('localConfigFileName');
        const configFile = await utils.getCurrentFileDir().then((src: any) => {
            // 递归
            const findConfigFile = (fileDir: any): any => {
                if (path.isAbsolute(fileDir)) {
                    fileDir = path.resolve(__dirname, fileDir);
                }
                if (fileDir == '/') {
                    return null;
                } else if (
                    !fs.existsSync(`${fileDir}/${localConfigFileName}`)
                ) {
                    return findConfigFile(
                        path.dirname(fileDir)
                        // fileDir.substr(0, fileDir.lastIndexOf('/'))
                    );
                } else {
                    return `${fileDir}/${localConfigFileName}`;
                }
            }
            return findConfigFile(src);
        });
        var configFileObj: any = {};
        console.log(configFile);
        if (configFile) {
            configFileObj = require(configFile);
            delete require.cache[configFile];
            this.lastConfig = {
                ...defaultConfig,
                ...configFileObj
            };
            return this.lastConfig;
        } else {
            vscode.window.showErrorMessage(`请提供${localConfigFileName}配置文件`);
            throw(new Error('需要提供配置文件'));
        }
    }
    get extensionId() {
        return `${this.publisher}.${this.name}`;
    }
    get extension() {
        return extensions.getExtension(this.extensionId) as any;
    }
    // async getLocalDirFromCurrentFile() {
    //     return await utils.getCurrentFileDir().then((src: any) => {
    //         // 递归
    //         const findLocale = (filePath: any): any => {
    //             if (
    //                 !fs.existsSync(`${filePath}/locales`)
    //                 && filePath != ''
    //             ) {
    //                 return findLocale(filePath.substr(0, filePath.lastIndexOf('/')));
    //             } else if (filePath == '') {
    //                 return null;
    //             } else {
    //                 return `${filePath}/locales`;
    //             }
    //         }
    //         return findLocale(src);
    //     });
    // }
    async localDir() {
        const configObj: any = await this.getConfig();
        if (!configObj.localDir) {
            vscode.window.showErrorMessage(`请提供localDir`);
            throw(new Error('需要提供localDir'));
        }
        return configObj.localDir;
    }
}
export default new Config();