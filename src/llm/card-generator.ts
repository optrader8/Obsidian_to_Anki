/**
 * Smart Card Generator
 * Generates flashcards using LLM
 */

import { LLMRouter } from './llm-router';
import { PromptManager } from './prompt-manager';
import { ContentAnalyzer } from './content-analyzer';
import { GeneratedCard } from './interfaces/prompt-template.interface';
import { ContentSection } from './interfaces/content-section.interface';
import { LLMError, LLMErrorType } from './llm-error';

export interface CardGenerationOptions {
	maxCards?: number;
	preferredTypes?: string[];
	context?: string;
	useAnalyzer?: boolean;
	threshold?: number;
}

export class SmartCardGenerator {
	private llmRouter: LLMRouter;
	private promptManager: PromptManager;
	private contentAnalyzer: ContentAnalyzer;

	constructor(llmRouter: LLMRouter, promptManager: PromptManager) {
		this.llmRouter = llmRouter;
		this.promptManager = promptManager;
		this.contentAnalyzer = new ContentAnalyzer();
	}

	/**
	 * Generate flashcards from markdown content
	 */
	async generateCards(
		content: string,
		options?: CardGenerationOptions
	): Promise<GeneratedCard[]> {
		// Analyze content if requested
		let sectionsToProcess: string[] = [content];

		if (options?.useAnalyzer) {
			const analysis = this.contentAnalyzer.analyzeMarkdown(content);
			const candidates = analysis.candidateSections;

			if (candidates.length > 0) {
				sectionsToProcess = candidates.map(section => {
					const context = this.contentAnalyzer.getContext(section, analysis.sections);
					return context ? `${context}\n\n${section.content}` : section.content;
				});

				// Limit sections if maxCards specified
				if (options.maxCards) {
					sectionsToProcess = sectionsToProcess.slice(0, options.maxCards);
				}
			}
		}

		// Generate cards for each section
		const allCards: GeneratedCard[] = [];

		for (const section of sectionsToProcess) {
			try {
				const cards = await this.generateCardsFromSection(section, options);
				allCards.push(...cards);

				// Stop if we've reached max cards
				if (options?.maxCards && allCards.length >= options.maxCards) {
					break;
				}
			} catch (error) {
				console.error('Failed to generate cards for section:', error);
				// Continue with other sections
			}
		}

		// Limit to max cards if specified
		if (options?.maxCards) {
			return allCards.slice(0, options.maxCards);
		}

		return allCards;
	}

	/**
	 * Generate cards from a single section
	 */
	private async generateCardsFromSection(
		content: string,
		options?: CardGenerationOptions
	): Promise<GeneratedCard[]> {
		// Choose template based on preferred types
		let templateName = 'generate_cards';
		if (options?.preferredTypes && options.preferredTypes.length > 0) {
			const preferredType = options.preferredTypes[0];
			if (preferredType === 'cloze') {
				templateName = 'generate_cloze';
			} else if (preferredType === 'qa') {
				templateName = 'generate_qa';
			}
		}

		// Render prompt
		const messages = this.promptManager.renderPrompt(templateName, {
			content: content
		});

		// Generate with LLM
		const response = await this.llmRouter.generate(messages);

		// Parse response
		return this.parseCardResponse(response.content);
	}

	/**
	 * Generate answer for a question
	 */
	async generateAnswer(
		question: string,
		context?: string
	): Promise<string> {
		const messages = this.promptManager.renderPrompt('generate_answer', {
			question: question,
			context: context || 'No additional context provided.'
		});

		const response = await this.llmRouter.generate(messages);
		return response.content.trim();
	}

	/**
	 * Improve an existing card
	 */
	async improveCard(
		front: string,
		back: string
	): Promise<{ front: string; back: string; improvements?: string }> {
		const messages = this.promptManager.renderPrompt('improve_card', {
			front: front,
			back: back
		});

		const response = await this.llmRouter.generate(messages);
		return this.parseImprovedCard(response.content);
	}

	/**
	 * Batch generate cards for multiple contents
	 */
	async batchGenerateCards(
		contents: string[],
		options?: CardGenerationOptions
	): Promise<GeneratedCard[][]> {
		const results: GeneratedCard[][] = [];

		for (const content of contents) {
			try {
				const cards = await this.generateCards(content, options);
				results.push(cards);
			} catch (error) {
				console.error('Failed to generate cards for content:', error);
				results.push([]);
			}
		}

		return results;
	}

	/**
	 * Parse card generation response from LLM
	 */
	private parseCardResponse(response: string): GeneratedCard[] {
		try {
			// Try to extract JSON from markdown code block
			let jsonContent = response;

			const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
			if (jsonBlockMatch) {
				jsonContent = jsonBlockMatch[1];
			}

			// Try to parse as JSON array
			const parsed = JSON.parse(jsonContent);

			if (!Array.isArray(parsed)) {
				throw new Error('Response is not an array');
			}

			// Validate and normalize cards
			const cards: GeneratedCard[] = [];
			for (const card of parsed) {
				if (this.isValidCard(card)) {
					cards.push({
						type: card.type || 'basic',
						front: card.front || '',
						back: card.back || '',
						tags: card.tags || [],
						confidence: card.confidence || 0.8
					});
				}
			}

			return cards;

		} catch (error) {
			console.error('Failed to parse card response:', error);
			console.error('Response content:', response);

			throw new LLMError(
				`Failed to parse card response: ${error.message}`,
				LLMErrorType.PARSE_ERROR,
				false
			);
		}
	}

	/**
	 * Validate card structure
	 */
	private isValidCard(card: any): boolean {
		if (typeof card !== 'object' || card === null) {
			return false;
		}

		// Must have front and back (or text for cloze)
		if (card.type === 'cloze') {
			return typeof card.text === 'string' && card.text.length > 0;
		} else {
			return typeof card.front === 'string' &&
			       typeof card.back === 'string' &&
			       card.front.length > 0 &&
			       card.back.length > 0;
		}
	}

	/**
	 * Parse improved card response
	 */
	private parseImprovedCard(response: string): { front: string; back: string; improvements?: string } {
		try {
			// Extract JSON from response
			let jsonContent = response;

			const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
			if (jsonBlockMatch) {
				jsonContent = jsonBlockMatch[1];
			}

			const parsed = JSON.parse(jsonContent);

			return {
				front: parsed.front || '',
				back: parsed.back || '',
				improvements: parsed.improvements || undefined
			};

		} catch (error) {
			// Fallback: try to extract from text format
			const lines = response.split('\n');
			let front = '';
			let back = '';
			let currentSection = '';

			for (const line of lines) {
				const lowerLine = line.toLowerCase();
				if (lowerLine.includes('front:')) {
					currentSection = 'front';
					front = line.substring(line.indexOf(':') + 1).trim();
				} else if (lowerLine.includes('back:')) {
					currentSection = 'back';
					back = line.substring(line.indexOf(':') + 1).trim();
				} else if (currentSection === 'front' && line.trim()) {
					front += ' ' + line.trim();
				} else if (currentSection === 'back' && line.trim()) {
					back += ' ' + line.trim();
				}
			}

			if (front && back) {
				return { front: front.trim(), back: back.trim() };
			}

			throw new LLMError(
				'Failed to parse improved card response',
				LLMErrorType.PARSE_ERROR,
				false
			);
		}
	}

	/**
	 * Estimate number of cards that could be generated from content
	 */
	estimateCardCount(content: string): number {
		const analysis = this.contentAnalyzer.analyzeMarkdown(content);
		return analysis.highPotentialCount;
	}

	/**
	 * Get content analysis
	 */
	analyzeContent(content: string) {
		return this.contentAnalyzer.analyzeMarkdown(content);
	}
}
