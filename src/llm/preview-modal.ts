/**
 * Card Preview Modal
 * Shows generated cards for user review and approval
 */

import { App, Modal, Setting, TextAreaComponent, Notice } from 'obsidian';
import { GeneratedCard } from './interfaces/prompt-template.interface';

export class CardPreviewModal extends Modal {
	private cards: GeneratedCard[];
	private onApprove: (approvedCards: GeneratedCard[]) => void;
	private approvedCards: Set<number>;
	private editedCards: Map<number, GeneratedCard>;

	constructor(
		app: App,
		cards: GeneratedCard[],
		onApprove: (approvedCards: GeneratedCard[]) => void
	) {
		super(app);
		this.cards = cards;
		this.onApprove = onApprove;
		this.approvedCards = new Set(cards.map((_, i) => i)); // All approved by default
		this.editedCards = new Map();
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass('llm-card-preview-modal');

		// Header
		contentEl.createEl('h2', { text: `Review Generated Cards (${this.cards.length})` });
		contentEl.createEl('p', {
			text: 'Review and edit the AI-generated cards before adding them to Anki.',
			cls: 'mod-muted'
		});

		// Stats
		const statsEl = contentEl.createDiv({ cls: 'llm-stats' });
		this.updateStats(statsEl);

		// Cards container
		const cardsContainer = contentEl.createDiv({ cls: 'llm-cards-container' });

		this.cards.forEach((card, index) => {
			this.renderCard(cardsContainer, card, index);
		});

		// Buttons
		const buttonsEl = contentEl.createDiv({ cls: 'llm-buttons' });

		buttonsEl.createEl('button', {
			text: 'Select All',
			cls: 'mod-cta'
		}).addEventListener('click', () => {
			this.approvedCards = new Set(this.cards.map((_, i) => i));
			this.refresh();
		});

		buttonsEl.createEl('button', {
			text: 'Deselect All'
		}).addEventListener('click', () => {
			this.approvedCards.clear();
			this.refresh();
		});

		buttonsEl.createEl('button', {
			text: `Add Selected Cards (${this.approvedCards.size})`,
			cls: 'mod-cta'
		}).addEventListener('click', () => {
			this.approveCards();
		});

		buttonsEl.createEl('button', {
			text: 'Cancel'
		}).addEventListener('click', () => {
			this.close();
		});
	}

	private renderCard(container: HTMLElement, card: GeneratedCard, index: number) {
		const cardEl = container.createDiv({ cls: 'llm-card' });

		if (!this.approvedCards.has(index)) {
			cardEl.addClass('llm-card-disabled');
		}

		// Card header with checkbox
		const headerEl = cardEl.createDiv({ cls: 'llm-card-header' });

		const checkboxContainer = headerEl.createDiv({ cls: 'llm-card-checkbox' });
		const checkbox = checkboxContainer.createEl('input', { type: 'checkbox' });
		checkbox.checked = this.approvedCards.has(index);
		checkbox.addEventListener('change', () => {
			if (checkbox.checked) {
				this.approvedCards.add(index);
			} else {
				this.approvedCards.delete(index);
			}
			this.refresh();
		});

		const titleEl = headerEl.createDiv({ cls: 'llm-card-title' });
		titleEl.createSpan({ text: `Card ${index + 1} ` });
		titleEl.createSpan({ text: `[${card.type}]`, cls: 'llm-card-type' });

		if (card.confidence !== undefined) {
			titleEl.createSpan({
				text: ` ${Math.round(card.confidence * 100)}%`,
				cls: 'llm-card-confidence'
			});
		}

		// Card content
		const contentEl = cardEl.createDiv({ cls: 'llm-card-content' });

		// Front/Question
		const frontContainer = contentEl.createDiv({ cls: 'llm-card-field' });
		frontContainer.createEl('strong', { text: 'Front:' });
		const frontInput = frontContainer.createEl('textarea', {
			cls: 'llm-card-textarea'
		});
		frontInput.value = card.front || '';
		frontInput.rows = 3;
		frontInput.addEventListener('input', () => {
			const editedCard = this.editedCards.get(index) || { ...card };
			editedCard.front = frontInput.value;
			this.editedCards.set(index, editedCard);
		});

		// Back/Answer
		const backContainer = contentEl.createDiv({ cls: 'llm-card-field' });
		backContainer.createEl('strong', { text: 'Back:' });
		const backInput = backContainer.createEl('textarea', {
			cls: 'llm-card-textarea'
		});
		backInput.value = card.back || '';
		backInput.rows = 5;
		backInput.addEventListener('input', () => {
			const editedCard = this.editedCards.get(index) || { ...card };
			editedCard.back = backInput.value;
			this.editedCards.set(index, editedCard);
		});

		// Tags
		if (card.tags && card.tags.length > 0) {
			const tagsContainer = contentEl.createDiv({ cls: 'llm-card-tags' });
			tagsContainer.createEl('strong', { text: 'Tags: ' });
			tagsContainer.createSpan({ text: card.tags.join(', ') });
		}
	}

	private updateStats(statsEl: HTMLElement) {
		statsEl.empty();
		statsEl.createSpan({
			text: `Selected: ${this.approvedCards.size} / ${this.cards.length}`,
			cls: 'llm-stat'
		});
	}

	private refresh() {
		this.onOpen();
	}

	private approveCards() {
		const approved: GeneratedCard[] = [];

		for (const index of this.approvedCards) {
			const card = this.editedCards.get(index) || this.cards[index];
			approved.push(card);
		}

		if (approved.length === 0) {
			new Notice('No cards selected!');
			return;
		}

		this.onApprove(approved);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
