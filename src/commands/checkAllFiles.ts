import { ExtensionContext, commands, window, ViewColumn } from "vscode";
import Commands from '../constants/commands';
import * as fs from 'fs';
import * as path from 'path';
import utils from "../utils";
import config from "../config";
import CheckFile from '../services/checkFiles'
import NodeConstants from "../constants/node";
class CheckFiles {
    ctx: any;
    panel: any;
    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
    }
    init() {
        this.ctx.subscriptions.push(commands.registerCommand(Commands.CHECK_ALL_FILES, () => {
            // 获取当前文件路径, 然后根据路径获取配置文件
            utils.getCurrentFilePath().then((currentDir: any) => {
                window.showInputBox({
                    prompt: '请输入要check的文件夹路径',
                    value: currentDir,
                    valueSelection: [currentDir.lastIndexOf('/'), currentDir.length]
                }).then((dir: any) => {
                    utils.getLang().then(data => {
                        const checkFileService = new CheckFile({
                            langMap: data
                        });
                        const consoleErrors = (ferrors: any) => {
                            utils.clearOutput();
                            if (ferrors.length > 0) {
                                ferrors.forEach((item: any) => {
                                    const filePath = item.filePath;
                                    if (item.type === NodeConstants.HAS_KEY) {
                                        const consolePath = `${filePath}:${item.data.startNode.line}:${item.data.startNode.column}`;
                                        checkFileService.consolePath(consolePath, item.trans);
                                    } else if (item.type === NodeConstants.NO_KEY) {
                                        checkFileService.consolePath(`${filePath}:${item.data.startNode.line}:${item.data.startNode.column}`, {
                                            cn: false,
                                        });
                                    }
                                });
                            } else {
                                utils.appendOutputLine('此文件正常, 没有国际化问题');
                            }
                            utils.showOutput();
                        }
                        if (fs.statSync(dir).isFile()) {
                            checkFileService.checkFile(dir).then(consoleErrors)
                        } else {
                            checkFileService.getFiles(dir).then(consoleErrors)
                        }
                    }, () => {
                    });
                });
            });
            
        }));
    }
    
}
export const createCheckFiles = (ctx: ExtensionContext) => {
    return new CheckFiles(ctx).init();
}