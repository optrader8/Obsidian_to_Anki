/**
 * LLM Error Types and Error Class
 * Handles various error scenarios in LLM operations
 */

export enum LLMErrorType {
	PROVIDER_UNAVAILABLE = 'provider_unavailable',
	API_ERROR = 'api_error',
	TIMEOUT = 'timeout',
	PARSE_ERROR = 'parse_error',
	RATE_LIMIT = 'rate_limit',
	INVALID_CONFIG = 'invalid_config',
	NETWORK_ERROR = 'network_error',
	AUTHENTICATION_ERROR = 'authentication_error'
}

export class LLMError extends Error {
	type: LLMErrorType;
	provider?: string;
	retryable: boolean;
	originalError?: Error;

	constructor(
		message: string,
		type: LLMErrorType,
		retryable: boolean = false,
		provider?: string,
		originalError?: Error
	) {
		super(message);
		this.name = 'LLMError';
		this.type = type;
		this.retryable = retryable;
		this.provider = provider;
		this.originalError = originalError;
	}

	toString(): string {
		let result = `${this.name} [${this.type}]: ${this.message}`;
		if (this.provider) {
			result += ` (Provider: ${this.provider})`;
		}
		if (this.retryable) {
			result += ' [Retryable]';
		}
		return result;
	}
}
