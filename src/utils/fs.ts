import * as fs from 'fs';

export const statFile = fs.promises.stat;

export function readFile(filepath: string): Promise<string> {
	return fs.promises.readFile(filepath, { encoding: 'utf8' });
}

export function existFile(filepath: string): Promise<boolean> {
	return fs.promises.access(filepath, fs.constants.F_OK)
		.then(() => true)
		.catch(() => false);
}
