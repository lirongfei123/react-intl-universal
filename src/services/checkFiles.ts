import utils from "../utils";
import * as vscode from 'vscode';
import NodeConstants from "../constants/node";
const babelCore = require('@babel/core');
var readfiles = require('node-readfiles');
var generate = require('@babel/generator');
const path = require('path');
export default class CheckFile {
    consoleIndex: number = 0;
    task: any = null;
    configObj: any = {};
    constructor({
        task,
    }: any) {
        if (task) {
            this.task = task;
            this.configObj = this.task.getConfig();
        } else {
            throw(new Error('必须传入task'));
        }
    }
    getStatusText(result: any, checkLangs?: any) {
        const configObj = this.task.getConfig();
        var text = configObj.prefixStatusText;
        if (!checkLangs) {
            checkLangs = [...Object.keys(configObj.langKey), NodeConstants.KEY_SAME];
        }
        checkLangs.forEach((item: any) => {
            if (item == NodeConstants.KEY_SAME && !result[NodeConstants.KEY_SAME]) {
                text += ' ' + configObj.notSameText;
            } else {
                if (!result[item] && configObj.langKey[item]) {
                    text += ' ' + configObj.langKey[item];
                }
            }
        });
        return text;
    }
    consolePath(filePath: string, result: any) {
        const text = this.getStatusText(result);
        if (text != null) {
            this.consoleIndex++;
        }
        utils.appendOutputLine(text + ' ' + filePath);
    }
    getNodeValue (node: any) {
        var value = '';
        if (node.type === 'TemplateElement') {
            value = node.value.raw;
        } else {
            value = node.value
        }
        return value.trim()
    }
    checkNode(nodePath: any, errors?: any) {
        const configObj = this.task.getConfig();
        errors = errors || [];
        const nodeValue = this.getNodeValue(nodePath.node);
        if (
            /[\u4e00-\u9fa5]/.test(nodeValue)
        ) {
            const filePath = nodePath.hub.file.opts.filename;
            const intlNode = nodePath.findParent((item: any) => {
                const node = item.node;
                if (
                    node.type ===  "CallExpression"
                    && node.callee.type === "MemberExpression"
                    && configObj.defaultFuncNameReg.test(node.callee.property.name)
                ) {
                    const objNode = node.callee.object;
                    if (
                        objNode.type === "CallExpression"
                        && configObj.getFuncNameReg.test(objNode.callee.property.name)
                        && objNode.callee.object.type === "Identifier"
                        && objNode.callee.object.name === "intl"
                    ) {
                        return true;
                    }
                }
                return false;
            });
            
            if (intlNode) {
                const intlKey = intlNode.node.callee.object.arguments[0].value;
                const key = intlNode.node.callee.object.arguments[0].value;
                const hasKeyNodeValue = generate.default(intlNode.node.arguments[0]).code.slice(1, -1);
                const checkResult = this.task.checkKey(key, hasKeyNodeValue);
                const locNode = intlNode.get('loc').node;
                if (this.task.hasFalse(checkResult)) {
                    if (
                        intlNode.node.start
                        || intlNode.node.end
                        || locNode.start
                        || locNode.end
                    ) {
                        const keyNode = intlNode.node.callee.object.arguments[0];
                        const textNode = intlNode.node.arguments[0];
                        if (!this.task.configObj.customCheckNode(nodePath)) {
                            errors.push({
                                type: NodeConstants.HAS_KEY,
                                filePath,
                                data: {
                                    start: intlNode.node.start,
                                    end: intlNode.node.end,
                                    startNode: locNode.start,
                                    endNode: locNode.end,
                                    keyNode: keyNode,
                                    keyLocNode: keyNode.loc,
                                    textNode: textNode,
                                    textLocNode: textNode && textNode.loc,
                                },
                                nodePath,
                                intlKey,
                                intlText: hasKeyNodeValue,
                                // 这里只考虑.d的第一个参数是字符串, 如果是表达式, 不考虑这种情况, 需要用户特殊处理 
                                trans: checkResult
                            });
                        }
                        
                    } else {
                        throw(new Error('缺少位置信息'));
                    }
                }
            } else if (nodePath.node.loc){
                const node = nodePath.node;
                if (node) {
                    const locNode = node.loc;
                    if (
                        node.start
                        || node.end
                        || locNode.start
                        || locNode.end
                    ) {
                        if (!this.task.configObj.customCheckNode(nodePath)) {
                            errors.push({
                                type: NodeConstants.NO_KEY,
                                filePath,
                                data: {
                                    start: node.start,
                                    end: node.end,
                                    startNode: locNode.start,
                                    endNode: locNode.end,
                                },
                                nodePath,
                                intlText: nodeValue
                            });
                        }
                    } else {
                        throw(new Error('缺少位置信息'));
                    }
                }
            }
        }
    }
    checkFile(filepath: any){
        return new Promise((resolve) => {
            if (this.task.getConfig().skipFolderReg.test(filepath)) {
                resolve([]);
                return;
            }
            const errors: any = [];
            babelCore.transformFile(filepath, {
                presets: [
                    // [
                    //     require.resolve('@babel/preset-env'),
                    //     {
                    //         "useBuiltIns": false,
                    //         // "corejs": 3
                    //     }
                    // ],
                    require.resolve('@babel/preset-react'),
                    require.resolve('@babel/preset-typescript')
                ],
                "plugins": [
                    {
                        visitor: {
                            JSXText: (nodePath: any) => {
                                this.checkNode(nodePath, errors);
                            },
                            StringLiteral: (nodePath: any) => {
                                this.checkNode(nodePath, errors);
                            },
                            TemplateElement: (nodePath: any) => {
                                this.checkNode(nodePath, errors);
                            },
                        }
                    },
                    [
                        require.resolve("@babel/plugin-proposal-decorators"),
                        {
                            legacy: true
                        }
                    ],
                    require.resolve("@babel/plugin-proposal-class-properties")
                ]
            }, (err: any) => {
                if (err) {
                    console.log(err);
                    vscode.window.showWarningMessage(`${utils.name}解析失败` + err.stack);
                    return;
                }
                const obj: any = {};
                errors.forEach((item: any) => {
                    obj[`${item.data.start}-${item.data.end}`] = item;
                });
                utils.globalFileInfo[filepath] = obj;
                const ferrors = Object.values(obj);
                resolve(ferrors);
            });
        })
        
    }
    async getFiles(srcDir: any) {
        this.consoleIndex = 0;
        return readfiles(srcDir, {
            // filter: [
            //     '*.ts',
            //     '*.tsx',
            //     '*.js',
            //     '*.jsx',
            // ]
        }, (err: any, filename: any) => {
            if (err) throw err;
        }).then(async (files: any) => {
            var allerrors: any = [];
            utils.clearOutput();
            for (var i = 0; i < files.length; i++) {
                const filename = files[i];
                const ext = path.extname(filename);
                if (this.consoleIndex > 50) {
                    break;
                }
                if (/\.(js|tsx|jsx|ts)$/.test(ext) && !this.configObj.skipFolderReg.test(filename)) {
                    const errors = await this.checkFile(path.join(srcDir, filename));
                    allerrors = allerrors.concat(errors);
                    utils.appendOutputLine(filename + '分析完毕');
                    utils.showOutput();
                }
               
            }
            return allerrors;
        })
    }
}