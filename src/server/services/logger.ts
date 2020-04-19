export enum Severity {
	Error,
	Debug
}

export type ILoggerService = {
	setSeverity(severity: Severity): void;
	debug(message: string, context?: object): void;
};

export default class LoggerService implements ILoggerService {
	private _severity: Severity = Severity.Error;

	public setSeverity(severity: Severity): void {
		this._severity = severity;
	}

	public debug(message: string, context?: object): void {
		if (this._severity === Severity.Debug) {
			console.log(this._formatMessage(Severity.Debug, message, context));
		}
	}

	private _formatMessage(severity: Severity, message: string, context?: object): string {
		return JSON.stringify({
			severity,
			message,
			context
		});
	}
}
