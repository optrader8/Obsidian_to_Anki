/**
 * LLM Module Exports
 * Central export point for all LLM functionality
 */

// Import for use in this file
import { LLMRouter as _LLMRouter } from './llm-router';
import { PromptManager as _PromptManager } from './prompt-manager';
import { SmartCardGenerator as _SmartCardGenerator } from './card-generator';
import { OpenAICompatibleProvider as _OpenAICompatibleProvider } from './providers/openai-compatible-provider';

// Core components
export { LLMRouter } from './llm-router';
export { PromptManager } from './prompt-manager';
export { ContentAnalyzer } from './content-analyzer';
export { SmartCardGenerator } from './card-generator';
export type { CardGenerationOptions } from './card-generator';

// Providers
export { OpenAICompatibleProvider } from './providers/openai-compatible-provider';

// Interfaces
export type {
	ILLMProvider,
	LLMConfig,
	LLMMessage,
	LLMResponse
} from './interfaces/llm-provider.interface';

export type {
	PromptTemplate,
	GeneratedCard
} from './interfaces/prompt-template.interface';

export type {
	ContentSection,
	AnalysisResult
} from './interfaces/content-section.interface';

// Error handling
export { LLMError, LLMErrorType } from './llm-error';

/**
 * Create and initialize LLM system from settings
 */
export async function createLLMSystem(
	llmSettings: any
): Promise<{ router: _LLMRouter; generator: _SmartCardGenerator } | null> {
	if (!llmSettings || !llmSettings.enabled) {
		return null;
	}

	const router = new _LLMRouter();
	const promptManager = new _PromptManager();

	// Initialize providers from settings
	if (llmSettings.providers && llmSettings.providers.length > 0) {
		for (const providerConfig of llmSettings.providers) {
			if (!providerConfig.enabled) continue;

			const provider = new _OpenAICompatibleProvider();
			await provider.initialize({
				provider: providerConfig.name,
				endpoint: providerConfig.endpoint,
				apiKey: providerConfig.apiKey,
				model: providerConfig.model,
				temperature: llmSettings.temperature,
				maxTokens: llmSettings.maxTokens,
				timeout: llmSettings.timeout
			});

			router.registerProvider(providerConfig.name, provider);
		}

		// Set default provider
		if (llmSettings.defaultProvider) {
			router.setDefaultProvider(llmSettings.defaultProvider);
		}

		// Set fallback chain
		if (llmSettings.fallbackChain && llmSettings.fallbackChain.length > 0) {
			router.setFallbackChain(llmSettings.fallbackChain);
		}
	}

	const generator = new _SmartCardGenerator(router, promptManager);

	return { router, generator };
}
