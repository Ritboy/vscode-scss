import * as pMap from 'p-map';
import { WorkspaceFolder, SymbolInformation, Location, Hover, SignatureHelp, SignatureHelpContext, CompletionList } from 'vscode-languageserver';
import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import Workspace from './workspace';
import LoggerService, { Severity, ILoggerService } from './services/logger';
import ScannerService from './services/scanner';
import StorageService from './services/storage';
import DocumentService from './services/document';
import WorkspaceSymbolProvider from './providers/workspace-symbol';
import DefinitionProvider from './providers/definition';
import HoverProvider from './providers/hover';
import SignatureHelpProvider from './providers/signature-help';
import CompletionProvider from './providers/completion';

export default class Server {
	private readonly _logger: ILoggerService = new LoggerService();

	private readonly _workspaces: Map<string, Workspace> = new Map();
	private _currentWorkspace: Workspace | undefined = undefined;

	constructor() {
		// Hack
		this._logger.setSeverity(Severity.Debug);
	}

	public initialization(): void {
		this._logger.debug('Trying to initialize server');
	}

	public setCurrentDocumentWorkspace(uri: string): void {
		for (const workspace of this._workspaces.values()) {
			if (uri.startsWith(workspace.uri)) {
				this._currentWorkspace = workspace;

				return;
			}
		}

		this._currentWorkspace = undefined;
	}

	public async initWorkspaces(workspaces: WorkspaceFolder[]): Promise<void> {
		await pMap(workspaces, async ({ uri }) => this.initWorkspace(uri), { concurrency: 1 });
	}

	public async initWorkspace(uri: string): Promise<void> {
		this._logger.debug('Trying to create workspace', { uri });

		const workspace = this._createWorkspace(uri);

		this._addWorkspace(workspace);

		await workspace.init();
	}

	public async updateWorkspacesByFiles(files: string[]): Promise<void> {
		const actions = new Map<string, string[]>();

		for (const file of files) {
			const workspace = this._getRelatedWorkspace(file);

			if (workspace !== undefined) {
				const action = actions.get(workspace.uri) ?? [];
				const fsPath = URI.parse(file).fsPath;

				actions.set(workspace.uri, action.concat(fsPath));
			}
		}

		await pMap(actions, ([workspaceUri, files]) => {
			this._logger.debug('Trying to update workspace files', { workspaceUri, files });

			const workspace = this._workspaces.get(workspaceUri);

			if (workspace === undefined) {
				return;
			}

			return workspace.update(files);
		}, { concurrency: 1 });
	}

	public flashWorkspace(uri: string): void {
		this._logger.debug('Trying to delete workspace', { uri });

		this._workspaces.delete(uri);
	}

	public onWorkspaceSymbol(query: string): Promise<SymbolInformation[]> {
		let result: SymbolInformation[] = [];

		if (this._currentWorkspace !== undefined) {
			const provider = new WorkspaceSymbolProvider(this._currentWorkspace);

			result = provider.resolveWorkspaceSymbol(query);
		}

		return Promise.resolve(result);
	}

	public async onCompletion(document: TextDocument, position: Position): Promise<CompletionList | null> {
		let result: CompletionList | null = null;

		const workspace = this._currentWorkspace;

		if (workspace !== undefined) {
			const provider = new CompletionProvider(workspace);

			result = await provider.provideCompletionItems(document, position);
		}

		return Promise.resolve(result);
	}

	public async onDefinition(document: TextDocument, position: Position): Promise<Location[] | null> {
		let result: Location[] | null = null;

		const workspace = this._currentWorkspace;

		if (workspace !== undefined) {
			const provider = new DefinitionProvider(workspace);

			result = await provider.provideReferences(document, position);
		}

		return result;
	}

	public async onHover(document: TextDocument, position: Position): Promise<Hover | null> {
		let result: Hover | null = null;

		const workspace = this._currentWorkspace;

		if (workspace !== undefined) {
			const provider = new HoverProvider(workspace);

			result = await provider.provideHover(document, position);
		}

		return result;
	}

	public async onSignatureHelp(document: TextDocument, position: Position, context?: SignatureHelpContext): Promise<SignatureHelp | null> {
		let result: SignatureHelp | null = null;

		const workspace = this._currentWorkspace;

		if (workspace !== undefined) {
			const provider = new SignatureHelpProvider(workspace);

			result = await provider.provideSignatureHelp(document, position, context);
		}

		return Promise.resolve(result);
	}

	private _createWorkspace(uri: string): Workspace {
		const storage = new StorageService();
		const document = new DocumentService();
		const scanner = new ScannerService(this._logger, storage, document);

		return new Workspace(uri, {
			document,
			logger: this._logger,
			scanner,
			storage
		});
	}

	private _addWorkspace(workspace: Workspace): void {
		this._workspaces.set(workspace.uri, workspace);
	}

	private _getRelatedWorkspace(uri: string): Workspace | undefined {
		for (const workspace of this._workspaces.values()) {
			if (uri.startsWith(workspace.uri)) {
				return workspace;
			}
		}

		return undefined;
	}
}
