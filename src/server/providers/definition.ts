import { SymbolInformation, Location } from 'vscode-languageserver';
import { TextDocument, Position } from 'vscode-languageserver-textdocument';

import { ResolvedDocumentLink } from '../services/document';
import { SymbolType } from '../types';
import Provider from './provider';

export default class DefinitionProvider extends Provider {
	public async provideReferences(document: TextDocument, position: Position): Promise<Location[] | null> {
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
		const relatedSymbols = this._getRelatedSymbolsToDocuments(candidateSymbols, documentLinks);

		return relatedSymbols.map((symbol) => symbol.location);
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

	private _getRelatedSymbolsToDocuments(symbols: SymbolInformation[], links: ResolvedDocumentLink[]): SymbolInformation[] {
		if (links.length === 0) {
			return symbols;
		}

		for (const symbol of symbols) {
			const isExplicitlyImport = links.find((value) => value.link.target?.includes(symbol.location.uri));

			if (isExplicitlyImport !== undefined) {
				return [symbol];
			}
		}

		return symbols;
	}

	private _pickSymbolsByName(symbols: SymbolInformation[], name: string): SymbolInformation[] {
		return symbols.filter((symbol) => symbol.name === name);
	}
}
