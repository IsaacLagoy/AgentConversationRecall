import { chat } from '#lib/chat.svelte.js';

export type SummaryMode = 'paragraphs' | 'bullets' | 'flashcards';
export type SummaryItem = {
	id: number;
	mode: SummaryMode;
	highlight: string;
	content: string;
	// Only set for flashcards where content holds the question
	answer?: string;
	loading: boolean;
};

// Summary state kept apart from chat.messages so the chat agent never sees it
export const summary = $state({ items: [] as SummaryItem[] });

let nextId = 0;

export async function addToSummary(highlight: string, mode: SummaryMode) {
	const existing = summary.items.filter((i) => i.mode === mode && !i.loading).map((i) => i.content);
	const id = nextId++;
	summary.items.push({ id, mode, highlight, content: '', loading: true });
	try {
		const res = await fetch('/api/summarize', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				mode,
				highlight,
				messages: $state.snapshot(chat.messages),
				summary: existing
			})
		});
		if (!res.ok) throw new Error(`Summarize failed with ${res.status}`);
		const { content, answer } = await res.json();
		const item = summary.items.find((i) => i.id === id);
		if (item) Object.assign(item, { content, answer, loading: false });
	} catch (err) {
		summary.items = summary.items.filter((i) => i.id !== id);
		console.error(err);
	}
}
