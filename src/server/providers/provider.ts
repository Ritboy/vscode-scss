import { TextDocument, Position } from 'vscode-languageserver-textdocument';

import Workspace from '../workspace';
import { Node, SymbolType, NodeType } from '../types';
import * as utils from '../../utils';

type SymbolReference = {
	name: string;
	type: SymbolType;
};

export default class Provider {
	constructor(protected readonly _workspace: Workspace) { }

	protected _findRelatedNode(document: TextDocument, position: Position): Node | null {
		const offset = document.offsetAt(position);
		const ast = this._workspace.services.document.parse(document);
		const node = utils.ast.getNodeAtOffset(ast as Node, offset);

		return node;
	}

	protected _getSymbolReferenceForNode(node: Node): SymbolReference | null {
		if (node.type === NodeType.VariableName) {
			return {
				name: node.getName(),
				type: SymbolType.Variable
			};
		}

		if (node.type === NodeType.Identifier) {
			const parent = node.getParent();

			if (parent?.type === NodeType.Function) {
				return {
					name: parent.getName(),
					type: SymbolType.Function
				};
			}

			if (parent?.type === NodeType.MixinReference) {
				return {
					name: parent.getName(),
					type: SymbolType.Mixin
				};
			}
		}

		return null;
	}
}
