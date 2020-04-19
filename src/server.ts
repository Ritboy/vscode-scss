import * as pMap from 'p-map';
import { TextDocuments, createConnection, TextDocumentSyncKind, WorkspaceFoldersChangeEvent, WorkspaceSymbolParams, TextDocumentChangeEvent, DefinitionParams, InitializedParams, DidChangeWatchedFilesParams, HoverParams, SignatureHelpParams, CompletionParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import Server from './server/main';
import * as utils from './utils';

const connection = createConnection();
const documents = new TextDocuments(TextDocument);

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

const server = new Server();

type InitializationOptions = {
	activeDocumentUri?: string;
};

connection.onInitialize(() => {
	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {},
			workspaceSymbolProvider: true,
			definitionProvider: true,
			hoverProvider: true,
			signatureHelpProvider: {
				triggerCharacters: ['(', ',', ';']
			}
		}
	};
});

connection.onInitialized((parameters: InitializedParams) => {
	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	utils.async.runSafe(async () => {
		server.initialization();

		const workspaces = await connection.workspace.getWorkspaceFolders();

		await server.initWorkspaces(workspaces ?? []);

		const activeDocumentUri = (parameters as InitializationOptions).activeDocumentUri;

		if (activeDocumentUri !== undefined) {
			server.setCurrentDocumentWorkspace(activeDocumentUri);
		}
	}, 'Cannot initialize server');

	connection.workspace.onDidChangeWorkspaceFolders((event: WorkspaceFoldersChangeEvent) => {
		return utils.async.runSafe(async () => {
			await pMap(event.removed, (folder) => server.flashWorkspace(folder.uri));
			await pMap(event.added, (folder) => server.initWorkspace(folder.uri));
		}, 'Cannot update server');
	});
});

connection.onDidChangeWatchedFiles((parameters: DidChangeWatchedFilesParams) => {
	const files = parameters.changes.map((file) => file.uri);

	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	utils.async.runSafe(() => {
		return server.updateWorkspacesByFiles(files);
	}, 'Error while update changed files');
});

connection.onWorkspaceSymbol((parameters: WorkspaceSymbolParams) => {
	return utils.async.runSafe(async () => {
		return server.onWorkspaceSymbol(parameters.query);
	}, `Error while computing document symbols for query: "${parameters.query}"`);
});

connection.onCompletion((parameters: CompletionParams) => {
	const uri = parameters.textDocument.uri;
	const document = documents.get(uri);

	if (document === undefined) {
		return null;
	}

	return utils.async.runSafe(() => {
		return server.onCompletion(document, parameters.position);
	}, `Error while computing completion for ${uri}`);
});

connection.onDefinition((parameters: DefinitionParams) => {
	const uri = parameters.textDocument.uri;
	const document = documents.get(uri);

	if (document === undefined) {
		return null;
	}

	return utils.async.runSafe(() => {
		return server.onDefinition(document, parameters.position);
	}, `Error while computing definitions for ${uri}`);
});

connection.onHover((parameters: HoverParams) => {
	const uri = parameters.textDocument.uri;
	const document = documents.get(uri);

	if (document === undefined) {
		return null;
	}

	return utils.async.runSafe(() => {
		return server.onHover(document, parameters.position);
	}, `Error while computing hover ${uri}`);
});

connection.onSignatureHelp((parameters: SignatureHelpParams) => {
	const uri = parameters.textDocument.uri;
	const document = documents.get(uri);

	if (document === undefined) {
		return null;
	}

	return utils.async.runSafe(() => {
		return server.onSignatureHelp(document, parameters.position, parameters.context);
	}, `Error while computing signature help ${uri}`);
});

documents.listen(connection);

documents.onDidChangeContent((event: TextDocumentChangeEvent<TextDocument>) => {
	server.setCurrentDocumentWorkspace(event.document.uri);
});

connection.listen();
