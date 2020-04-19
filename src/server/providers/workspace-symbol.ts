import { SymbolInformation } from 'vscode-languageclient';

import Provider from './provider';

export default class WorkspaceSymbolProvider extends Provider {
	public resolveWorkspaceSymbol(query: string): SymbolInformation[] {
		const symbols = this._workspace.services.storage.getAll();

		return symbols.reduce<SymbolInformation[]>((collection, symbols) => {
			const allSymbols = [...symbols.variables, ...symbols.functions, ...symbols.mixins];

			for (const symbol of allSymbols) {
				if (symbol.name.startsWith(query)) {
					collection.push(symbol);
				}
			}

			return collection;
		}, []);
	}
}
