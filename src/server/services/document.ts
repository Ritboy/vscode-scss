import * as url from 'url';

import { SymbolInformation, SymbolKind, DocumentLink } from 'vscode-languageserver';
import { FileSystemProvider, FileType, FileStat, LanguageService, getSCSSLanguageService, Stylesheet, DocumentContext } from 'vscode-css-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import * as utils from '../../utils';
import { Node } from '../types';

export type DocumentSymbols = {
	variables: SymbolInformation[];
	functions: SymbolInformation[];
	mixins: SymbolInformation[];
	imports: DocumentLink[];
};

export type ResolvedDocumentLink = {
	link: DocumentLink;
	source?: string;
};

export class FileSystem implements FileSystemProvider {
	public async stat(uri: string): Promise<FileStat> {
		const filePath = URI.parse(uri).fsPath;

		try {
			const stats = await utils.fs.statFile(filePath);

			let type = FileType.Unknown;
			if (stats.isFile()) {
				type = FileType.File;
			} else if (stats.isDirectory()) {
				type = FileType.Directory;
			} else if (stats.isSymbolicLink()) {
				type = FileType.SymbolicLink;
			}

			return {
				type,
				ctime: stats.ctime.getTime(),
				mtime: stats.mtime.getTime(),
				size: stats.size
			};
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}

			return {
				type: FileType.Unknown,
				ctime: -1,
				mtime: -1,
				size: -1
			};
		}
	}
}

/**
 * Adapted version
 * https://github.com/microsoft/vscode/blob/master/extensions/css-language-features/server/src/utils/documentContext.ts
 */
export class Context implements DocumentContext {
	public resolveReference(reference: string, base: string): string {
		// Resolve absolute path against the current workspace folder.
		if (reference.startsWith('/') && base.startsWith('file://')) {
			return 'root';
		}

		// Following [css-loader](https://github.com/webpack-contrib/css-loader#url)
		// and [sass-loader's](https://github.com/webpack-contrib/sass-loader#imports)
		// convention, if an import path starts with ~ then use node module resolution
		// *unless* it starts with "~/" as this refers to the user's home directory.
		if (reference.startsWith('~') && reference[1] !== '/') {
			reference = reference.slice(1);

			if (base.startsWith('file://')) {
				return 'module';
			}
		}

		return new url.URL(reference, base).toString();
	}
}

export type IDocumentService = {
	parse(document: TextDocument): Stylesheet;
	getSymbols(document: TextDocument): DocumentSymbols;
	resolveDocumentLinks(document: TextDocument): Promise<ResolvedDocumentLink[]>;
	service(): LanguageService;
};

export default class DocumentService implements IDocumentService {
	private readonly _ls: LanguageService = this._buildLanguageService();

	public service(): LanguageService {
		return this._ls;
	}

	public parse(document: TextDocument): Stylesheet {
		return this._ls.parseStylesheet(document);
	}

	public getSymbols(document: TextDocument): DocumentSymbols {
		const ast = this._ls.parseStylesheet(document);

		return this._findDocumentSymbols(document, ast);
	}

	public async resolveDocumentLinks(document: TextDocument): Promise<ResolvedDocumentLink[]> {
		const ast = this._ls.parseStylesheet(document);

		const links = await this._findDocumentLinks(document, ast);

		return links.map((link) => ({
			link,
			source: this._getDocumentLinkSource(document, ast, link)
		}));
	}

	private _buildLanguageService(): LanguageService {
		const ls = getSCSSLanguageService({
			fileSystemProvider: new FileSystem()
		});

		ls.configure({
			validate: false
		});

		return ls;
	}

	private _findDocumentSymbols(document: TextDocument, ast: Stylesheet): DocumentSymbols {
		const symbols = this._ls.findDocumentSymbols(document, ast);

		const variables = symbols.filter((symbol) => symbol.kind === SymbolKind.Variable);
		const functions = symbols.filter((symbol) => symbol.kind === SymbolKind.Function);
		const mixins = symbols.filter((symbol) => symbol.kind === SymbolKind.Method);

		const imports = this._ls.findDocumentLinks(document, ast, new Context());

		return {
			variables,
			functions,
			mixins,
			imports
		};
	}

	private _findDocumentLinks(document: TextDocument, ast: Stylesheet): Promise<DocumentLink[]> {
		return this._ls.findDocumentLinks2(document, ast, new Context());
	}

	private _getDocumentLinkSource(document: TextDocument, ast: Stylesheet, link: DocumentLink): string | undefined {
		const offset = document.offsetAt(link.range.start);

		const node = utils.ast.getNodeAtOffset(ast as Node, offset);

		return node?.getParent()?.getText();
	}
}
