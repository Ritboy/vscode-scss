import { URI } from 'vscode-uri';

import { IDocumentService } from './services/document';
import { ILoggerService } from './services/logger';
import { IScannerService } from './services/scanner';
import { IStorageService } from './services/storage';

export type WorkspaceServices = {
	document: IDocumentService;
	logger: ILoggerService;
	scanner: IScannerService;
	storage: IStorageService;
};

export type IWorkspace = {
	init(): Promise<void>;
	update(files: string[]): Promise<void>;
	services: WorkspaceServices;
};

export default class Workspace implements IWorkspace {
	public readonly uri: string = this._uri;
	public readonly fsPath: string = URI.parse(this._uri).fsPath;

	public readonly services: WorkspaceServices = this._services;

	constructor(private readonly _uri: string, private readonly _services: WorkspaceServices) { }

	public async init(): Promise<void> {
		await this._services.scanner.scan(this.fsPath);
	}

	public async update(files: string[]): Promise<void> {
		await this._services.scanner.update(files);
	}
}
