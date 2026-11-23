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
		'You write study flashcards from a conversation. Create one flashcard that tests the key idea of the highlighted text in the context of the conversation. The question should be clear and answerable on its own, and the answer should be 1-2 short sentences. Do not duplicate questions already in the existing summary. Respond with only a JSON object of the form {"question": "...", "answer": "..."}.',
	keypoints:
		'You write structured study notes from a conversation. Write one key point about the highlighted text in the context of the conversation. "concept" names the idea in 1-4 words. "point" states it in one plain sentence under 25 words, using only facts stated in the conversation. Do not repeat points already in the existing summary. Respond with only a JSON object of the form {"concept": "...", "point": "..."}.'
};

// Modes whose response is a JSON object rather than plain text
const JSON_MODES: SummaryMode[] = ['flashcards', 'keypoints'];

const CHECK_PROMPT =
	'You check study notes for accuracy. Decide whether the note is fully supported by the conversation. Respond with only a JSON object of the form {"supported": true, "issue": ""}. When it is not supported, set "supported" to false and use "issue" to say in under 15 words what is missing, wrong or not in the conversation.';

async function complete(system: string, user: string, asJson: boolean) {
	const completion = await openai.chat.completions.create({
		model: 'gpt-5-mini',
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: user }
		],
		...(asJson ? { response_format: { type: 'json_object' as const } } : {})
	});
	return completion.choices[0].message.content?.trim() ?? '';
}

function parse<T>(text: string): Partial<T> {
	try {
		return JSON.parse(text);
	} catch {
		error(502, 'Summary response was not valid JSON');
	}
}

// Second pass that compares a generated note against the transcript it came from
async function check(transcript: string, note: string) {
	const result = parse<{ supported: unknown; issue: unknown }>(
		await complete(CHECK_PROMPT, `## Conversation\n${transcript}\n\n## Note\n${note}`, true)
	);
	return {
		supported: result.supported !== false,
		issue: typeof result.issue === 'string' ? result.issue : ''
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const { mode, highlight, messages, summary, verify } = (await request.json()) as {
		mode: SummaryMode;
		highlight: string;
		messages: Message[];
		summary: string[];
		verify?: boolean;
	};
	const prompt = PROMPTS[mode];
	if (!prompt) error(400, `Unsupported summary mode ${mode}`);

	const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
	const existing = summary.length ? summary.map((s) => `- ${s}`).join('\n') : 'None yet';
	const user = `## Conversation\n${transcript}\n\n## Existing summary\n${existing}\n\n## Highlighted text\n${highlight}`;

	const text = await complete(prompt, user, JSON_MODES.includes(mode));
	if (!JSON_MODES.includes(mode)) return json({ content: text });

	if (mode === 'keypoints') {
		const note = parse<{ concept: unknown; point: unknown }>(text);
		if (typeof note.concept !== 'string' || typeof note.point !== 'string') {
			error(502, 'Key point response was missing a concept or point');
		}
		const result = verify ? await check(transcript, `${note.concept}: ${note.point}`) : undefined;
		return json({ concept: note.concept, content: note.point, check: result });
	}

	// Flashcards come back as JSON so the question and answer can be shown on separate sides
	const card = parse<{ question: unknown; answer: unknown }>(text);
	if (typeof card.question !== 'string' || typeof card.answer !== 'string') {
		error(502, 'Flashcard response was missing a question or answer');
	}
	return json({ content: card.question, answer: card.answer });
};
