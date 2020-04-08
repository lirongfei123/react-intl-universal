import * as vscode from 'vscode'
import CommandConstants from '../constants/commands';

abstract class Extract implements vscode.CodeActionProvider {
  abstract getCommands(params: any): vscode.Command[]

  provideCodeActions(): vscode.Command[] {
    const editor: any = vscode.window.activeTextEditor
    const { selection } = editor;
    const text = editor.document.getText(selection)
    if (!text || selection.start.line !== selection.end.line) {
      return [];
    }

    return this.getCommands({
      filepath: editor.document.fileName,
      range: selection,
      text
    })
  }
}

class ExtractProvider extends Extract {

  getCommands(params: any) {
    return [
      {
        command: CommandConstants.OPEN_WEBVIEW,
        title: `提取为$t('key')`,
        arguments: [
          {
            ...params,
            keyReplace: CommandConstants.OPEN_WEBVIEW
          }
        ]
      },
      {
        command: 'vue-i18n.extract',
        title: `提取为i18n.t('key')`,
        arguments: [
          {
            ...params,
            keyReplace: 'werwerwerw'
          }
        ]
      }
    ]
  }
}

export const extractEditor = (context: any) => {
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider(
    [
      { language: 'vue', scheme: '*' },
      { language: 'javascript', scheme: '*' },
      { language: 'typescript', scheme: '*' }
    ],
    new ExtractProvider(),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
    }
  ));
}
