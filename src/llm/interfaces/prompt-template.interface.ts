/**
 * Prompt Template Interface
 * Defines structure for prompt templates
 */

import { LLMMessage } from './llm-provider.interface';

export interface PromptTemplate {
	name: string;
	description: string;
	systemPrompt: string;
	userPromptTemplate: string;
	variables: string[];
}

export interface GeneratedCard {
	type: string;
	front: string;
	back: string;
	tags?: string[];
	confidence?: number;
}
