/**
 * Multi-Pass Card Generator
 * Generates cards using multiple passes for better quality
 */

import { LLMRouter } from '../llm-router';
import { PromptManager } from '../prompt-manager';
import { DocumentChunker, DocumentChunk } from '../chunking/document-chunker';
import { GeneratedCard } from '../interfaces/prompt-template.interface';

export interface DocumentPlan {
	overview: string;
	mainTopics: string[];
	sections: {
		heading: string;
		importance: number;
		estimatedCards: number;
		difficulty: number;
	}[];
	totalEstimatedCards: number;
}

export interface GenerationProgress {
	phase: 'planning' | 'analyzing' | 'generating' | 'validating' | 'completed';
	currentChunk?: number;
	totalChunks?: number;
	cardsGenerated: number;
	message: string;
}

export interface CardBatch {
	chunkId: string;
	heading: string;
	cards: GeneratedCard[];
	summary: string;
	quality: number;
}

export class MultiPassCardGenerator {
	private chunker: DocumentChunker;
	private llmRouter: LLMRouter;
	private promptManager: PromptManager;

	constructor(llmRouter: LLMRouter, promptManager: PromptManager) {
		this.chunker = new DocumentChunker();
		this.llmRouter = llmRouter;
		this.promptManager = promptManager;
		this.registerEnhancedPrompts();
	}

	/**
	 * Register enhanced prompts for multi-pass generation
	 */
	private registerEnhancedPrompts() {
		// Pass 1: Document Analysis
		this.promptManager.registerTemplate({
			name: 'analyze_document',
			description: 'Analyze document structure and create plan',
			systemPrompt: `You are an expert learning material analyst.
Your task is to analyze documents and create a strategic plan for flashcard generation.

Focus on:
- Identifying main topics and subtopics
- Assessing section importance
- Estimating appropriate number of cards
- Determining learning difficulty`,
			userPromptTemplate: `Analyze this document and create a flashcard generation plan:

{{content}}

Provide a JSON response with:
{
  "overview": "Brief overview of the document",
  "mainTopics": ["topic1", "topic2", ...],
  "sections": [
    {
      "heading": "Section title",
      "importance": 0.8,
      "estimatedCards": 3-5,
      "difficulty": 1-5
    }
  ]
}`,
			variables: ['content']
		});

		// Pass 2: Enhanced Card Generation
		this.promptManager.registerTemplate({
			name: 'generate_cards_enhanced',
			description: 'Generate cards with context and quality focus',
			systemPrompt: `You are an expert flashcard creator specializing in high-quality learning materials.

Quality Standards:
- CLARITY: Questions must be unambiguous
- ACCURACY: Answers must be factually correct
- COMPLETENESS: Answers must be comprehensive yet concise
- RELEVANCE: Focus on testable, important concepts
- DIFFICULTY: Match appropriate learning level

Card Types:
- Basic: For definitions, concepts, and facts
- Cloze: For fill-in-the-blank, especially with key terms
- Q&A: For explanations and "how/why" questions`,
			userPromptTemplate: `[DOCUMENT CONTEXT]
Overall Topic: {{documentTopic}}
Current Section: {{sectionPath}}
Previous Content Summary: {{previousSummary}}

[CONTENT TO PROCESS]
{{content}}

[TASK]
Generate high-quality flashcards from this content.

[REQUIREMENTS]
1. Focus on key concepts that deserve dedicated cards
2. Each card should test ONE clear concept
3. Questions should be specific and unambiguous
4. Answers should be accurate and complete
5. Include reasoning for each card

[OUTPUT FORMAT]
{
  "cards": [
    {
      "type": "basic|cloze|qa",
      "front": "Clear, specific question",
      "back": "Complete, accurate answer",
      "rationale": "Why this card is valuable",
      "difficulty": 1-5,
      "prerequisites": ["concepts needed to understand this"],
      "tags": ["relevant", "tags"],
      "confidence": 0.0-1.0
    }
  ],
  "sectionSummary": "Key points from this section"
}

Respond with ONLY valid JSON.`,
			variables: ['documentTopic', 'sectionPath', 'previousSummary', 'content']
		});

		// Pass 3: Card Validation
		this.promptManager.registerTemplate({
			name: 'validate_cards',
			description: 'Validate and improve generated cards',
			systemPrompt: `You are a quality assurance expert for learning materials.
Review flashcards for clarity, accuracy, and learning effectiveness.`,
			userPromptTemplate: `Review these flashcards and provide quality assessment:

{{cards}}

For each card, evaluate:
1. CLARITY: Is the question unambiguous? (0-1)
2. ACCURACY: Is the answer correct? (0-1)
3. COMPLETENESS: Is the answer sufficient? (0-1)
4. UNIQUENESS: Is it distinct from others? (0-1)
5. DIFFICULTY: Is the rating appropriate? (true/false)

Also identify:
- Duplicate or very similar cards
- Cards with unclear questions
- Cards with incomplete answers
- Improvements needed

Respond in JSON:
{
  "assessments": [
    {
      "cardIndex": 0,
      "clarity": 0.9,
      "accuracy": 1.0,
      "completeness": 0.8,
      "uniqueness": 0.9,
      "difficultyAppropriate": true,
      "overallQuality": 0.9,
      "issues": ["list of issues"],
      "suggestions": ["list of improvements"]
    }
  ],
  "duplicates": [[index1, index2]],
  "recommendations": "Overall recommendations"
}`,
			variables: ['cards']
		});
	}

	/**
	 * Generate cards with multi-pass approach
	 */
	async *generateCardsMultiPass(
		content: string,
		options?: {
			maxCards?: number;
			minQuality?: number;
		}
	): AsyncGenerator<GenerationProgress | CardBatch> {
		const maxCards = options?.maxCards || 50;
		const minQuality = options?.minQuality || 0.7;

		let totalCardsGenerated = 0;

		// PASS 1: Document Analysis
		yield {
			phase: 'planning',
			cardsGenerated: 0,
			message: 'Analyzing document structure...'
		};

		const plan = await this.analyzeDocument(content);

		// PASS 2: Chunking
		yield {
			phase: 'analyzing',
			cardsGenerated: 0,
			message: 'Breaking document into sections...'
		};

		const chunks = await this.chunker.chunkDocument(content, {
			maxTokens: 1500,
			minTokens: 200
		});

		const sortedChunks = this.prioritizeChunks(chunks);
		const overview = this.chunker.createOverview(chunks);

		// PASS 3: Generate cards for each chunk
		let previousSummary = '';

		for (let i = 0; i < sortedChunks.length && totalCardsGenerated < maxCards; i++) {
			const chunk = sortedChunks[i];

			yield {
				phase: 'generating',
				currentChunk: i + 1,
				totalChunks: sortedChunks.length,
				cardsGenerated: totalCardsGenerated,
				message: `Generating cards for: ${chunk.metadata.heading}`
			};

			try {
				const batch = await this.generateCardsForChunk(
					chunk,
					{
						documentTopic: plan.overview,
						previousSummary: previousSummary,
						overview: overview
					}
				);

				previousSummary = batch.summary;
				totalCardsGenerated += batch.cards.length;

				yield batch;

				// Stop if we've generated enough cards
				if (totalCardsGenerated >= maxCards) {
					break;
				}

			} catch (error) {
				console.error(`Error generating cards for chunk ${chunk.id}:`, error);
				// Continue with next chunk
			}
		}

		// PASS 4: Final validation (optional, can be done on-demand)
		yield {
			phase: 'completed',
			cardsGenerated: totalCardsGenerated,
			message: `Generated ${totalCardsGenerated} cards successfully!`
		};
	}

	/**
	 * Pass 1: Analyze document and create plan
	 */
	private async analyzeDocument(content: string): Promise<DocumentPlan> {
		try {
			// For very long documents, analyze a summary
			const analysisContent = content.length > 10000
				? this.createDocumentSummary(content)
				: content;

			const messages = this.promptManager.renderPrompt('analyze_document', {
				content: analysisContent
			});

			const response = await this.llmRouter.generate(messages);
			const plan = this.parseAnalysisResponse(response.content);

			return plan;

		} catch (error) {
			console.error('Error analyzing document:', error);
			// Return default plan
			return {
				overview: 'Document analysis',
				mainTopics: [],
				sections: [],
				totalEstimatedCards: 10
			};
		}
	}

	/**
	 * Pass 2: Generate cards for a single chunk
	 */
	private async generateCardsForChunk(
		chunk: DocumentChunk,
		context: {
			documentTopic: string;
			previousSummary: string;
			overview: string;
		}
	): Promise<CardBatch> {
		const messages = this.promptManager.renderPrompt('generate_cards_enhanced', {
			documentTopic: context.documentTopic,
			sectionPath: chunk.metadata.heading,
			previousSummary: context.previousSummary || 'This is the first section.',
			content: chunk.content
		});

		const response = await this.llmRouter.generate(messages);
		const result = this.parseCardResponse(response.content);

		return {
			chunkId: chunk.id,
			heading: chunk.metadata.heading,
			cards: result.cards,
			summary: result.sectionSummary || '',
			quality: this.calculateBatchQuality(result.cards)
		};
	}

	/**
	 * Prioritize chunks by importance
	 */
	private prioritizeChunks(chunks: DocumentChunk[]): DocumentChunk[] {
		return chunks.sort((a, b) => {
			// Sort by importance descending
			return b.metadata.importance - a.metadata.importance;
		});
	}

	/**
	 * Create document summary for analysis
	 */
	private createDocumentSummary(content: string): string {
		const lines = content.split('\n');
		const headings: string[] = [];
		const samples: string[] = [];

		for (const line of lines) {
			if (line.match(/^#{1,6}\s+/)) {
				headings.push(line);
			} else if (samples.length < 10 && line.trim().length > 50) {
				samples.push(line);
			}
		}

		return `${headings.join('\n')}\n\n${samples.join('\n')}`;
	}

	/**
	 * Parse analysis response
	 */
	private parseAnalysisResponse(response: string): DocumentPlan {
		try {
			const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
			const jsonStr = jsonMatch ? jsonMatch[1] : response;
			const parsed = JSON.parse(jsonStr);

			return {
				overview: parsed.overview || 'Document',
				mainTopics: parsed.mainTopics || [],
				sections: parsed.sections || [],
				totalEstimatedCards: parsed.sections?.reduce(
					(sum: number, s: any) => sum + (s.estimatedCards || 3),
					0
				) || 10
			};
		} catch (error) {
			console.error('Error parsing analysis:', error);
			return {
				overview: 'Document',
				mainTopics: [],
				sections: [],
				totalEstimatedCards: 10
			};
		}
	}

	/**
	 * Parse card generation response
	 */
	private parseCardResponse(response: string): {
		cards: GeneratedCard[];
		sectionSummary: string;
	} {
		try {
			const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
			const jsonStr = jsonMatch ? jsonMatch[1] : response;
			const parsed = JSON.parse(jsonStr);

			const cards: GeneratedCard[] = (parsed.cards || []).map((card: any) => ({
				type: card.type || 'basic',
				front: card.front || '',
				back: card.back || '',
				tags: card.tags || [],
				confidence: card.confidence || 0.8,
				// Store additional metadata
				...card
			}));

			return {
				cards: cards,
				sectionSummary: parsed.sectionSummary || ''
			};

		} catch (error) {
			console.error('Error parsing card response:', error);
			return {
				cards: [],
				sectionSummary: ''
			};
		}
	}

	/**
	 * Calculate quality score for a batch of cards
	 */
	private calculateBatchQuality(cards: GeneratedCard[]): number {
		if (cards.length === 0) return 0;

		const avgConfidence = cards.reduce(
			(sum, card) => sum + (card.confidence || 0.8),
			0
		) / cards.length;

		// Penalize if too few or too many cards
		const countPenalty = cards.length < 2 ? 0.8 : cards.length > 10 ? 0.9 : 1.0;

		return avgConfidence * countPenalty;
	}

	/**
	 * Validate generated cards (Pass 3)
	 */
	async validateCards(cards: GeneratedCard[]): Promise<{
		scores: number[];
		issues: string[][];
		overall: number;
	}> {
		try {
			const messages = this.promptManager.renderPrompt('validate_cards', {
				cards: JSON.stringify(cards, null, 2)
			});

			const response = await this.llmRouter.generate(messages);
			const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
			const jsonStr = jsonMatch ? jsonMatch[1] : response.content;
			const result = JSON.parse(jsonStr);

			const scores = (result.assessments || []).map((a: any) => a.overallQuality || 0.8);
			const issues = (result.assessments || []).map((a: any) => a.issues || []);
			const overall = scores.length > 0
				? scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length
				: 0.8;

			return { scores, issues, overall };

		} catch (error) {
			console.error('Error validating cards:', error);
			return {
				scores: cards.map(() => 0.8),
				issues: cards.map(() => []),
				overall: 0.8
			};
		}
	}
}
