import * as assert from 'assert';

import * as sinon from 'sinon';
import { Hover, MarkupKind } from 'vscode-languageserver';

import Workspace from '../workspace';
import DocumentService from '../services/document';
import ScannerService from '../services/scanner';
import LoggerService from '../services/logger';
import StorageService, { IStorageService } from '../services/storage';
import * as tests from '../../tests';
import HoverProvider from './hover';

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

function getProvider(services: WorkspaceServicesMock): HoverProvider {
	const workspace = new Workspace('file://test', services);

	return new HoverProvider(workspace);
}

describe('Providers → Completion', () => {
	describe('.provideHover', () => {
		it('should return a null when the related node is undefined', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $ }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 18);

			services.document.parse.returns(ast);

			const actual = await provider.provideHover(document, position);

			assert.strictEqual(actual, null);
		});

		it('should return a null when the symbol reference is undefined', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: "value" }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 21);

			services.document.parse.returns(ast);

			const actual = await provider.provideHover(document, position);

			assert.strictEqual(actual, null);
		});
		it('should return a content with one variable imported from module', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $bg }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 19);

			services.document.parse.returns(ast);
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

			const expected: Hover = {
				contents: {
					kind: MarkupKind.Markdown,
					value: [
						'```scss',
						'// Symbol from module',
						'./constants/colors.scss',
						'```',
						''
					].join('\n')
				}
			};

			const actual = await provider.provideHover(document, position);

			assert.deepStrictEqual(actual, expected);
		});

		it('should return a completion list with one implicitly variable', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $bg }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 19);

			services.document.parse.returns(ast);
			services.document.resolveDocumentLinks.resolves([]);

			const variable = tests.utils.symbols.createVariable('$bg', 'file://test/constants/colors.scss');

			services.storage.set('file://test/constants/colors.scss', {
				functions: [],
				imports: [],
				mixins: [],
				variables: [variable]
			});

			const expected: Hover = {
				contents: {
					kind: MarkupKind.Markdown,
					value: [
						'```scss',
						'// Implicitly',
						'./constants/colors.scss',
						'```',
						''
					].join('\n')
				}
			};

			const actual = await provider.provideHover(document, position);

			assert.deepStrictEqual(actual, expected);
		});

		it('should return a completion list with two implicitly variables', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $bg }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 19);

			services.document.parse.returns(ast);
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

			const expected: Hover = {
				contents: {
					kind: MarkupKind.Markdown,
					value: [
						'```scss',
						'// Implicitly',
						'./constants/production/color.scss',
						'```',
						'```scss',
						'// Implicitly',
						'./constants/development/color.scss',
						'```',
						''
					].join('\n')
				}
			};

			const actual = await provider.provideHover(document, position);

			assert.deepStrictEqual(actual, expected);
		});

		it('should return a completion list with one function', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: pow() }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 19);

			services.document.parse.returns(ast);
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

			const expected: Hover = {
				contents: {
					kind: MarkupKind.Markdown,
					value: [
						'```scss',
						'// Symbol from module',
						'./functions.scss',
						'```',
						''
					].join('\n')
				}
			};

			const actual = await provider.provideHover(document, position);

			assert.deepStrictEqual(actual, expected);
		});

		it('should return a completion list with one mixin', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { @include mixin(); }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 20);

			services.document.parse.returns(ast);
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

			const expected: Hover = {
				contents: {
					kind: MarkupKind.Markdown,
					value: [
						'```scss',
						'// Symbol from module',
						'./mixins.scss',
						'```',
						''
					].join('\n')
				}
			};

			const actual = await provider.provideHover(document, position);

			assert.deepStrictEqual(actual, expected);
		});
	});
});
