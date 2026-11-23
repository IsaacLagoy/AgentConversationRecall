import { json } from '@sveltejs/kit';
import { openai } from '#lib/server/openai.js';
import type { Message, Source } from '#lib/chat.svelte.js';
import type { RequestHandler } from './$types';

// Structured tutor prompt for the final prototype. Ending on a check question gives learners a
// chance to test themselves, since chatting with an agent tends to make people overconfident.
const TUTOR_PROMPT = `You are a study tutor helping a student learn a topic through conversation.
Use web search to check facts against reliable sources and cite them.
Structure every answer the same way:
1. Core idea: one or two plain sentences.
2. Explanation: the key details, with one concrete example.
3. Check yourself: end with one short question the student can answer to test their understanding. Do not give the answer.
Keep answers under 150 words and use plain language.`;

// Drop utm_* tracking parameters that search results add to links
function cleanUrl(url: string) {
	try {
		const u = new URL(url);
		[...u.searchParams.keys()]
			.filter((k) => k.startsWith('utm_'))
			.forEach((k) => u.searchParams.delete(k));
		return u.toString();
	} catch {
		return url;
	}
}

// Only role and content go to the model; sources are for display
const history = (messages: Message[]) => messages.map(({ role, content }) => ({ role, content }));

async function tutorReply(messages: Message[]) {
	const response = await openai.responses.create({
		model: 'gpt-5-mini',
		instructions: TUTOR_PROMPT,
		input: history(messages),
		tools: [{ type: 'web_search' }]
	});

	// Swap each inline citation for a numbered marker that points into the sources list
	const sources: Source[] = [];
	const parts: string[] = [];
	for (const item of response.output) {
		if (item.type !== 'message') continue;
		for (const part of item.content) {
			if (part.type !== 'output_text') continue;
			let text = part.text;
			const citations = part.annotations
				.filter((a) => a.type === 'url_citation')
				.sort((a, b) => b.start_index - a.start_index);
			for (const c of citations) {
				const url = cleanUrl(c.url);
				let n = sources.findIndex((s) => s.url === url) + 1;
				if (!n) n = sources.push({ title: c.title, url });
				text = `${text.slice(0, c.start_index).trimEnd()} [${n}]${text.slice(c.end_index)}`;
			}
			parts.push(text);
		}
	}
	// Numbers were handed out from the end of the text, so renumber in reading order
	const reply = parts.join('\n\n');
	// (skipping bracketed numbers in the answer itself that are not citations)
	const isCitation = (n: number) => n >= 1 && n <= sources.length;
	const order = [...reply.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])).filter(isCitation);
	const seen = [...new Set(order)];
	const renumbered = reply.replace(/\[(\d+)\]/g, (m, n) =>
		isCitation(Number(n)) ? `[${seen.indexOf(Number(n)) + 1}]` : m
	);
	return { reply: renumbered, sources: seen.map((n) => sources[n - 1]) };
}

export const POST: RequestHandler = async ({ request }) => {
	const { messages, tutor } = (await request.json()) as { messages: Message[]; tutor?: boolean };
	if (tutor) return json(await tutorReply(messages));

	const completion = await openai.chat.completions.create({
		model: 'gpt-5-mini',
		messages: history(messages)
	});
	return json({ reply: completion.choices[0].message.content ?? '' });
};
