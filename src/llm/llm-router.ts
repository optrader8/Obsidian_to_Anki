/**
 * LLM Router
 * Routes requests to appropriate LLM providers with fallback support
 */

import { ILLMProvider, LLMMessage, LLMResponse } from './interfaces/llm-provider.interface';
import { LLMError, LLMErrorType } from './llm-error';

export class LLMRouter {
	private providers: Map<string, ILLMProvider>;
	private defaultProvider: string | null;
	private fallbackProviders: string[];
	private retryAttempts: number;
	private retryDelay: number;

	constructor() {
		this.providers = new Map();
		this.defaultProvider = null;
		this.fallbackProviders = [];
		this.retryAttempts = 3;
		this.retryDelay = 1000; // 1 second base delay
	}

	/**
	 * Register a new LLM provider
	 */
	registerProvider(name: string, provider: ILLMProvider): void {
		this.providers.set(name, provider);
		console.log(`LLM Provider registered: ${name}`);
	}

	/**
	 * Set the default provider to use
	 */
	setDefaultProvider(name: string): void {
		if (!this.providers.has(name)) {
			throw new LLMError(
				`Provider ${name} not registered`,
				LLMErrorType.INVALID_CONFIG,
				false
			);
		}
		this.defaultProvider = name;
	}

	/**
	 * Set the fallback provider chain
	 */
	setFallbackChain(providers: string[]): void {
		// Validate all providers are registered
		for (const provider of providers) {
			if (!this.providers.has(provider)) {
				throw new LLMError(
					`Provider ${provider} not registered`,
					LLMErrorType.INVALID_CONFIG,
					false
				);
			}
		}
		this.fallbackProviders = providers;
	}

	/**
	 * Set retry configuration
	 */
	setRetryConfig(attempts: number, delay: number): void {
		this.retryAttempts = attempts;
		this.retryDelay = delay;
	}

	/**
	 * Generate completion using the provider chain
	 */
	async generate(
		messages: LLMMessage[],
		preferredProvider?: string
	): Promise<LLMResponse> {
		const providerChain = this.buildProviderChain(preferredProvider);

		if (providerChain.length === 0) {
			throw new LLMError(
				'No LLM providers available',
				LLMErrorType.PROVIDER_UNAVAILABLE,
				false
			);
		}

		let lastError: LLMError | null = null;

		// Try each provider in the chain
		for (const providerName of providerChain) {
			const provider = this.providers.get(providerName);
			if (!provider) {
				continue;
			}

			console.log(`Trying LLM provider: ${providerName}`);

			try {
				// Check if provider is available
				const isAvailable = await provider.isAvailable();
				if (!isAvailable) {
					console.warn(`Provider ${providerName} is not available, skipping`);
					lastError = new LLMError(
						`Provider ${providerName} is not available`,
						LLMErrorType.PROVIDER_UNAVAILABLE,
						true,
						providerName
					);
					continue;
				}

				// Try to generate with retries
				const response = await this.generateWithRetry(provider, messages);
				console.log(`Successfully generated completion with ${providerName}`);
				return response;

			} catch (error) {
				if (error instanceof LLMError) {
					lastError = error;
					console.error(`Provider ${providerName} failed:`, error.toString());

					// If not retryable, skip to next provider
					if (!error.retryable) {
						continue;
					}

					// For retryable errors, we already tried with retries, so skip to next
					continue;
				} else {
					// Unexpected error
					lastError = new LLMError(
						`Unexpected error with provider ${providerName}: ${error.message}`,
						LLMErrorType.API_ERROR,
						false,
						providerName,
						error
					);
					console.error(`Unexpected error with ${providerName}:`, error);
					continue;
				}
			}
		}

		// All providers failed
		throw lastError || new LLMError(
			'All LLM providers failed',
			LLMErrorType.PROVIDER_UNAVAILABLE,
			false
		);
	}

	/**
	 * Generate with retry logic for transient errors
	 */
	private async generateWithRetry(
		provider: ILLMProvider,
		messages: LLMMessage[]
	): Promise<LLMResponse> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
			try {
				return await provider.generateCompletion(messages);
			} catch (error) {
				lastError = error;

				if (error instanceof LLMError) {
					// Don't retry non-retryable errors
					if (!error.retryable) {
						throw error;
					}

					// For retryable errors, wait before retrying
					if (attempt < this.retryAttempts - 1) {
						const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
						console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryAttempts})...`);
						await this.sleep(delay);
					}
				} else {
					// Unexpected errors are not retried
					throw error;
				}
			}
		}

		// All retries exhausted
		throw lastError;
	}

	/**
	 * Build the provider chain based on preferences
	 */
	private buildProviderChain(preferredProvider?: string): string[] {
		const chain: string[] = [];

		// Add preferred provider first if specified
		if (preferredProvider && this.providers.has(preferredProvider)) {
			chain.push(preferredProvider);
		}

		// Add default provider if not already in chain
		if (this.defaultProvider && !chain.includes(this.defaultProvider)) {
			chain.push(this.defaultProvider);
		}

		// Add fallback providers if not already in chain
		for (const fallback of this.fallbackProviders) {
			if (!chain.includes(fallback)) {
				chain.push(fallback);
			}
		}

		return chain;
	}

	/**
	 * Get list of registered providers
	 */
	getRegisteredProviders(): string[] {
		return Array.from(this.providers.keys());
	}

	/**
	 * Check if a provider is registered
	 */
	hasProvider(name: string): boolean {
		return this.providers.has(name);
	}

	/**
	 * Get provider instance
	 */
	getProvider(name: string): ILLMProvider | undefined {
		return this.providers.get(name);
	}

	/**
	 * Sleep helper for retry delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
