/**
 * Content Analyzer
 * Analyzes markdown content and identifies sections suitable for flashcards
 */

import { ContentSection, AnalysisResult } from './interfaces/content-section.interface';

export class ContentAnalyzer {
	private readonly HIGH_POTENTIAL_THRESHOLD = 0.6;

	/**
	 * Analyze markdown content and extract sections
	 */
	analyzeMarkdown(markdown: string): AnalysisResult {
		const sections = this.extractSections(markdown);
		const candidateSections = this.selectCandidateSections(sections);

		return {
			sections: sections,
			candidateSections: candidateSections,
			totalSections: sections.length,
			highPotentialCount: candidateSections.length
		};
	}

	/**
	 * Extract sections from markdown content
	 */
	private extractSections(markdown: string): ContentSection[] {
		const sections: ContentSection[] = [];
		const lines = markdown.split('\n');

		let currentSection: ContentSection | null = null;
		let lineNumber = 0;
		let currentHeading = '';

		for (const line of lines) {
			lineNumber++;
			const trimmed = line.trim();

			// Skip empty lines
			if (!trimmed) {
				continue;
			}

			// Heading
			if (trimmed.startsWith('#')) {
				if (currentSection) {
					sections.push(currentSection);
				}

				const level = this.getHeadingLevel(trimmed);
				const content = trimmed.replace(/^#+\s*/, '');
				currentHeading = content;

				currentSection = {
					type: 'heading',
					content: content,
					level: level,
					cardPotential: this.calculateHeadingPotential(content, level),
					metadata: {
						lineStart: lineNumber,
						lineEnd: lineNumber,
					}
				};
			}
			// List item
			else if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
				if (currentSection?.type === 'list') {
					// Continue existing list
					currentSection.content += '\n' + trimmed;
					currentSection.metadata!.lineEnd = lineNumber;
				} else {
					// Start new list
					if (currentSection) {
						sections.push(currentSection);
					}

					currentSection = {
						type: 'list',
						content: trimmed,
						cardPotential: 0.8,
						metadata: {
							lineStart: lineNumber,
							lineEnd: lineNumber,
							parentHeading: currentHeading
						}
					};
				}
			}
			// Quote/Blockquote
			else if (trimmed.startsWith('>')) {
				if (currentSection?.type === 'quote') {
					currentSection.content += '\n' + trimmed;
					currentSection.metadata!.lineEnd = lineNumber;
				} else {
					if (currentSection) {
						sections.push(currentSection);
					}

					currentSection = {
						type: 'quote',
						content: trimmed,
						cardPotential: 0.7,
						metadata: {
							lineStart: lineNumber,
							lineEnd: lineNumber,
							parentHeading: currentHeading
						}
					};
				}
			}
			// Code block
			else if (trimmed.startsWith('```')) {
				if (currentSection?.type === 'code') {
					// End of code block
					currentSection.content += '\n' + trimmed;
					currentSection.metadata!.lineEnd = lineNumber;
					sections.push(currentSection);
					currentSection = null;
				} else {
					// Start of code block
					if (currentSection) {
						sections.push(currentSection);
					}

					currentSection = {
						type: 'code',
						content: trimmed,
						cardPotential: 0.4,
						metadata: {
							lineStart: lineNumber,
							lineEnd: lineNumber,
							parentHeading: currentHeading
						}
					};
				}
			}
			// Table row
			else if (trimmed.includes('|')) {
				if (currentSection?.type === 'table') {
					currentSection.content += '\n' + trimmed;
					currentSection.metadata!.lineEnd = lineNumber;
				} else {
					if (currentSection) {
						sections.push(currentSection);
					}

					currentSection = {
						type: 'table',
						content: trimmed,
						cardPotential: 0.75,
						metadata: {
							lineStart: lineNumber,
							lineEnd: lineNumber,
							parentHeading: currentHeading
						}
					};
				}
			}
			// Paragraph
			else {
				if (currentSection?.type === 'paragraph') {
					currentSection.content += ' ' + trimmed;
					currentSection.metadata!.lineEnd = lineNumber;
				} else {
					if (currentSection && currentSection.type !== 'code') {
						sections.push(currentSection);
					}

					if (currentSection?.type === 'code') {
						// Still in code block
						currentSection.content += '\n' + trimmed;
					} else {
						currentSection = {
							type: 'paragraph',
							content: trimmed,
							cardPotential: this.calculateParagraphPotential(trimmed),
							metadata: {
								lineStart: lineNumber,
								lineEnd: lineNumber,
								parentHeading: currentHeading
							}
						};
					}
				}
			}
		}

		// Add final section
		if (currentSection) {
			sections.push(currentSection);
		}

		return sections;
	}

	/**
	 * Get heading level from markdown heading
	 */
	private getHeadingLevel(heading: string): number {
		const match = heading.match(/^#+/);
		return match ? match[0].length : 0;
	}

	/**
	 * Calculate card potential for headings
	 */
	private calculateHeadingPotential(content: string, level: number): number {
		let potential = 0.5;

		// Higher level headings are more likely to be good questions
		potential += (6 - level) * 0.05;

		// Question-like headings are better
		if (content.includes('?') ||
		    content.toLowerCase().includes('what') ||
		    content.toLowerCase().includes('how') ||
		    content.toLowerCase().includes('why') ||
		    content.toLowerCase().includes('when') ||
		    content.toLowerCase().includes('where')) {
			potential += 0.2;
		}

		// Definitions and concepts
		if (content.toLowerCase().includes('definition') ||
		    content.toLowerCase().includes('concept') ||
		    content.toLowerCase().includes('이란') ||
		    content.toLowerCase().includes('무엇')) {
			potential += 0.15;
		}

		return Math.min(potential, 1.0);
	}

	/**
	 * Calculate card potential for paragraphs
	 */
	private calculateParagraphPotential(content: string): number {
		let potential = 0.5;

		// Length consideration (not too short, not too long)
		const wordCount = content.split(/\s+/).length;
		if (wordCount >= 10 && wordCount <= 100) {
			potential += 0.1;
		} else if (wordCount > 100) {
			potential -= 0.2;
		}

		// Contains definitions
		if (content.includes(':') ||
		    content.includes('is defined as') ||
		    content.includes('refers to') ||
		    content.includes('means') ||
		    content.includes('이란') ||
		    content.includes('의미는')) {
			potential += 0.2;
		}

		// Contains key phrases
		if (content.toLowerCase().includes('important') ||
		    content.toLowerCase().includes('key') ||
		    content.toLowerCase().includes('note that') ||
		    content.includes('중요') ||
		    content.includes('핵심')) {
			potential += 0.15;
		}

		// Contains examples
		if (content.toLowerCase().includes('example') ||
		    content.toLowerCase().includes('for instance') ||
		    content.includes('예를 들어') ||
		    content.includes('예시')) {
			potential += 0.1;
		}

		return Math.min(potential, 1.0);
	}

	/**
	 * Select sections that are good candidates for flashcards
	 */
	selectCandidateSections(
		sections: ContentSection[],
		threshold: number = this.HIGH_POTENTIAL_THRESHOLD
	): ContentSection[] {
		return sections.filter(section => section.cardPotential >= threshold);
	}

	/**
	 * Group related sections together
	 */
	groupRelatedSections(sections: ContentSection[]): ContentSection[][] {
		const groups: ContentSection[][] = [];
		let currentGroup: ContentSection[] = [];
		let currentHeading = '';

		for (const section of sections) {
			if (section.type === 'heading') {
				// Start new group
				if (currentGroup.length > 0) {
					groups.push(currentGroup);
				}
				currentGroup = [section];
				currentHeading = section.content;
			} else {
				// Add to current group if related
				if (section.metadata?.parentHeading === currentHeading) {
					currentGroup.push(section);
				} else {
					// Start new group
					if (currentGroup.length > 0) {
						groups.push(currentGroup);
					}
					currentGroup = [section];
				}
			}
		}

		// Add final group
		if (currentGroup.length > 0) {
			groups.push(currentGroup);
		}

		return groups;
	}

	/**
	 * Get context for a section (surrounding content)
	 */
	getContext(section: ContentSection, allSections: ContentSection[]): string {
		const context: string[] = [];

		// Find parent heading
		if (section.metadata?.parentHeading) {
			context.push(`# ${section.metadata.parentHeading}`);
		}

		// Find related sections
		for (const other of allSections) {
			if (other === section) continue;
			if (other.metadata?.parentHeading === section.metadata?.parentHeading) {
				if (other.metadata?.lineStart && section.metadata?.lineStart) {
					// Include sections close to this one
					const distance = Math.abs(other.metadata.lineStart - section.metadata.lineStart);
					if (distance < 5) {
						context.push(other.content);
					}
				}
			}
		}

		return context.join('\n\n');
	}
}
