import { chat } from '#lib/chat.svelte.js';
import type { SummaryItem } from '#lib/summary.svelte.js';

export type Card = { question: string; answer: string; concept?: string; source?: number };
type SavedReview = { cards: Card[]; savedAt: number; dueAt: number };

const STORAGE_KEY = 'convorecall.review';

// Quiz built from the key points once the learner says they feel ready
export const quiz = $state({
	cards: [] as Card[],
	loading: false,
	// true = recalled, false = missed, null = not answered yet
	results: [] as (boolean | null)[],
	// Self-rated confidence (1-5) given before the quiz, compared with the score afterwards
	confidence: null as number | null
});

export async function buildQuiz(points: SummaryItem[], confidence: number) {
	quiz.loading = true;
	quiz.confidence = confidence;
	const messages = $state.snapshot(chat.messages);
	const made = await Promise.all(
		points.map(async (p) => {
			try {
				const res = await fetch('/api/summarize', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						mode: 'flashcards',
						highlight: `${p.concept}: ${p.content}`,
						messages,
						summary: []
					})
				});
				if (!res.ok) throw new Error(`Flashcard failed with ${res.status}`);
				const { content, answer } = await res.json();
				return { question: content, answer, concept: p.concept, source: p.source } as Card;
			} catch (err) {
				console.error(err);
				return null;
			}
		})
	);
	startQuiz(
		made.filter((c): c is Card => c !== null),
		confidence
	);
}

export function startQuiz(cards: Card[], confidence: number | null) {
	quiz.cards = cards;
	quiz.results = cards.map(() => null);
	quiz.confidence = confidence;
	quiz.loading = false;
}

export function resetQuiz() {
	startQuiz([], null);
}

// Spaced review: keep the cards in this browser and remind the learner when they are due
export function scheduleReview(cards: Card[], delayMs: number) {
	const saved: SavedReview = { cards, savedAt: Date.now(), dueAt: Date.now() + delayMs };
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
	} catch {
		return false;
	}
	// Not awaited: an unanswered permission prompt must not hold up the confirmation
	if ('Notification' in window && Notification.permission === 'default') {
		Notification.requestPermission();
	}
	// Browsers only run timers while the page is open, so later reminders show as a banner on return
	setTimeout(() => {
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('Time to review', {
				body: `${cards.length} flashcards are ready for review.`
			});
		}
	}, delayMs);
	return true;
}

export function savedReview(): SavedReview | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as SavedReview) : null;
	} catch {
		return null;
	}
}

export function clearReview() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage can be unavailable in private windows; nothing to clear then
	}
}
