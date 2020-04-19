import * as pMap from 'p-map';
import * as fg from 'fast-glob';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import * as utils from '../../utils';
import { ILoggerService } from './logger';
import { IStorageService } from './storage';
import { IDocumentService } from './document';

export type IScannerService = {
	scan(cwd: string): Promise<void>;
	update(entries: string[]): Promise<void>;
};

export default class ScannerService implements IScannerService {
	protected readonly _fg: typeof fg = fg;

	constructor(
		private readonly _logger: ILoggerService,
		private readonly _storage: IStorageService,
		private readonly _document: IDocumentService
	) { }

	public async scan(cwd: string): Promise<void> {
		const entries = await this._scanFiles(cwd);

		this._logger.debug('found entries', { cwd, count: entries.length });

		await this._scan(entries);
	}

	public async update(entries: string[]): Promise<void> {
		await this._scan(entries);
	}

	private async _scan(entries: string[]): Promise<void> {
		const files = new Set(entries);

		await pMap(files, async (file) => {
			const uri = URI.file(file).toString();

			this._logger.debug('trying to find symbols for file', { file });

			const isExistFile = await utils.fs.existFile(file);

			if (!isExistFile) {
				this._logger.debug('deleting a non-exist file', { file });

				this._storage.delete(uri);

				return;
			}

			const content = await utils.fs.readFile(file);

			const document = TextDocument.create(uri, 'scss', 0, content);

			const symbols = this._document.getSymbols(document);
			const imports = await this._document.resolveDocumentLinks(document);

			this._logger.debug('found symbols for document', { file, symbols, imports });

			this._storage.set(document.uri, symbols);

			for (const symbol of imports) {
				const target = symbol.link.target;

				if (target === undefined) {
					continue;
				}

				const fsPath = URI.parse(target).fsPath;

				files.add(fsPath);
			}
		}, { concurrency: 1 });
	}

	private _scanFiles(cwd: string): Promise<string[]> {
		return this._fg('**/*.scss', {
			absolute: true,
			ignore: ['**/{.git,node_modules}/**'],
			cwd
		});
	}
}
