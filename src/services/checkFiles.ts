import utils from "../utils";
import * as vscode from 'vscode';
import NodeConstants from "../constants/node";
const babelCore = require('@babel/core');
var readfiles = require('node-readfiles');
var generate = require('@babel/generator');
const path = require('path');
export default class CheckFile {
    dNameReg: RegExp = /^d|defaultMessage$/;
    getNameReg: RegExp = /^get|getHtml$/;
    langMap: any = {};
    consoleIndex: number = 0;
    excludeDir: RegExp = /locales/;
    constructor({
        dNameReg,
        getNameReg,
        langMap,
        excludeDir
    }: any) {
        if (dNameReg) {
            this.dNameReg = dNameReg;
        }
        if (getNameReg) {
            this.getNameReg = getNameReg;
        }
        if (excludeDir) {
            this.excludeDir = excludeDir;
        }
        if (langMap) {
            this.langMap = langMap;
        }
    }
    getStatusText({cn, en, tw, isSame}: any) {
        if (cn && en && tw && isSame) return null;
        var text = '缺少';
        if (!en) {
            text += ' 英文'
        }
        if (!cn) {
            text += ' 中文'
        }
        if (!tw) {
            text += ' 繁体'
        }
        if (!isSame) {
            text += ' 不一致'
        }
        return text;
    }
    checkKey(key: string, nodeValue: string) {
        var cn = false;
        var en = false;
        var tw = false;
        var isSame = true;
        if (this.langMap.cn[key]) {
            cn = true;
            if (this.langMap.cn[key].indexOf('{') == -1 && this.langMap.cn[key] != nodeValue) {
                isSame = false;
            }
        }
        if (this.langMap.en[key]) {
            en = true;
        }
        if (this.langMap.tw[key]) {
            tw = true;
        }
        return {
            cn,
            en,
            tw,
            isSame
        }
    }
    consolePath(filePath: string, {cn, en, tw, isSame}: any) {
        if (cn && en && tw && isSame) return;
        const text = this.getStatusText({cn, en, tw, isSame});
        if (text != null) {
            this.consoleIndex++;
        }
        utils.appendOutputLine(text + ' ' + filePath);
    }
    getNodeValue (node: any) {
        if (node.type === 'TemplateLiteral') {
            return generate.default(node).code.slice(1, -1);
        } else {
            return node.value
        }
    }
    checkNode(nodePath: any, errors?: any) {
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
                    && this.dNameReg.test(node.callee.property.name)
                ) {
                    const objNode = node.callee.object;
                    if (
                        objNode.type === "CallExpression"
                        && this.getNameReg.test(objNode.callee.property.name)
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
                const checkResult = this.checkKey(key, nodeValue);
                const locNode = intlNode.get('loc').node;
                if (
                    !checkResult.cn
                    || !checkResult.en
                    || !checkResult.tw
                    || !checkResult.isSame
                ) {
                    if (
                        intlNode.node.start
                        || intlNode.node.end
                        || locNode.start
                        || locNode.end
                    ) {
                        const keyNode = intlNode.node.callee.object.arguments[0];
                        const textNode = intlNode.node.arguments[0];
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
                            intlKey,
                            intlText: nodeValue,
                            trans: {
                                cn: checkResult.cn,
                                en: checkResult.en,
                                tw: checkResult.tw,
                                isSame: checkResult.isSame,
                            }
                        });
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
                        errors.push({
                            type: NodeConstants.NO_KEY,
                            filePath,
                            data: {
                                start: node.start,
                                end: node.end,
                                startNode: locNode.start,
                                endNode: locNode.end,
                            },
                            intlText: nodeValue
                        })
                    } else {
                        throw(new Error('缺少位置信息'));
                    }
                }
            }
        }
    }
    checkFile(filepath: any){
        return new Promise((resolve) => {
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
                            TemplateLiteral: (nodePath: any) => {
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
    getFiles(srcDir: any) {
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
                    return;
                }
                if (/\.(js|tsx|jsx|ts)$/.test(ext) && !this.excludeDir.test(filename)) {
                    const errors = await this.checkFile(path.join(srcDir, filename));
                    allerrors = allerrors.concat(errors);
                }
                utils.appendOutputLine(filename + '分析完毕');
                utils.showOutput();
            }
            return allerrors;
        })
    }
}