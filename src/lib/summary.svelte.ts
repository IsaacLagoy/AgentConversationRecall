import { chat } from '#lib/chat.svelte.js';

export type SummaryMode = 'paragraphs' | 'bullets' | 'flashcards' | 'keypoints';
export type SummaryCheck = { supported: boolean; issue: string };
export type SummaryItem = {
	id: number;
	mode: SummaryMode;
	highlight: string;
	content: string;
	// Only set for flashcards where content holds the question
	answer?: string;
	// Only set for key points, which name their concept separately
	concept?: string;
	// Index into chat.messages of the message the highlight came from
	source?: number;
	// Result of the accuracy check, when one was requested
	check?: SummaryCheck;
	loading: boolean;
};

// Summary state kept apart from chat.messages so the chat agent never sees it
export const summary = $state({ items: [] as SummaryItem[] });

let nextId = 0;

export async function addToSummary(
	highlight: string,
	mode: SummaryMode,
	{ source, verify = false }: { source?: number; verify?: boolean } = {}
) {
	const existing = summary.items.filter((i) => i.mode === mode && !i.loading).map((i) => i.content);
	const id = nextId++;
	summary.items.push({ id, mode, highlight, source, content: '', loading: true });
	try {
		const res = await fetch('/api/summarize', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				mode,
				highlight,
				messages: $state.snapshot(chat.messages),
				summary: existing,
				verify
			})
		});
		if (!res.ok) throw new Error(`Summarize failed with ${res.status}`);
		const { content, answer, concept, check } = await res.json();
		const item = summary.items.find((i) => i.id === id);
		if (item) Object.assign(item, { content, answer, concept, check, loading: false });
	} catch (err) {
		summary.items = summary.items.filter((i) => i.id !== id);
		console.error(err);
	}
}
