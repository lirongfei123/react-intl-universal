import { ExtensionContext, commands, window, HoverProvider, ViewColumn } from "vscode";
import Commands from '../constants/commands';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import utils from "../utils";
import config from "../config";
import { debounce } from 'lodash'
import CheckFile from '../services/checkFiles';
import NodeConstants from "../constants/node";
var CRC32 = require('crc-32'); 
class CodeHover implements HoverProvider {
    checkHasCn(cnText: string) {
        return utils.getLang().then((data: any) => {
            for (var i in data.cn) {
                if (data.cn.hasOwnProperty(i)) {
                    const text = data.cn[i];
                    if (text === cnText) {
                        return i;
                    }
                }
            }
            return false;
        });
    }
    getCommandUrl(commandKey: any, params: any) {
        return `command:${commandKey}?${encodeURIComponent(JSON.stringify(params))}`
    }
    getHoverValue (text: any) {
        const markdown = new vscode.MarkdownString(text);
        markdown.isTrusted = true;
        return new vscode.Hover(markdown)
    }
    getHoverMarkDown(info: any) {
        if (info.type === NodeConstants.NO_KEY) {
            const startNode = info.data.startNode;
            const endNode = info.data.endNode;
            const range = {
                startLine: startNode.line - 1,
                startColumn: startNode.column,
                endLine: endNode.line - 1,
                endColumn: endNode.column
            };
            return this.checkHasCn(info.intlText).then(resultKey => {
                if (resultKey) {
                    
                    return this.getHoverValue(`
- [已经存在Key, 自动填充](${this.getCommandUrl(Commands.AUTO_FILL_TEXT, {
    range: range,
    text: `intl.get('${resultKey}').d('${info.intlText}')`
})})
- [已经存在Key, 自动填充, 加大括号](${this.getCommandUrl(Commands.AUTO_FILL_TEXT, {
    range: range,
    text: `{intl.get('${resultKey}').d('${info.intlText}')}`
})})
                    `);
                } else {
                    return this.getHoverValue(`
- [添加到美杜莎](${this.getCommandUrl(Commands.OPEN_WEBVIEW, {
    range: range,
    text: info.intlText,
    key: CRC32.str(info.intlText),
    type: 'replaceWhole'
})})
                    `);
                }
            });
        } else if (info.type === NodeConstants.HAS_KEY) {
            const trans = info.trans;
            const keyLocNode = info.data.keyLocNode;
            const startNode = keyLocNode.start;
            const endNode = keyLocNode.end;
            const range = {
                startLine: startNode.line - 1,
                startColumn: startNode.column,
                endLine: endNode.line - 1,
                endColumn: endNode.column
            }
            if (!trans.cn && !trans.en && !trans.cn) {
                return this.checkHasCn(info.intlText).then(resultKey => {
                    if (resultKey) {
                        return this.getHoverValue(`
- [已经存在Key, 自动填充](${this.getCommandUrl(Commands.AUTO_FILL_TEXT, {
    range: range,
    text: `'${resultKey}'`
})})
                    `);
                    } else {
                        return this.getHoverValue(`
- [不存在Key, 添加到美杜莎](${this.getCommandUrl(Commands.OPEN_WEBVIEW, {
    range: range,
    text: info.intlText,
    key: info.intlKey,
    type: 'replaceKey'
})})
                        `);
                    }
                });
            } else if (!trans.isSame) {
                const textLocNode = info.data.textLocNode;
                if (textLocNode) {
                    const startNode = textLocNode.start;
                    const endNode = textLocNode.end;
                    const range = {
                        startLine: startNode.line - 1,
                        startColumn: startNode.column,
                        endLine: endNode.line - 1,
                        endColumn: endNode.column
                    }
                    return utils.getLang().then((langData: any) => {
                        return this.getHoverValue(`
- [不一致, 自动更新](${this.getCommandUrl(Commands.AUTO_FILL_TEXT, {
        range: range,
        text: `'${langData.cn[info.intlKey]}'`
})})
                        `);
                    });
                } else {
                    return this.getHoverValue(`
不一致, 无法自动填充, 请手动填充
                    `);
                }
                
            } else {
                return this.getHoverValue(`
- [已经添加到美杜莎, 但是缺少英文, 或者繁体](${this.getCommandUrl(Commands.OPEN_WEBVIEW, {
    range: range,
    text: info.intlText,
    key: CRC32.str(info.intlText),
    type: 'replaceWhole'
})})
                `);
            }
        }
    }
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const info = utils.globalFileInfo[document.fileName];
        if (info) {
            const infoAtPositon = Object.values(info).find((item: any) => {
                const offset = document.offsetAt(position);
                return offset >= item.data.start && offset <= item.data.end;
                // const startNode = item.data.startNode;
                // const endNode = item.data.endNode;
                // if (startNode.line != endNode.line) {
                //     return (
                //         startNode.line <= (position.line + 1)
                //         && endNode.line >= (position.line + 1)
                //     )
                // } else {
                //     return (
                //         startNode.line == (position.line + 1)
                //         && startNode.column <= position.character
                //         && endNode.column >= position.character
                //     )
                // }
            });
            if (infoAtPositon) {
                return this.getHoverMarkDown(infoAtPositon);
            }
        }
        return;
    }
}
export const createCodeHover = (ctx: ExtensionContext) => {
    ctx.subscriptions.push(
        vscode.languages.registerHoverProvider(
            { pattern: '**/*.{ts,js,tsx,jsx}' },
            new CodeHover()
        )
    );
}