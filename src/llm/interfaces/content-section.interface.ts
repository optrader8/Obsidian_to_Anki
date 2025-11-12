/**
 * Content Section Interface
 * Defines structure for analyzed content sections
 */

export interface ContentSection {
	type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote' | 'table';
	content: string;
	level?: number;
	cardPotential: number; // 0-1 score indicating suitability for flashcard
	metadata?: {
		lineStart?: number;
		lineEnd?: number;
		parentHeading?: string;
	};
}

export interface AnalysisResult {
	sections: ContentSection[];
	candidateSections: ContentSection[];
	totalSections: number;
	highPotentialCount: number;
}
