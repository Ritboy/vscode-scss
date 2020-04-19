import * as assert from 'assert';

import * as sinon from 'sinon';

import Workspace from '../workspace';
import DocumentService from '../services/document';
import ScannerService from '../services/scanner';
import LoggerService from '../services/logger';
import StorageService, { IStorageService } from '../services/storage';
import * as tests from '../../tests';
import DefinitionProvider from './definition';

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

function getProvider(services: WorkspaceServicesMock): DefinitionProvider {
	const workspace = new Workspace('file://test', services);

	return new DefinitionProvider(workspace);
}

describe('Providers → Definition', () => {
	describe('.provideReferences', () => {
		it('should return a null when the related node is undefined', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: $ }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 18);

			services.document.parse.returns(ast);

			const actual = await provider.provideReferences(document, position);

			assert.strictEqual(actual, null);
		});

		it('should return a null when the symbol reference is undefined', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { content: "value" }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 21);

			services.document.parse.returns(ast);

			const actual = await provider.provideReferences(document, position);

			assert.strictEqual(actual, null);
		});

		it('should return an empty array when the symbol does not belong to any document', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument(['.test { background-color: $bg; }']);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 28);

			services.document.parse.returns(ast);
			services.document.resolveDocumentLinks.resolves([]);

			const actual = await provider.provideReferences(document, position);

			assert.deepStrictEqual(actual, []);
		});

		it('should return an array with one variable location for the imported document', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument([
				'@use "./constants/colors";',
				'',
				'.test { background-color: $bg; }'
			]);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(2, 28);

			const variable = tests.utils.symbols.createVariable('$bg', 'file://test/constants/colors.scss');

			services.storage.set('file://test/constants/colors.scss', {
				functions: [],
				imports: [],
				mixins: [],
				variables: [variable]
			});

			services.document.parse.returns(ast);
			services.document.resolveDocumentLinks.resolves([
				{
					link: tests.utils.document.createDocumentLink('file://test/constants/colors.scss')
				}
			]);

			const expected = [
				variable.location
			];

			const actual = await provider.provideReferences(document, position);

			assert.deepStrictEqual(actual, expected);
		});

		it('should return an array with one function location for the imported document', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument([
				'@use "./functions";',
				'',
				'.test { content: pow(); }'
			]);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(2, 19);

			const func = tests.utils.symbols.createFunction('pow', 'file://test/functions.scss');

			services.storage.set('file://test/functions.scss', {
				functions: [func],
				imports: [],
				mixins: [],
				variables: []
			});

			services.document.parse.returns(ast);
			services.document.resolveDocumentLinks.resolves([
				{
					link: tests.utils.document.createDocumentLink('file://test/functions.scss')
				}
			]);

			const expected = [
				func.location
			];

			const actual = await provider.provideReferences(document, position);

			assert.deepStrictEqual(actual, expected);
		});

		it('should return an array with one mixin location for the imported document', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument([
				'@use "./mixins";',
				'',
				'.test { @include mixin(); }'
			]);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(2, 21);

			const mixin = tests.utils.symbols.createMixin('mixin', 'file://test/mixins.scss');

			services.storage.set('file://test/mixins.scss', {
				functions: [],
				imports: [],
				mixins: [mixin],
				variables: []
			});

			services.document.parse.returns(ast);
			services.document.resolveDocumentLinks.resolves([
				{
					link: tests.utils.document.createDocumentLink('file://test/mixins.scss')
				}
			]);

			const expected = [
				mixin.location
			];

			const actual = await provider.provideReferences(document, position);

			assert.deepStrictEqual(actual, expected);
		});

		it('should return an array of location items for the implicitly imported document', async () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const document = tests.utils.document.createTextDocument([
				'.test { background-color: $bg; }'
			]);
			const ast = tests.utils.document.createTextDocumentAst(document);
			const position = tests.utils.document.createPosition(0, 28);

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

			services.document.parse.returns(ast);
			services.document.resolveDocumentLinks.resolves([
				{
					link: tests.utils.document.createDocumentLink('file://test/constants/colors.scss')
				}
			]);

			const expected = [
				firstVariable.location,
				secondVariable.location
			];

			const actual = await provider.provideReferences(document, position);

			assert.deepStrictEqual(actual, expected);
		});
	});
});
