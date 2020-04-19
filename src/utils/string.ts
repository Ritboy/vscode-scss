const TWITTER_STRING_LIMIT = 140;

export function getLimitedString(input?: string, ellipsis: boolean = true): string {
	if (input === undefined) {
		return 'null';
	}

	// Twitter <3
	if (input.length < TWITTER_STRING_LIMIT) {
		return input;
	}

	return input.slice(0, TWITTER_STRING_LIMIT) + (ellipsis ? '\u2026' : '');
}
