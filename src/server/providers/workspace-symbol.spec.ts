import * as assert from 'assert';

import * as sinon from 'sinon';

import Workspace from '../workspace';
import DocumentService from '../services/document';
import ScannerService from '../services/scanner';
import LoggerService from '../services/logger';
import StorageService, { IStorageService } from '../services/storage';
import * as tests from '../../tests';
import WorkspaceSymbolProvider from './workspace-symbol';

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

function getProvider(services: WorkspaceServicesMock): WorkspaceSymbolProvider {
	const workspace = new Workspace('file://test', services);

	return new WorkspaceSymbolProvider(workspace);
}

describe('Providers → Workspace Symbol', () => {
	describe('.resolveWorkspaceSymbol', () => {
		it('should return an empty array', () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const actual = provider.resolveWorkspaceSymbol('');

			assert.deepStrictEqual(actual, []);
		});

		it('should return all symbols when the query is an empty string', () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const variable = tests.utils.symbols.createVariable('$bg', 'file://test/helpers.scss');
			const func = tests.utils.symbols.createFunction('pow', 'file://test/helpers.scss');
			const mixin = tests.utils.symbols.createMixin('reset-list', 'file://test/helpers.scss');

			services.storage.set('file://test/file.scss', {
				functions: [func],
				imports: [],
				mixins: [mixin],
				variables: [variable]
			});

			const actual = provider.resolveWorkspaceSymbol('');

			assert.deepStrictEqual(actual, [variable, func, mixin]);
		});

		it('should return symbols starts with variable name', () => {
			const services = getWorkspaceServicesMock();
			const provider = getProvider(services);

			const variable = tests.utils.symbols.createVariable('$bg', 'file://test/helpers.scss');
			const func = tests.utils.symbols.createFunction('pow', 'file://test/helpers.scss');
			const mixin = tests.utils.symbols.createMixin('reset-list', 'file://test/helpers.scss');

			services.storage.set('file://test/file.scss', {
				functions: [func],
				imports: [],
				mixins: [mixin],
				variables: [variable]
			});

			const actual = provider.resolveWorkspaceSymbol('$b');

			assert.deepStrictEqual(actual, [variable]);
		});
	});
});
