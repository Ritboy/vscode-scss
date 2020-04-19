export async function runSafe<T>(executor: () => Promise<T>, message: string): Promise<T | undefined> {
	return executor()
		.catch((error: Error) => {
			console.error(`${message}:${error.message}\n${error.stack}`);

			return undefined;
		});
}
