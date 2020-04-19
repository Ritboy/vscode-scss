import { SignatureHelp, SignatureHelpContext, SymbolInformation } from 'vscode-languageclient';
import { TextDocument, Position } from 'vscode-languageserver-textdocument';

import { Node, SymbolType, NodeType } from '../types';
import { ResolvedDocumentLink } from '../services/document';
import Provider from './provider';

type SymbolReference = {
	name: string;
	type: SymbolType;
};

export default class SignatureHelpProvider extends Provider {
	/**
	 * 30, 22, 20
	 */
	public async provideSignatureHelp(document: TextDocument, position: Position, context?: SignatureHelpContext): Promise<SignatureHelp | null> {
		const node = this._findRelatedNode(document, position);

		if (node === null) {
			return null;
		}

		const info = this._getSymbolReferenceForNode(node);

		if (info === null) {
			return null;
		}

		console.log(context);

		const documentLinks = await this._workspace.services.document.resolveDocumentLinks(document);

		const candidateSymbols = this._getCandidateSymbols(info.name, info.type);
		const relatedSymbols = this._getRelatedSymbolsToDocuments(candidateSymbols, documentLinks);

		if (relatedSymbols.length === 0) {
			return null;
		}

		/**
		 * 1. Get all symbol signatures from location (document)
		 * 2. Find relevant signatures by count of arguments
		 * 3. Show help
		 */

		return null;
	}

	protected _getSymbolReferenceForNode(node: Node): SymbolReference | null {
		console.log(node.type);

		if (node.type === NodeType.Function) {
			return {
				name: node.getName(),
				type: SymbolType.Function
			};
		}

		return null;
	}

	private _getCandidateSymbols(name: string, type: SymbolType): SymbolInformation[] {
		let result: SymbolInformation[] = [];

		const items = this._workspace.services.storage.getAll();

		for (const symbols of items) {
			if (type === SymbolType.Function) {
				result = result.concat(this._pickSymbolsByName(symbols.functions, name));
			}

			if (type === SymbolType.Mixin) {
				result = result.concat(this._pickSymbolsByName(symbols.mixins, name));
			}
		}

		return result;
	}

	private _pickSymbolsByName(symbols: SymbolInformation[], name: string): SymbolInformation[] {
		return symbols.filter((symbol) => symbol.name === name);
	}

	private _getRelatedSymbolsToDocuments(symbols: SymbolInformation[], links: ResolvedDocumentLink[]): SymbolInformation[] {
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
}
