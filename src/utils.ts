import {extensions, window} from 'vscode';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import config from './config';

class Utils {
    globalFileInfo: any = {};
    lastActiveTextEditor: any = null;
    outputChannel = vscode.window.createOutputChannel('dataworks-intl');
    appendOutputLine(str: string) {
        console.log('eqwqw');
        this.outputChannel.appendLine(str);
    }
    clearOutput() {
        this.outputChannel.clear();
    }
    showOutput() {
        this.outputChannel.show(true);
    }
    updateLocals(params: any) {
        const fileName: any = {
            cn: 'zh_CN.json',
            en: 'en_US.json',
            tw: 'zh_TW.json',
        }
        return config.localDir().then((localdir: any) => {
            return this.getLang().then((data: any) => {
                Object.keys(params).forEach((locKey) => {
                    const originData = data[locKey];
                    params[locKey].forEach((item: any) => {
                        originData[item.key] = item.text;
                    });
                    fs.writeFileSync(`${localdir}/${fileName[locKey]}`,
                        JSON.stringify(originData, null, 4));
                });
            });
        })
    }
    get intlConfigFile() {
        const activeTextEditor = window.activeTextEditor;
        if (!activeTextEditor) return;
        console.log(activeTextEditor.document);
        return '';
    }
    getCurrentFilePath() {
        return this.getActiveEditor().then((activeTextEditor: any) => {
            return activeTextEditor.document.fileName;
        });
    }
    get getProjectSrc() {
        const activeTextEditor = this.getActiveEditor;
        return `${this.intlConfigFile}/src`;
        return '';
    }
    getActiveEditor(): any {
        return new Promise((resolve, reject) => {
            const activeTextEditor = window.activeTextEditor as any;
            if (activeTextEditor) {
                this.lastActiveTextEditor = activeTextEditor;
                resolve(activeTextEditor);
            } else if (this.lastActiveTextEditor) {
                resolve(this.lastActiveTextEditor);
            } else {
                window.showInformationMessage('请选择一个文件');
                reject();
            }
        })
    }
    getCurrentFileDir() {
        return this.getActiveEditor().then((activeTextEditor: any) => {
            return path.dirname(activeTextEditor.document.fileName);
        });
    }
    getLang() {
        return new Promise((resolve, rejects) => {
            config.localDir().then((localDir: String) => {
                if (!localDir) {
                    window.showInformationMessage('找不到locales目录, 请至少选择src下面一个文件并打开');
                    rejects();
                    return;
                }
                try {
                    const langMap = {
                        cn: JSON.parse(fs.readFileSync(`${localDir}/zh_CN.json`).toString()),
                        en: JSON.parse(fs.readFileSync(`${localDir}/en_US.json`).toString()),
                        tw: JSON.parse(fs.readFileSync(`${localDir}/zh_TW.json`).toString())
                    }
                    resolve(langMap);
                } catch (e) {
                    console.log(e);
                    rejects();
                }
            });
        });
    }
}
export default new Utils();