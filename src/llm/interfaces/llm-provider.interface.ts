/**
 * LLM Provider Interface
 * Base interface for all LLM providers
 */

export interface LLMConfig {
	provider: string;
	apiKey?: string;
	endpoint: string;
	model: string;
	temperature?: number;
	maxTokens?: number;
	timeout?: number;
}

export interface LLMMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface LLMResponse {
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	model: string;
	finishReason: string;
}

export interface ILLMProvider {
	initialize(config: LLMConfig): Promise<void>;
	generateCompletion(messages: LLMMessage[]): Promise<LLMResponse>;
	isAvailable(): Promise<boolean>;
	getName(): string;
}
