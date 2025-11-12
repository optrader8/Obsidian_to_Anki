/**
 * OpenAI Compatible Provider
 * Supports any OpenAI-compatible API (Ollama, LM Studio, OpenRouter, OpenAI, etc.)
 */

import { ILLMProvider, LLMConfig, LLMMessage, LLMResponse } from '../interfaces/llm-provider.interface';
import { LLMError, LLMErrorType } from '../llm-error';
import { requestUrl, RequestUrlParam } from 'obsidian';

export class OpenAICompatibleProvider implements ILLMProvider {
	private config: LLMConfig;

	async initialize(config: LLMConfig): Promise<void> {
		this.config = config;

		// Validate required config
		if (!config.endpoint) {
			throw new LLMError(
				'Endpoint is required',
				LLMErrorType.INVALID_CONFIG,
				false,
				config.provider
			);
		}

		if (!config.model) {
			throw new LLMError(
				'Model is required',
				LLMErrorType.INVALID_CONFIG,
				false,
				config.provider
			);
		}

		// Test availability
		const available = await this.isAvailable();
		if (!available) {
			console.warn(`Provider ${config.provider} may not be available`);
		}
	}

	async generateCompletion(messages: LLMMessage[]): Promise<LLMResponse> {
		if (!this.config) {
			throw new LLMError(
				'Provider not initialized',
				LLMErrorType.INVALID_CONFIG,
				false
			);
		}

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Add API key if provided
		if (this.config.apiKey) {
			headers['Authorization'] = `Bearer ${this.config.apiKey}`;
		}

		const payload = {
			model: this.config.model,
			messages: messages,
			temperature: this.config.temperature ?? 0.7,
			max_tokens: this.config.maxTokens ?? 2000,
		};

		try {
			const requestParam: RequestUrlParam = {
				url: this.config.endpoint,
				method: 'POST',
				headers: headers,
				body: JSON.stringify(payload),
				throw: false,
			};

			const response = await requestUrl(requestParam);

			if (response.status !== 200) {
				// Handle specific error codes
				if (response.status === 401 || response.status === 403) {
					throw new LLMError(
						`Authentication failed: ${response.status}`,
						LLMErrorType.AUTHENTICATION_ERROR,
						false,
						this.config.provider
					);
				} else if (response.status === 429) {
					throw new LLMError(
						'Rate limit exceeded',
						LLMErrorType.RATE_LIMIT,
						true,
						this.config.provider
					);
				} else if (response.status >= 500) {
					throw new LLMError(
						`Server error: ${response.status}`,
						LLMErrorType.API_ERROR,
						true,
						this.config.provider
					);
				} else {
					throw new LLMError(
						`API error: ${response.status} - ${response.text}`,
						LLMErrorType.API_ERROR,
						false,
						this.config.provider
					);
				}
			}

			const data = response.json;
			return this.parseResponse(data);

		} catch (error) {
			if (error instanceof LLMError) {
				throw error;
			}

			// Network or other errors
			throw new LLMError(
				`Failed to generate completion: ${error.message}`,
				LLMErrorType.NETWORK_ERROR,
				true,
				this.config.provider,
				error
			);
		}
	}

	async isAvailable(): Promise<boolean> {
		if (!this.config || !this.config.endpoint) {
			return false;
		}

		try {
			// Try to reach the endpoint
			const testEndpoint = this.config.endpoint.replace('/chat/completions', '/models');

			const headers: Record<string, string> = {};
			if (this.config.apiKey) {
				headers['Authorization'] = `Bearer ${this.config.apiKey}`;
			}

			const requestParam: RequestUrlParam = {
				url: testEndpoint,
				method: 'GET',
				headers: headers,
				throw: false,
			};

			const response = await requestUrl(requestParam);

			// Accept 200, 404 (some APIs don't support /models), or 405 (method not allowed)
			return response.status === 200 || response.status === 404 || response.status === 405;

		} catch (error) {
			// If we can't connect, try the main endpoint with a minimal request
			try {
				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};
				if (this.config.apiKey) {
					headers['Authorization'] = `Bearer ${this.config.apiKey}`;
				}

				const requestParam: RequestUrlParam = {
					url: this.config.endpoint,
					method: 'POST',
					headers: headers,
					body: JSON.stringify({
						model: this.config.model,
						messages: [{ role: 'user', content: 'test' }],
						max_tokens: 1,
					}),
					throw: false,
				};

				const response = await requestUrl(requestParam);
				return response.status !== 404;

			} catch (finalError) {
				return false;
			}
		}
	}

	getName(): string {
		return this.config?.provider || 'openai-compatible';
	}

	private parseResponse(data: any): LLMResponse {
		try {
			if (!data.choices || !data.choices[0] || !data.choices[0].message) {
				throw new Error('Invalid response format: missing choices or message');
			}

			return {
				content: data.choices[0].message.content,
				usage: {
					promptTokens: data.usage?.prompt_tokens || 0,
					completionTokens: data.usage?.completion_tokens || 0,
					totalTokens: data.usage?.total_tokens || 0,
				},
				model: data.model || this.config.model,
				finishReason: data.choices[0].finish_reason || 'stop',
			};

		} catch (error) {
			throw new LLMError(
				`Failed to parse response: ${error.message}`,
				LLMErrorType.PARSE_ERROR,
				false,
				this.config.provider
			);
		}
	}
}
