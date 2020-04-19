import { SymbolInformation, DocumentLink } from 'vscode-languageserver';

export type StorageItem = {
	variables: SymbolInformation[];
	functions: SymbolInformation[];
	mixins: SymbolInformation[];
	imports: DocumentLink[];
};

export type IStorageService = Map<string, StorageItem> & {
	getAll(): StorageItem[];
};

export default class StorageService extends Map<string, StorageItem> implements IStorageService {
	public getAll(): StorageItem[] {
		return [...this.values()];
	}
}
