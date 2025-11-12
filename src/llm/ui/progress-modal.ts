/**
 * Generation Progress Modal
 * Shows real-time progress for multi-pass card generation
 */

import { App, Modal, Notice } from 'obsidian';
import { GenerationProgress, CardBatch } from '../generation/multi-pass-generator';
import { GeneratedCard } from '../interfaces/prompt-template.interface';

export class GenerationProgressModal extends Modal {
	private progressTitleEl: HTMLElement;
	private phaseEl: HTMLElement;
	private progressBarEl: HTMLElement;
	private progressFillEl: HTMLElement;
	private statsEl: HTMLElement;
	private messageEl: HTMLElement;
	private cardsListEl: HTMLElement;
	private cancelButton: HTMLButtonElement;
	private doneButton: HTMLButtonElement;

	private cancelled: boolean = false;
	private completed: boolean = false;
	private allCards: GeneratedCard[] = [];
	private totalChunks: number = 0;
	private currentChunk: number = 0;

	private onComplete?: (cards: GeneratedCard[]) => void;
	private onCancel?: () => void;

	constructor(
		app: App,
		options?: {
			onComplete?: (cards: GeneratedCard[]) => void;
			onCancel?: () => void;
		}
	) {
		super(app);
		this.onComplete = options?.onComplete;
		this.onCancel = options?.onCancel;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('llm-progress-modal');

		// Title
		this.progressTitleEl = contentEl.createEl('h2', {
			text: 'Generating Flashcards with AI',
			cls: 'llm-progress-title'
		});

		// Phase indicator
		this.phaseEl = contentEl.createEl('div', {
			cls: 'llm-progress-phase',
			text: 'Initializing...'
		});

		// Progress bar
		const progressContainer = contentEl.createDiv({ cls: 'llm-progress-bar-container' });
		this.progressBarEl = progressContainer.createDiv({ cls: 'llm-progress-bar' });
		this.progressFillEl = this.progressBarEl.createDiv({ cls: 'llm-progress-bar-fill' });
		this.progressFillEl.style.width = '0%';

		// Stats
		this.statsEl = contentEl.createDiv({ cls: 'llm-progress-stats' });
		this.updateStats();

		// Message
		this.messageEl = contentEl.createEl('div', {
			cls: 'llm-progress-message',
			text: 'Starting generation...'
		});

		// Cards preview list
		const cardsSection = contentEl.createDiv({ cls: 'llm-progress-cards-section' });
		cardsSection.createEl('h3', { text: 'Generated Cards' });
		this.cardsListEl = cardsSection.createDiv({ cls: 'llm-progress-cards-list' });

		// Buttons
		const buttonsEl = contentEl.createDiv({ cls: 'llm-progress-buttons' });

		this.cancelButton = buttonsEl.createEl('button', {
			text: 'Cancel',
			cls: 'mod-warning'
		});
		this.cancelButton.addEventListener('click', () => {
			this.handleCancel();
		});

		this.doneButton = buttonsEl.createEl('button', {
			text: 'Continue with Cards',
			cls: 'mod-cta'
		});
		this.doneButton.style.display = 'none';
		this.doneButton.addEventListener('click', () => {
			this.handleComplete();
		});
	}

	/**
	 * Update progress from generator
	 */
	updateProgress(progress: GenerationProgress) {
		// Update phase
		const phaseEmoji = this.getPhaseEmoji(progress.phase);
		this.phaseEl.setText(`${phaseEmoji} ${this.getPhaseText(progress.phase)}`);

		// Update progress bar
		if (progress.totalChunks && progress.currentChunk) {
			this.totalChunks = progress.totalChunks;
			this.currentChunk = progress.currentChunk;
			const percent = (progress.currentChunk / progress.totalChunks) * 100;
			this.progressFillEl.style.width = `${percent}%`;
		}

		// Update message
		this.messageEl.setText(progress.message);

		// Update stats
		this.updateStats(progress.cardsGenerated);

		// Check if completed
		if (progress.phase === 'completed') {
			this.handleGenerationComplete();
		}
	}

	/**
	 * Add a batch of generated cards
	 */
	addCardBatch(batch: CardBatch) {
		this.allCards.push(...batch.cards);

		// Add to preview list
		const batchEl = this.cardsListEl.createDiv({ cls: 'llm-progress-card-batch' });

		const headerEl = batchEl.createDiv({ cls: 'llm-progress-batch-header' });
		headerEl.createEl('strong', { text: batch.heading });
		headerEl.createSpan({
			text: ` (${batch.cards.length} cards)`,
			cls: 'llm-progress-batch-count'
		});

		if (batch.quality !== undefined) {
			const qualityPercent = Math.round(batch.quality * 100);
			const qualityClass = qualityPercent >= 80 ? 'quality-high' :
			                     qualityPercent >= 60 ? 'quality-medium' : 'quality-low';
			headerEl.createSpan({
				text: ` ${qualityPercent}%`,
				cls: `llm-progress-batch-quality ${qualityClass}`
			});
		}

		// Show first card as preview
		if (batch.cards.length > 0) {
			const previewEl = batchEl.createDiv({ cls: 'llm-progress-card-preview' });
			const card = batch.cards[0];
			previewEl.createDiv({
				text: `Q: ${card.front}`,
				cls: 'llm-progress-card-front'
			});
			previewEl.createDiv({
				text: `A: ${card.back.substring(0, 100)}${card.back.length > 100 ? '...' : ''}`,
				cls: 'llm-progress-card-back'
			});

			if (batch.cards.length > 1) {
				previewEl.createDiv({
					text: `+ ${batch.cards.length - 1} more card${batch.cards.length > 2 ? 's' : ''}`,
					cls: 'llm-progress-card-more'
				});
			}
		}

		// Scroll to bottom to show new cards
		this.cardsListEl.scrollTop = this.cardsListEl.scrollHeight;
	}

	/**
	 * Update statistics display
	 */
	private updateStats(cardsGenerated?: number) {
		this.statsEl.empty();

		const cards = cardsGenerated !== undefined ? cardsGenerated : this.allCards.length;

		this.statsEl.createSpan({
			text: `Cards Generated: ${cards}`,
			cls: 'llm-progress-stat'
		});

		if (this.totalChunks > 0) {
			this.statsEl.createSpan({
				text: ` | Sections: ${this.currentChunk} / ${this.totalChunks}`,
				cls: 'llm-progress-stat'
			});
		}

		if (this.allCards.length > 0) {
			const avgConfidence = this.allCards.reduce((sum, c) => sum + (c.confidence || 0.8), 0) / this.allCards.length;
			this.statsEl.createSpan({
				text: ` | Avg Confidence: ${Math.round(avgConfidence * 100)}%`,
				cls: 'llm-progress-stat'
			});
		}
	}

	/**
	 * Handle generation completion
	 */
	private handleGenerationComplete() {
		this.completed = true;
		this.cancelButton.style.display = 'none';
		this.doneButton.style.display = 'inline-block';
		this.progressFillEl.style.width = '100%';

		new Notice(`Generated ${this.allCards.length} cards successfully!`);
	}

	/**
	 * Handle cancel button
	 */
	private handleCancel() {
		this.cancelled = true;
		if (this.onCancel) {
			this.onCancel();
		}

		if (this.allCards.length > 0) {
			// Ask if user wants to keep partial results
			const keep = confirm(
				`Generation cancelled. Keep the ${this.allCards.length} cards generated so far?`
			);
			if (keep) {
				this.handleComplete();
			} else {
				this.close();
			}
		} else {
			this.close();
		}
	}

	/**
	 * Handle completion
	 */
	private handleComplete() {
		if (this.onComplete && this.allCards.length > 0) {
			this.onComplete(this.allCards);
		}
		this.close();
	}

	/**
	 * Get emoji for phase
	 */
	private getPhaseEmoji(phase: string): string {
		switch (phase) {
			case 'planning': return '📋';
			case 'analyzing': return '🔍';
			case 'generating': return '✨';
			case 'validating': return '✅';
			case 'completed': return '🎉';
			default: return '⚙️';
		}
	}

	/**
	 * Get text for phase
	 */
	private getPhaseText(phase: string): string {
		switch (phase) {
			case 'planning': return 'Planning Generation';
			case 'analyzing': return 'Analyzing Document';
			case 'generating': return 'Generating Cards';
			case 'validating': return 'Validating Quality';
			case 'completed': return 'Generation Complete';
			default: return 'Processing';
		}
	}

	/**
	 * Check if generation was cancelled
	 */
	isCancelled(): boolean {
		return this.cancelled;
	}

	/**
	 * Get all generated cards
	 */
	getGeneratedCards(): GeneratedCard[] {
		return this.allCards;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
