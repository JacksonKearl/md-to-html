// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as marked from 'marked';
import { dirname } from 'path';
import { TextEncoder } from 'util';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('md-to-html.openExample', () => {
		vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.joinPath(context.extensionUri, 'sample-folder'));
	}));

	context.subscriptions.push(vscode.commands.registerCommand('md-to-html.openMarkdown', () => {
		vscode.commands.executeCommand('workbench.action.quickOpen', '.md');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('md-to-html.openHTML', () => {
		vscode.commands.executeCommand('workbench.action.quickOpen', '.html');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('md-to-html.addKeybinding', () => {
		vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', 'md-to-html.convertToHTML');
	}));

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('md-to-html.convertToHTML', async () => {
		// The code you place here will be executed every time your command is executed
		let md = vscode.window.activeTextEditor!.document.getText();
		const documentUri = vscode.window.activeTextEditor!.document.uri;
		const reads: Map<string, Promise<string>> = new Map();
		const html = marked.parse(md || '');
		const errors: { e: Error, url: string }[] = [];
		const _ = html.replace(/src=\"([^\"]*)\"/g, (match, url) => {
			const imageUri = vscode.Uri.joinPath(
				documentUri.with(
					{ path: dirname(documentUri.fsPath!) })
				, url);
			reads.set(imageUri.fsPath, reads.get(imageUri.fsPath) ?? (async () => {
				try {
					const file = await vscode.workspace.fs.readFile(imageUri);
					const buffer = Buffer.from(file);
					var uri = 'data:' + 'image/png' + ';' + 'base64' + ',' + buffer.toString('base64');
					return uri;
				} catch (e) {
					errors.push({ url, e });
					return '';
				}
			})());
			return match;
		});
		const read: Map<string, string> = new Map();
		await Promise.all(([...reads.keys()].map((async key => {
			read.set(key, await reads.get(key)!);
		}))));

		if (errors.length) {
			vscode.window.showErrorMessage(errors.map(({ e, url }) => `Error reading file at ${url}, ${e.message}`).join(' - '));
		}

		const embedded = html.replace(/src=\"([^\"]*)\"/g, (match, url) => {
			const documentUri = vscode.window.activeTextEditor!.document.uri;
			const imageUri = vscode.Uri.joinPath(
				documentUri.with(
					{ path: dirname(documentUri.fsPath!) })
				, url);
			return `src="${read.get(imageUri.fsPath)!}"`;
		});

		const final = `
		<head>
			<style type="text/css" media="screen">
				${styling}
			</style>
		</head>
		<body>
			${embedded}
		</body>`;

		vscode.workspace.fs.writeFile(documentUri.with({ path: documentUri.path.replace(/.md$/, ".html") }), new TextEncoder().encode(final));

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }


const styling = `body,html{font-family:var(--markdown-font-family, -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, "Ubuntu", "Droid Sans", sans-serif);font-size:var(--markdown-font-size,14px);padding:0 26px;line-height:var(--markdown-line-height,22px);word-wrap:break-word}body{padding-top:1em}h1,h2,h3,h4,h5,h6,ol,p,pre,ul{margin-top:0}h2,h3,h4,h5,h6{font-weight:400;margin-bottom:.2em}img{max-width:100%;max-height:100%}a{text-decoration:none}a:hover{text-decoration:underline}a:focus,input:focus,select:focus,textarea:focus{outline:1px solid -webkit-focus-ring-color;outline-offset:-1px}p{margin-bottom:.7em}ol,ul{margin-bottom:.7em}hr{border:0;height:2px;border-bottom:2px solid}h1{padding-bottom:.3em;line-height:1.2;border-bottom-width:1px;border-bottom-style:solid;font-weight:400}table{border-collapse:collapse}th{text-align:left;border-bottom:1px solid}td,th{padding:5px 10px}table>tbody>tr+tr>td{border-top:1px solid}blockquote{margin:0 7px 0 5px;padding:0 16px 0 10px;border-left-width:5px;border-left-style:solid}code{font-family:var(--vscode-editor-font-family, "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace);font-size:1em;line-height:1.357em}body.wordWrap pre{white-space:pre-wrap}pre.hljs code>div,pre:not(.hljs){padding:16px;border-radius:3px;overflow:auto}pre code{color:var(--vscode-editor-foreground);tab-size:4}`;