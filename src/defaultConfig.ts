export default {
    langTitle: {
        zh_CN: '中文',
        en_US: '英文',
        zh_TW: '繁体',
    },
    errorLang: [], // 显示红色
    warnLang: [], // 显示黄色
    checkLany: [],
    dNameReg: /^d|defaultMessage$/,
    getNameReg: /^get|getHTML$/,
    excludeDir: /locales/,
    fileReg: /\.(?:ts|js|jsx|tsx)$/
}