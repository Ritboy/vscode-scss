import * as assert from 'assert';

import * as sinon from 'sinon';
import { getSCSSLanguageService, CompletionList, MarkupKind, CompletionItemKind } from 'vscode-css-languageservice';

import Workspace from '../workspace';
import DocumentService from '../services/document';
import ScannerService from '../services/scanner';
import LoggerService from '../services/logger';
import StorageService, { IStorageService } from '../services/storage';
import * as tests from '../../tests';
import CompletionProvider from './completion';

type WorkspaceServicesMock = {
	document: sinon.SinonStubbedInstance<DocumentService>;
	scanner: sinon.SinonStubbedInstance<ScannerService>;
	logger: sinon.SinonStubbedInstance<LoggerService>;
	storage: IStorageService;
};

function getWorkspaceServicesMock(): WorkspaceServicesMock {
	return {
		document: sinon.createStubInstance(DocumentService),
		scanner: sinon.createStubInstance(ScannerService),
		logger: sinon.createStubInstance(LoggerService),
		storage: new StorageService()
	};
}

function getProvider(services: WorkspaceServicesMock): CompletionProvider {
	const workspace = new Workspace('file://test', services);

	return new CompletionProvider(workspace);
}

describe('Providers → Completion', () => {
	describe('.provideCompletionItems', () => {
		it('should return an empty completion list', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $ }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 18);

			services.document.parse.returns(ast);
			services.document.service.returns(getSCSSLanguageService());

			const actual = await provider.provideCompletionItems(document, position);

			assert.deepStrictEqual(actual, CompletionList.create());
		});

		it('should return a completion list with one variable imported from module', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $ }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 18);

			services.document.parse.returns(ast);
			services.document.service.returns(getSCSSLanguageService());
			services.document.resolveDocumentLinks.resolves([
				{
					link: tests.utils.document.createDocumentLink('file://test/constants/colors.scss')
				}
			]);

			const variable = tests.utils.symbols.createVariable('$bg', 'file://test/constants/colors.scss');

			services.storage.set('file://test/constants/colors.scss', {
				functions: [],
				imports: [],
				mixins: [],
				variables: [variable]
			});

			const actual = await provider.provideCompletionItems(document, position);

			assert.deepStrictEqual(actual, CompletionList.create([
				{
					label: '$bg',
					kind: CompletionItemKind.Variable,
					documentation: {
						kind: MarkupKind.Markdown,
						value: [
							'```scss',
							'// Symbol from module',
							'./constants/colors.scss',
							'```'
						].join('\n')
					}
				}
			]));
		});

		it('should return a completion list with one implicitly variable', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $ }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 18);

			services.document.parse.returns(ast);
			services.document.service.returns(getSCSSLanguageService());
			services.document.resolveDocumentLinks.resolves([]);

			const variable = tests.utils.symbols.createVariable('$bg', 'file://test/constants/colors.scss');

			services.storage.set('file://test/constants/colors.scss', {
				functions: [],
				imports: [],
				mixins: [],
				variables: [variable]
			});

			const actual = await provider.provideCompletionItems(document, position);

			assert.deepStrictEqual(actual, CompletionList.create([
				{
					label: '$bg',
					kind: CompletionItemKind.Variable,
					documentation: {
						kind: MarkupKind.Markdown,
						value: [
							'```scss',
							'// Implicitly',
							'./constants/colors.scss',
							'```'
						].join('\n')
					}
				}
			]));
		});

		it('should return a completion list with two implicitly variables', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $ }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 18);

			services.document.parse.returns(ast);
			services.document.service.returns(getSCSSLanguageService());
			services.document.resolveDocumentLinks.resolves([]);

			const firstVariable = tests.utils.symbols.createVariable('$bg', 'file://test/constants/production/color.scss');
			const secondVariable = tests.utils.symbols.createVariable('$bg', 'file://test/constants/development/color.scss');

			services.storage.set('file://test/constants/production/color.scss', {
				functions: [],
				imports: [],
				mixins: [],
				variables: [firstVariable]
			});

			services.storage.set('file://test/constants/development/color.scss', {
				functions: [],
				imports: [],
				mixins: [],
				variables: [secondVariable]
			});

			const actual = await provider.provideCompletionItems(document, position);

			assert.deepStrictEqual(actual, CompletionList.create([
				{
					label: '$bg',
					kind: CompletionItemKind.Variable,
					documentation: {
						kind: MarkupKind.Markdown,
						value: [
							'```scss',
							'// Implicitly',
							'./constants/production/color.scss',
							'```'
						].join('\n')
					}
				},
				{
					label: '$bg',
					kind: CompletionItemKind.Variable,
					documentation: {
						kind: MarkupKind.Markdown,
						value: [
							'```scss',
							'// Implicitly',
							'./constants/development/color.scss',
							'```'
						].join('\n')
					}
				}
			]));
		});

		it('should return a completion list with one function', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content:  }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 17);

			services.document.parse.returns(ast);
			services.document.service.returns(getSCSSLanguageService());
			services.document.resolveDocumentLinks.resolves([
				{
					link: tests.utils.document.createDocumentLink('file://test/functions.scss')
				}
			]);

			const func = tests.utils.symbols.createFunction('pow', 'file://test/functions.scss');

			services.storage.set('file://test/functions.scss', {
				functions: [func],
				imports: [],
				mixins: [],
				variables: []
			});

			const actual = await provider.provideCompletionItems(document, position);

			assert.deepStrictEqual(actual, CompletionList.create([
				{
					label: 'pow',
					kind: CompletionItemKind.Function,
					documentation: {
						kind: MarkupKind.Markdown,
						value: [
							'```scss',
							'// Symbol from module',
							'./functions.scss',
							'```'
						].join('\n')
					}
				}
			]));
		});

		it('should return a completion list with one mixin', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { @include  }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 17);

			services.document.parse.returns(ast);
			services.document.service.returns(getSCSSLanguageService());
			services.document.resolveDocumentLinks.resolves([
				{
					link: tests.utils.document.createDocumentLink('file://test/mixins.scss')
				}
			]);

			const mixin = tests.utils.symbols.createMixin('mixin', 'file://test/mixins.scss');

			services.storage.set('file://test/mixins.scss', {
				functions: [],
				imports: [],
				mixins: [mixin],
				variables: []
			});

			const actual = await provider.provideCompletionItems(document, position);

			assert.deepStrictEqual(actual, CompletionList.create([
				{
					label: 'mixin',
					kind: CompletionItemKind.Method,
					documentation: {
						kind: MarkupKind.Markdown,
						value: [
							'```scss',
							'// Symbol from module',
							'./mixins.scss',
							'```'
						].join('\n')
					}
				}
			]));
		});
	});
});
