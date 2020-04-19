import { SymbolInformation, SymbolKind, Location } from 'vscode-languageserver';

export function createVariable(name: string, uri: string): SymbolInformation {
	return {
		kind: SymbolKind.Variable,
		location: Location.create(uri, {
			start: { line: 0, character: 10 },
			end: { line: 0, character: 20 }
		}),
		name
	};
}

export function createFunction(name: string, uri: string): SymbolInformation {
	return {
		kind: SymbolKind.Function,
		location: Location.create(uri, {
			start: { line: 0, character: 10 },
			end: { line: 0, character: 20 }
		}),
		name
	};
}

export function createMixin(name: string, uri: string): SymbolInformation {
	return {
		kind: SymbolKind.Method,
		location: Location.create(uri, {
			start: { line: 0, character: 10 },
			end: { line: 0, character: 20 }
		}),
		name
	};
}
