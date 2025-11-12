/**
 * Document Chunker
 * Intelligently splits long documents into manageable chunks
 */

export interface DocumentChunk {
	id: string;
	content: string;
	metadata: {
		index: number;
		level: number;
		heading: string;
		parent?: string;
		tokenCount: number;
		importance: number;
		keywords: string[];
		startLine?: number;
		endLine?: number;
	};
}

export interface ChunkingOptions {
	maxTokens?: number;
	minTokens?: number;
	preserveHeadings?: boolean;
	preserveCodeBlocks?: boolean;
	overlapTokens?: number;
}

export class DocumentChunker {
	private readonly DEFAULT_MAX_TOKENS = 1500;
	private readonly DEFAULT_MIN_TOKENS = 200;
	private readonly DEFAULT_OVERLAP = 100;

	/**
	 * Chunk document intelligently based on structure
	 */
	async chunkDocument(
		content: string,
		options?: ChunkingOptions
	): Promise<DocumentChunk[]> {
		const maxTokens = options?.maxTokens || this.DEFAULT_MAX_TOKENS;
		const minTokens = options?.minTokens || this.DEFAULT_MIN_TOKENS;

		const chunks: DocumentChunk[] = [];
		const lines = content.split('\n');

		let currentChunk: string[] = [];
		let currentHeading = 'Introduction';
		let currentLevel = 0;
		let chunkIndex = 0;
		let lineIndex = 0;
		let startLine = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			lineIndex = i;

			// Check if this is a heading
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headingMatch) {
				// Save current chunk if it has content
				if (currentChunk.length > 0) {
					const chunkContent = currentChunk.join('\n');
					const tokenCount = this.estimateTokens(chunkContent);

					if (tokenCount >= minTokens) {
						chunks.push({
							id: `chunk-${chunkIndex}`,
							content: chunkContent,
							metadata: {
								index: chunkIndex,
								level: currentLevel,
								heading: currentHeading,
								tokenCount: tokenCount,
								importance: this.calculateImportance(chunkContent, currentLevel),
								keywords: this.extractKeywords(chunkContent),
								startLine: startLine,
								endLine: i - 1
							}
						});
						chunkIndex++;
					}

					currentChunk = [];
					startLine = i;
				}

				// Start new chunk with this heading
				currentLevel = headingMatch[1].length;
				currentHeading = headingMatch[2].trim();
				currentChunk.push(line);
			} else {
				// Add line to current chunk
				currentChunk.push(line);

				// Check if chunk is getting too large
				const currentContent = currentChunk.join('\n');
				const tokenCount = this.estimateTokens(currentContent);

				if (tokenCount >= maxTokens) {
					// Try to find a good split point
					const splitPoint = this.findSplitPoint(currentChunk);

					if (splitPoint > 0) {
						const beforeSplit = currentChunk.slice(0, splitPoint).join('\n');
						const afterSplit = currentChunk.slice(splitPoint);

						chunks.push({
							id: `chunk-${chunkIndex}`,
							content: beforeSplit,
							metadata: {
								index: chunkIndex,
								level: currentLevel,
								heading: currentHeading,
								tokenCount: this.estimateTokens(beforeSplit),
								importance: this.calculateImportance(beforeSplit, currentLevel),
								keywords: this.extractKeywords(beforeSplit),
								startLine: startLine,
								endLine: startLine + splitPoint - 1
							}
						});
						chunkIndex++;

						currentChunk = afterSplit;
						startLine = startLine + splitPoint;
					}
				}
			}
		}

		// Add final chunk
		if (currentChunk.length > 0) {
			const chunkContent = currentChunk.join('\n');
			const tokenCount = this.estimateTokens(chunkContent);

			if (tokenCount >= minTokens / 2) { // Be more lenient for final chunk
				chunks.push({
					id: `chunk-${chunkIndex}`,
					content: chunkContent,
					metadata: {
						index: chunkIndex,
						level: currentLevel,
						heading: currentHeading,
						tokenCount: tokenCount,
						importance: this.calculateImportance(chunkContent, currentLevel),
						keywords: this.extractKeywords(chunkContent),
						startLine: startLine,
						endLine: lines.length - 1
					}
				});
			}
		}

		return chunks;
	}

	/**
	 * Estimate token count (rough approximation)
	 */
	private estimateTokens(text: string): number {
		// Rough estimate: 1 token ≈ 4 characters
		// More accurate for English, less for other languages
		return Math.ceil(text.length / 4);
	}

	/**
	 * Calculate importance score based on content and position
	 */
	private calculateImportance(content: string, level: number): number {
		let score = 0.5; // Base score

		// Higher level headings are more important
		score += (6 - level) * 0.05;

		// Content with definitions is important
		if (content.match(/is defined as|refers to|means|이란|의미는/i)) {
			score += 0.15;
		}

		// Content with lists is important
		if (content.match(/^[\s]*[-*+]\s/m)) {
			score += 0.1;
		}

		// Content with code blocks
		if (content.match(/```/)) {
			score += 0.1;
		}

		// Content with emphasis
		const emphasisCount = (content.match(/\*\*.*?\*\*|__.*?__|==.*?==/g) || []).length;
		score += Math.min(emphasisCount * 0.02, 0.1);

		// Keywords indicating important content
		const importantKeywords = [
			'important', 'key', 'crucial', 'essential', 'fundamental',
			'중요', '핵심', '필수', '기본'
		];
		for (const keyword of importantKeywords) {
			if (content.toLowerCase().includes(keyword)) {
				score += 0.05;
			}
		}

		return Math.min(score, 1.0);
	}

	/**
	 * Extract keywords from content
	 */
	private extractKeywords(content: string): string[] {
		const keywords: Set<string> = new Set();

		// Extract words from emphasis
		const emphasized = content.match(/\*\*(.*?)\*\*|__(.*?)__|==(.*?)==/g) || [];
		emphasized.forEach(match => {
			const cleaned = match.replace(/[\*_=]/g, '').trim();
			if (cleaned.length > 2) {
				keywords.add(cleaned);
			}
		});

		// Extract from code blocks (language names, function names)
		const codeBlocks = content.match(/```(\w+)?/g) || [];
		codeBlocks.forEach(match => {
			const lang = match.replace(/```/, '').trim();
			if (lang) {
				keywords.add(lang);
			}
		});

		// Extract capitalized words (likely important terms)
		const capitalized = content.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
		capitalized.forEach(word => {
			if (word.length > 3) {
				keywords.add(word);
			}
		});

		return Array.from(keywords).slice(0, 10); // Limit to 10 keywords
	}

	/**
	 * Find a good split point in the chunk
	 */
	private findSplitPoint(lines: string[]): number {
		// Try to split at paragraph boundaries (empty lines)
		for (let i = lines.length - 1; i > lines.length / 2; i--) {
			if (lines[i].trim() === '') {
				return i;
			}
		}

		// Try to split at sentence boundaries
		for (let i = lines.length - 1; i > lines.length / 2; i--) {
			const line = lines[i];
			if (line.match(/[.!?]\s*$/)) {
				return i + 1;
			}
		}

		// Fall back to splitting in the middle
		return Math.floor(lines.length * 0.75);
	}

	/**
	 * Create document overview from chunks
	 */
	createOverview(chunks: DocumentChunk[]): string {
		const headings = chunks
			.filter(chunk => chunk.metadata.level <= 2)
			.map(chunk => {
				const indent = '  '.repeat(chunk.metadata.level - 1);
				return `${indent}- ${chunk.metadata.heading}`;
			});

		return `Document Structure:\n${headings.join('\n')}`;
	}

	/**
	 * Get context for a specific chunk
	 */
	getChunkContext(
		chunk: DocumentChunk,
		allChunks: DocumentChunk[]
	): {
		previous?: DocumentChunk;
		next?: DocumentChunk;
		siblings: DocumentChunk[];
	} {
		const index = chunk.metadata.index;

		return {
			previous: index > 0 ? allChunks[index - 1] : undefined,
			next: index < allChunks.length - 1 ? allChunks[index + 1] : undefined,
			siblings: allChunks.filter(
				c => c.metadata.level === chunk.metadata.level &&
				     c.metadata.index !== index
			)
		};
	}
}
