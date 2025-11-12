/**
 * Prompt Manager
 * Manages prompt templates and renders them with variables
 */

import { PromptTemplate } from './interfaces/prompt-template.interface';
import { LLMMessage } from './interfaces/llm-provider.interface';

export class PromptManager {
	private templates: Map<string, PromptTemplate>;

	constructor() {
		this.templates = new Map();
		this.loadDefaultTemplates();
	}

	/**
	 * Load default prompt templates
	 */
	private loadDefaultTemplates(): void {
		// Card generation prompt
		this.registerTemplate({
			name: 'generate_cards',
			description: 'Generate flashcards from markdown content',
			systemPrompt: `You are a helpful assistant that creates high-quality flashcards from markdown content.
Your task is to analyze the given content and generate flashcards that help with learning and retention.

Guidelines:
- Create clear, concise questions
- Provide accurate and complete answers
- Use appropriate card types (Basic, Cloze, Q&A)
- Focus on key concepts and important information
- Avoid overly complex or ambiguous questions
- Generate flashcards in the user's language (match the content language)`,
			userPromptTemplate: `Please analyze the following markdown content and generate flashcards:

Content:
\`\`\`markdown
{{content}}
\`\`\`

Generate flashcards in the following JSON format (respond ONLY with valid JSON):
\`\`\`json
[
  {
    "type": "basic",
    "front": "Question or prompt",
    "back": "Answer or explanation",
    "tags": ["tag1", "tag2"]
  }
]
\`\`\`

Important: Return ONLY the JSON array, no additional text or explanation.`,
			variables: ['content']
		});

		// Answer generation prompt
		this.registerTemplate({
			name: 'generate_answer',
			description: 'Generate answer for a given question',
			systemPrompt: `You are a knowledgeable tutor that provides clear, accurate answers to questions.
Your answers should be:
- Accurate and factually correct
- Clear and easy to understand
- Appropriately detailed based on context
- Well-structured with examples when helpful
- In the same language as the question`,
			userPromptTemplate: `Question: {{question}}

Context (if available):
{{context}}

Please provide a comprehensive answer to the question above.`,
			variables: ['question', 'context']
		});

		// Card improvement prompt
		this.registerTemplate({
			name: 'improve_card',
			description: 'Improve existing flashcard',
			systemPrompt: `You are an expert in creating effective flashcards for learning.
Analyze the given flashcard and suggest improvements for:
- Clarity and conciseness
- Accuracy
- Learning effectiveness
- Better formatting

Maintain the same language as the original card.`,
			userPromptTemplate: `Current flashcard:
Front: {{front}}
Back: {{back}}

Please provide an improved version in JSON format:
\`\`\`json
{
  "front": "Improved question or prompt",
  "back": "Improved answer or explanation",
  "improvements": "Brief explanation of changes made"
}
\`\`\`

Return ONLY the JSON, no additional text.`,
			variables: ['front', 'back']
		});

		// Cloze generation prompt
		this.registerTemplate({
			name: 'generate_cloze',
			description: 'Generate cloze deletion cards from content',
			systemPrompt: `You are an expert at creating effective cloze deletion flashcards.
Your task is to identify key terms and concepts that should be turned into cloze deletions.`,
			userPromptTemplate: `Content: {{content}}

Generate cloze deletion cards in JSON format:
\`\`\`json
[
  {
    "type": "cloze",
    "text": "The {{c1::key term}} is important for {{c2::specific reason}}.",
    "tags": ["tag1"]
  }
]
\`\`\`

Return ONLY the JSON array.`,
			variables: ['content']
		});

		// Q&A style prompt
		this.registerTemplate({
			name: 'generate_qa',
			description: 'Generate question-answer pairs from content',
			systemPrompt: `You are an expert at creating clear question and answer pairs for studying.
Focus on important concepts and create questions that test understanding, not just memorization.`,
			userPromptTemplate: `Content: {{content}}

Generate question-answer pairs in JSON format:
\`\`\`json
[
  {
    "type": "qa",
    "front": "Question?",
    "back": "Answer with explanation",
    "tags": ["tag1"]
  }
]
\`\`\`

Return ONLY the JSON array.`,
			variables: ['content']
		});
	}

	/**
	 * Register a new prompt template
	 */
	registerTemplate(template: PromptTemplate): void {
		this.templates.set(template.name, template);
	}

	/**
	 * Get a prompt template by name
	 */
	getTemplate(name: string): PromptTemplate | undefined {
		return this.templates.get(name);
	}

	/**
	 * Get all template names
	 */
	getTemplateNames(): string[] {
		return Array.from(this.templates.keys());
	}

	/**
	 * Render a prompt template with variables
	 */
	renderPrompt(
		templateName: string,
		variables: Record<string, string>
	): LLMMessage[] {
		const template = this.templates.get(templateName);
		if (!template) {
			throw new Error(`Template ${templateName} not found`);
		}

		// Validate all required variables are provided
		for (const varName of template.variables) {
			if (!(varName in variables)) {
				throw new Error(`Missing required variable: ${varName}`);
			}
		}

		// Render user prompt by replacing variables
		let userPrompt = template.userPromptTemplate;
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{{${key}}}`, 'g');
			userPrompt = userPrompt.replace(regex, value || '');
		}

		return [
			{ role: 'system', content: template.systemPrompt },
			{ role: 'user', content: userPrompt }
		];
	}

	/**
	 * Update an existing template
	 */
	updateTemplate(name: string, updates: Partial<PromptTemplate>): boolean {
		const template = this.templates.get(name);
		if (!template) {
			return false;
		}

		const updated = { ...template, ...updates };
		this.templates.set(name, updated);
		return true;
	}

	/**
	 * Delete a template
	 */
	deleteTemplate(name: string): boolean {
		return this.templates.delete(name);
	}

	/**
	 * Export templates as JSON
	 */
	exportTemplates(): string {
		const templatesArray = Array.from(this.templates.values());
		return JSON.stringify(templatesArray, null, 2);
	}

	/**
	 * Import templates from JSON
	 */
	importTemplates(json: string): void {
		try {
			const templatesArray: PromptTemplate[] = JSON.parse(json);
			for (const template of templatesArray) {
				this.registerTemplate(template);
			}
		} catch (error) {
			throw new Error(`Failed to import templates: ${error.message}`);
		}
	}
}
