# react-intl-universal
## 功能
### 功能一, 自动查找已有Key, 并自动补全
#### 替换全部
[](https://img.alicdn.com/tfs/TB1gpdtCVP7gK0jSZFjXXc5aXXa-666-298.gif)
#### 只替换key
[](https://img.alicdn.com/tfs/TB1z3pxC7T2gK0jSZPcXXcKkpXa-666-298.gif)

### 提示是否有英文, 繁体(颜色标识黄色)
[](https://img.alicdn.com/tfs/TB1wLpyC4D1gK0jSZFyXXciOVXa-926-236.gif)

### 功能二, 没有翻译的自动提交美杜莎翻译(可定制翻译逻辑), 并直接替换, 支持自动生成key
[](https://img.alicdn.com/tfs/TB1wLpyC4D1gK0jSZFyXXciOVXa-926-236.gif)
### 支持查看所有文件, 标识出那些文件有美杜莎错误, 并自动标红, 自动跳转
## 配置
### localeDir
- 配置国际化语言文件所在目录
- 类型: 字符串
- default: 无
此参数和getLang必选其一
### getLang
- 类型: 函数
- 返回: 返回一个跟langKey对应的Map, 比如{zh_CN: {key: value}, en_US: {key: value}, zh_TW: {key, value}}
- default: 默认是读取localeDir目录中的所有文件, 并配置的langKey构建一个语言Map

### langKey
default:
```
{
    zh_CN: '中文',
    en_US: '英文',
    zh_TW: '繁体',
}
```
表示本项目要支持哪些语言, 以及国际化文件夹中语言文件的名称映射, 用于在vscode中进行提示
### defaultLang
default: zh_CN
默认语言, react-intl-universal .d函数中包裹的语言
isAli: false,
notSameText: '不一致',
displayErrorLangs: ['zh_CN'], // 显示红色
prefixStatusText: '缺少',
displayWarnLangs: ['zh_CN', 'en_US', 'zh_TW', NodeConstants.KEY_SAME], // 显示黄色
fileCheckLangs: ['zh_CN', 'en_US', 'zh_TW'], // 批量检查的时候, 检查哪些错误 
defaultFuncNameReg: /^d|defaultMessage$/,
getFuncNameReg: /^get|getHTML$/,
skipFolderReg: /locales/,
checkFileReg: /\.(?:ts|js|jsx|tsx)$/,
customCheckNode: (node: any) => {
    return false;
},
uploadLang: (config: any, key: any, text: any, callback: any) => {
    callback && callback();
},
getLang: (configObj: any) => {
    const localeDir = utils.getLocalDir(configObj);
    if (!fs.existsSync(localeDir)) {
        vscode.window.showWarningMessage('当前文件父目录中, 找不到locales目录, 请确定是否有locales目录');
        throw(new Error('找不到locales目录, 请至少选择src下面一个文件并打开'))
    }
    try {
        const langMap: any = {}
        Object.keys(configObj.langKey).forEach(key => {
            langMap[key] = JSON.parse(fs.readFileSync(`${localeDir}/${key}.json`).toString())
        });
        return langMap;
    } catch (e) {
        console.log(e);
        vscode.window.showWarningMessage(e);
    }
}
## 配置示例

## 交流
