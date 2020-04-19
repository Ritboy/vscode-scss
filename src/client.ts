import * as path from 'path';

import * as vscode from 'vscode';
import { LanguageClient, ServerOptions, LanguageClientOptions, NodeModule, TransportKind, RevealOutputChannelOn, InitializedNotification } from 'vscode-languageclient';

import { EXTENSION_ID, EXTENSION_NAME } from './constants';

const EXTENSION_SERVER_MODULE_PATH = path.join(__dirname, 'server.js');
const EXTENSION_DEFAULT_DEBUG_PORT = -1;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const activeDocumentUri = vscode.window.activeTextEditor?.document.uri.toString();

	const client = buildClient();

	context.subscriptions.push(client.start());

	const activation = client.onReady()
		.then(() => {
			client.sendNotification(InitializedNotification.type, { activeDocumentUri });
		})
		.catch((error) => {
			console.log('Client initialization failed');
			console.error(error);
		});

	return vscode.window.withProgress(
		{
			title: 'SCSS IntelliSense initialization',
			location: vscode.ProgressLocation.Window
		},
		() => activation
	);
}

function buildClient(): LanguageClient {
	return new LanguageClient(EXTENSION_ID, EXTENSION_NAME, buildServerOptions(), buildClientOptions());
}

function buildServerOptions(): ServerOptions {
	const extensionServerPort = vscode.workspace.getConfiguration().get<number>('scss.dev.serverPort', EXTENSION_DEFAULT_DEBUG_PORT);

	const configuration: NodeModule = {
		module: EXTENSION_SERVER_MODULE_PATH,
		transport: TransportKind.ipc,
		options: {
			execArgv: extensionServerPort === EXTENSION_DEFAULT_DEBUG_PORT ? [] : [`--inspect=${extensionServerPort}`]
		}
	};

	return {
		run: {
			...configuration
		},
		debug: {
			...configuration,
			options: {
				execArgv: ['--nolazy', '--inspect=6006']
			}
		}
	};
}

function buildClientOptions(): LanguageClientOptions {
	return {
		documentSelector: ['scss', 'vue'],
		synchronize: {
			configurationSection: ['scss'],
			fileEvents: vscode.workspace.createFileSystemWatcher('**/*.scss')
		},
		revealOutputChannelOn: RevealOutputChannelOn.Never
	};
}
