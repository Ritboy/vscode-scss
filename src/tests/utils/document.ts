import { DocumentLink } from 'vscode-languageserver';
import { getSCSSLanguageService, Stylesheet } from 'vscode-css-languageservice';
import { TextDocument, Position, Range } from 'vscode-languageserver-textdocument';

export type CreateTextDocumentOptions = {
	uri?: string;
	languageId?: string;
	version?: number;
};

export type CreateDocumentLinkOptions = {
	range?: Range;
};

export function createTextDocument(lines: string[], options: CreateTextDocumentOptions = {}): TextDocument {
	const uri = options.uri ?? 'file://test.scss';
	const languageId = options.languageId ?? 'scss';
	const version = options.version ?? 1;
	const content = lines.join('\n');

	return TextDocument.create(uri, languageId, version, content);
}

export function createTextDocumentAst(document: TextDocument): Stylesheet {
	const ls = getSCSSLanguageService();

	ls.configure({ validate: false });

	return ls.parseStylesheet(document);
}

export function createPosition(line: number, character: number): Position {
	return {
		line,
		character
	};
}

export function createDocumentLink(target: string, options: CreateDocumentLinkOptions = {}): DocumentLink {
	const range: Range = options.range ?? {
		start: { line: 0, character: 10 },
		end: { line: 0, character: 20 }
	};

	return DocumentLink.create(range, target);
}
