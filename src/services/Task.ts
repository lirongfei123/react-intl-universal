import config from "../config";
import * as vscode from 'vscode';
const fs = require('fs');
export default class {
    async getConfig() {
        if (!this.curConfig) {
            this.curConfig = await config.getConfig();
        }
        return this.curConfig;
    }
    async getLocalDir() {
        const configObj: any = await this.getConfig();
        if (!configObj.localDir) {
            vscode.window.showErrorMessage(`请提供localDir`);
            throw(new Error('需要提供localDir'));
        }
        return configObj.localDir;
    }
    async isError() {
        
    }
    async isWarn() {

    }
    async isCheck() {

    }
    async getLang() {
        const configObj = await this.getConfig();
        const localDir = await this.getLocalDir();
        if (!fs.existsSync(localDir)) {
            vscode.window.showWarningMessage('找不到locales目录, 请至少选择src下面一个文件并打开');
            throw(new Error('找不到locales目录, 请至少选择src下面一个文件并打开'))
        }
        try {
            Object.keys(configObj.langTitle);
            const langMap: any = {}
            Object.keys(configObj.langTitle).forEach(key => {
                langMap[key] = JSON.parse(fs.readFileSync(`${localDir}/${key}.json`).toString())
            });
            return langMap;
        } catch (e) {
            console.log(e);
            vscode.window.showWarningMessage(e);
        }
    }
    curConfig: any = null;
} 