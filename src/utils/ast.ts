import { Range } from 'vscode-languageserver-textdocument';

import { Node } from '../server/types';

const NODE_OUT_OF_SCOPE = -1;

export function getNodeAtOffset(ast: Node, offset: number): Node | null {
	let candidate: Node | null = null;

	ast.accept((node) => {
		if (node.offset === NODE_OUT_OF_SCOPE && node.length === NODE_OUT_OF_SCOPE) {
			return true;
		}

		if (node.offset <= offset && node.end >= offset) {
			if (candidate === null) {
				candidate = node;
			} else if (node.length <= candidate.length) {
				candidate = node;
			}

			return true;
		}

		return false;
	});

	return candidate;
}

export function isSameLocation(left: Range, right: Range): boolean {
	if (left.start.line !== right.start.line) {
		return false;
	}

	if (left.start.character !== right.start.character) {
		return false;
	}

	if (left.end.line !== right.end.line) {
		return false;
	}

	if (left.end.character !== right.end.character) {
		return false;
	}

	return true;
}
