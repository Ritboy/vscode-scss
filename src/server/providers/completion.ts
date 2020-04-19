import { SymbolInformation, CompletionList, CompletionItem, SymbolKind, CompletionItemKind, Location, MarkupContent, MarkupKind } from 'vscode-languageserver';
import { TextDocument, Position } from 'vscode-languageserver-textdocument';
import { ICompletionParticipant, PropertyValueCompletionContext, MixinReferenceCompletionContext } from 'vscode-css-languageservice';

import { ResolvedDocumentLink } from '../services/document';
import { SymbolType } from '../types';
import Provider from './provider';

export type CompletionItemBox = {
	completion: CompletionItem;
	location: Location;
};

export default class CompletionProvider extends Provider {
	public async provideCompletionItems(document: TextDocument, position: Position): Promise<CompletionList | null> {
		const documentLinks = await this._workspace.services.document.resolveDocumentLinks(document);

		const boxes = this._getCompletionItems(document, position);

		this._formatCompletionItems(boxes, documentLinks);

		const items = boxes
			.filter((box) => box.location.uri !== document.uri)
			.map((box) => box.completion);

		return CompletionList.create(items, false);
	}

	protected _getCompletionItems(document: TextDocument, position: Position): CompletionItemBox[] {
		const ast = this._workspace.services.document.parse(document);

		const boxes: CompletionItemBox[] = [];

		this._workspace.services.document.service().setCompletionParticipants([
			this._buildPropertyValueCompletionParticipants(boxes),
			this._buildMixinReferenceCompletionParticipants(boxes)
		]);

		this._workspace.services.document.service().doComplete(document, position, ast);

		return boxes;
	}

	private _buildPropertyValueCompletionParticipants(items: CompletionItemBox[]): ICompletionParticipant {
		return {
			onCssPropertyValue: (context: PropertyValueCompletionContext) => {
				const variables = this._getCandidateSymbols(SymbolType.Variable, context.propertyValue);
				const functions = this._getCandidateSymbols(SymbolType.Function, context.propertyValue);

				for (const symbol of [...variables, ...functions]) {
					items.push({
						completion: {
							label: symbol.name,
							kind: this._getSymbolCompletionKind(symbol.kind)
						},
						location: symbol.location
					});
				}
			}
		};
	}

	private _buildMixinReferenceCompletionParticipants(items: CompletionItemBox[]): ICompletionParticipant {
		return {
			onCssMixinReference: (context: MixinReferenceCompletionContext) => {
				const mixins = this._getCandidateSymbols(SymbolType.Mixin, context.mixinName);

				for (const symbol of mixins) {
					items.push({
						completion: {
							label: symbol.name,
							kind: this._getSymbolCompletionKind(symbol.kind)
						},
						location: symbol.location
					});
				}
			}
		};
	}

	private _getCandidateSymbols(type: SymbolType, partialName?: string): SymbolInformation[] {
		let result: SymbolInformation[] = [];

		const items = this._workspace.services.storage.getAll();

		for (const symbols of items) {
			if (type === SymbolType.Variable) {
				result = result.concat(this._pickSymbolsByName(symbols.variables, partialName));
			}

			if (type === SymbolType.Function) {
				result = result.concat(this._pickSymbolsByName(symbols.functions, partialName));
			}

			if (type === SymbolType.Mixin) {
				result = result.concat(this._pickSymbolsByName(symbols.mixins, partialName));
			}
		}

		return result;
	}

	private _pickSymbolsByName(symbols: SymbolInformation[], partialName?: string): SymbolInformation[] {
		return symbols.filter((symbol) => {
			if (partialName === undefined || partialName === '') {
				return true;
			}

			return symbol.name.startsWith(partialName);
		});
	}

	private _getSymbolCompletionKind(kind: SymbolKind): CompletionItemKind {
		if (kind === SymbolKind.Variable) {
			return CompletionItemKind.Variable;
		}

		if (kind === SymbolKind.Function) {
			return CompletionItemKind.Function;
		}

		return CompletionItemKind.Method;
	}

	private _formatCompletionItems(boxes: CompletionItemBox[], links: ResolvedDocumentLink[]): void {
		for (const box of boxes) {
			const link = links.find((value) => value.link.target === box.location.uri);

			box.completion.documentation = this._formatCompletionItemDetail(box, link);
		}
	}

	private _formatCompletionItemDetail(box: CompletionItemBox, link?: ResolvedDocumentLink): MarkupContent {
		const relativePathToWorkspace = box.location.uri.replace(this._workspace.uri, '.');

		const partials: string[] = [];

		if (link === undefined) {
			partials.push('// Implicitly', relativePathToWorkspace);
		} else {
			partials.push('// Symbol from module', link.source ?? relativePathToWorkspace);
		}

		return {
			kind: MarkupKind.Markdown,
			value: [
				'```scss',
				...partials,
				'```'
			].join('\n')
		};
	}
}
