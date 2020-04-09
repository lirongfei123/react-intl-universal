import { ExtensionContext, commands, window, ViewColumn } from "vscode";
import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import Config from '../config';
var CRC32 = require('crc-32'); 
import EventConstants from "../constants/events";
import utils from "../utils";
import CommandConstants from "../constants/commands";
import config from "../config";
const http = require('request-promise');
class TransView {
    ctx: any;
    panel: any;
    lastParams: any;
    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
    }
    init() {
        this.ctx.subscriptions.push(commands.registerCommand(CommandConstants.OPEN_WEBVIEW, (params) => {
            this.lastParams = params;
            this.createPanel(params);
        }));
    }
    createPanel(params: any) {
        console.log(params);
        if (!this.panel) {
            this.panel = window.createWebviewPanel(
                'transView',
                '上传美杜莎',
                ViewColumn.Beside,
                {
                    enableCommandUris: true,
                    enableScripts: true
                }
            );
            const {webview} = this.panel;
            webview.html = fs.readFileSync(
                path.join(Config.extension.extensionPath, 'src/html/trans.html'),
                'utf-8'
            );
            this.panel.onDidChangeViewState((webview: any) => {
                if (webview.webviewPanel.active) {
                    // this.panel.webview.postMessage({
                    //     type: EventConstants.ADD_TO_MEIDUSHA,
                    //     data: params
                    // });
                }
            });
            this.panel.onDidDispose((webview: any) => {
                this.panel = null;
            });
            webview.onDidReceiveMessage(this.onMessage.bind(this));
        } else {
            this.panel.webview.postMessage({
                type: EventConstants.ADD_TO_MEIDUSHA,
                data: params
            });
        }
    }
    postmessage(params: any) {
        this.panel.webview.postMessage(params);
    }
    webviewReplace(params: any) {
        var text = '';
        if (params.type === 'replaceKey') {
            text = `'${params.key}'`;
        } else if (params.type === 'replaceWhole' && !params.hasKuo) {
            text = `intl.get('${params.key}').d('${params.text}')`;
        } else if (params.type === 'replaceWhole' && params.hasKuo) {
            text = `{intl.get('${params.key}').d('${params.text}')}`;
        }
        vscode.commands.executeCommand(CommandConstants.AUTO_FILL_TEXT, {
            range: params.range,
            text: text
        });
    }
    onMessage({type, data}: any) {
        switch(type) {
            case EventConstants.REQUEST_READY_INITDATA: {
                this.postmessage({
                    type: EventConstants.ADD_TO_MEIDUSHA,
                    data: this.lastParams
                });
                break;
            }
            case EventConstants.AUTO_CREATE_KEY: {
                var hashKey = CRC32.str(data.text);
                return utils.getLang().then((data: any) => {
                    if (data.cn[hashKey]) {
                        hashKey = CRC32.str(data.text + '' + new Date().getTime().toString());
                    }
                    this.postmessage({
                        type: EventConstants.AUTO_TRANS_KEY,
                        data: hashKey
                    });
                });
                break;
            }
            case EventConstants.UPDATE_EDITOR_TEXT: {
                this.webviewReplace(data);
                break;
            }
            case EventConstants.SUBMIT_TO_MEIDUSHA: {
                config.getConfig().then((configObj: any) => {
                    if (!configObj.intlProjectName) {
                        vscode.window.showErrorMessage('需要提供美杜莎项目名称: intlProjectName');
                        return;
                    }
                    http({
                        method: 'POST',
                        uri: 'http://mcms.alibaba-inc.com/api/batchInsertOrUpdate',
                        form: {
                            userId: "960582",
                            fromAppName: 'onebox',
                            writeDTOs: JSON.stringify(
                                [
                                    {
                                        "appName": configObj.intlProjectName,
                                        "key": data.key,
                                        "tagDTOList":[{"tagName":"tnpm"}],
                                        "i18n":{
                                            "zh_CN": data.text
                                        }
                                    }
                                ]
                            )
                        },
                        json: true,
                    }).then((body: any) => {
                        if (body.resultCode && body.resultCode.message === 'success') {
                            vscode.window.showInformationMessage(`美杜莎${configObj.intlProjectName}提交${data.key}成功`);
                            utils.updateLocals({
                                cn: [
                                    {
                                        key: data.key,
                                        text: data.text
                                    }
                                ]
                            }).then(() => {
                                if (data.isUpdate) {
                                    this.webviewReplace(data);
                                }
                            });
                        }
                    })
                });
                
                break;
            }
        }
        
    }
}
export const createWebView = (ctx: ExtensionContext) => {
    return new TransView(ctx).init();
}