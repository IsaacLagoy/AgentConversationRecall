import { error, json } from '@sveltejs/kit';
import { openai } from '#lib/server/openai.js';
import type { Message } from '#lib/chat.svelte.js';
import type { SummaryMode } from '#lib/summary.svelte.js';
import type { RequestHandler } from './$types';

// System prompt per summary style
const PROMPTS: Record<SummaryMode, string> = {
	paragraphs:
		'You write study summaries of a conversation. Write one short paragraph of 2-3 sentences explaining what the highlighted text means in the context of the conversation. Do not repeat points already in the existing summary. Return only the paragraph.',
	bullets:
		'You write study summaries of a conversation. Write one bullet point about the highlighted text in the context of the conversation: the key idea followed by a brief elaboration, under 25 words total. Do not repeat points already in the existing summary. Return only the bullet text with no leading bullet character.',
	flashcards:
		'You write study flashcards from a conversation. Create one flashcard that tests the key idea of the highlighted text in the context of the conversation. The question should be clear and answerable on its own, and the answer should be 1-2 short sentences. Do not duplicate questions already in the existing summary. Respond with only a JSON object of the form {"question": "...", "answer": "..."}.'
};

export const POST: RequestHandler = async ({ request }) => {
	const { mode, highlight, messages, summary } = (await request.json()) as {
		mode: SummaryMode;
		highlight: string;
		messages: Message[];
		summary: string[];
	};
	const prompt = PROMPTS[mode];
	if (!prompt) error(400, `Unsupported summary mode ${mode}`);

	const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
	const existing = summary.length ? summary.map((s) => `- ${s}`).join('\n') : 'None yet';
	const user = `## Conversation\n${transcript}\n\n## Existing summary\n${existing}\n\n## Highlighted text\n${highlight}`;

	const completion = await openai.chat.completions.create({
		model: 'gpt-5-mini',
		messages: [
			{ role: 'system', content: prompt },
			{ role: 'user', content: user }
		],
		...(mode === 'flashcards' ? { response_format: { type: 'json_object' as const } } : {})
	});
	const text = completion.choices[0].message.content?.trim() ?? '';
	if (mode !== 'flashcards') return json({ content: text });

	// Flashcards come back as JSON so the question and answer can be shown on separate sides
	let card: { question?: unknown; answer?: unknown };
	try {
		card = JSON.parse(text);
	} catch {
		error(502, 'Flashcard response was not valid JSON');
	}
	if (typeof card.question !== 'string' || typeof card.answer !== 'string') {
		error(502, 'Flashcard response was missing a question or answer');
	}
	return json({ content: card.question, answer: card.answer });
};
