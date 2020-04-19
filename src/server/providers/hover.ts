import { TextDocument, Position } from 'vscode-languageserver-textdocument';
import { Hover, SymbolInformation, MarkupContent, MarkupKind } from 'vscode-languageserver';

import { ResolvedDocumentLink } from '../services/document';
import { SymbolType } from '../types';
import Provider from './provider';

export default class HoverProvider extends Provider {
	public async provideHover(document: TextDocument, position: Position): Promise<Hover | null> {
		const node = this._findRelatedNode(document, position);

		if (node === null) {
			return null;
		}

		const info = this._getSymbolReferenceForNode(node);

		if (info === null) {
			return null;
		}

		const documentLinks = await this._workspace.services.document.resolveDocumentLinks(document);

		const candidateSymbols = this._getCandidateSymbols(info.name, info.type);
		const relatedSymbols = this._getRelatedSymbols(candidateSymbols, documentLinks);

		return {
			contents: this._formatHoverContent(relatedSymbols, documentLinks)
		};
	}

	private _getCandidateSymbols(name: string, type: SymbolType): SymbolInformation[] {
		let result: SymbolInformation[] = [];

		const items = this._workspace.services.storage.getAll();

		for (const symbols of items) {
			if (type === SymbolType.Variable) {
				result = result.concat(this._pickSymbolsByName(symbols.variables, name));
			}

			if (type === SymbolType.Function) {
				result = result.concat(this._pickSymbolsByName(symbols.functions, name));
			}

			if (type === SymbolType.Mixin) {
				result = result.concat(this._pickSymbolsByName(symbols.mixins, name));
			}
		}

		return result;
	}

	private _getRelatedSymbols(symbols: SymbolInformation[], links: ResolvedDocumentLink[]): SymbolInformation[] {
		if (links.length === 0) {
			return symbols;
		}

		for (const symbol of symbols) {
			const isObviouslyImport = links.find((value) => value.link.target?.includes(symbol.location.uri));

			if (isObviouslyImport !== undefined) {
				return [symbol];
			}
		}

		return symbols;
	}

	private _pickSymbolsByName(symbols: SymbolInformation[], name: string): SymbolInformation[] {
		return symbols.filter((symbol) => symbol.name === name);
	}

	private _formatHoverContent(symbols: SymbolInformation[], links: ResolvedDocumentLink[]): MarkupContent {
		let value = '';

		for (const symbol of symbols) {
			const link = links.find((value) => value.link.target === symbol.location.uri);

			value += this._formatSymbolHoverContent(symbol, link) + '\n';
		}

		return {
			kind: MarkupKind.Markdown,
			value
		};
	}

	private _formatSymbolHoverContent(symbol: SymbolInformation, link?: ResolvedDocumentLink): string {
		const relativePathToWorkspace = symbol.location.uri.replace(this._workspace.uri, '.');

		const partials: string[] = [];

		if (link === undefined) {
			partials.push('// Implicitly', relativePathToWorkspace);
		} else {
			partials.push('// Symbol from module', link.source ?? relativePathToWorkspace);
		}

		return [
			'```scss',
			...partials,
			'```'
		].join('\n');
	}
}
