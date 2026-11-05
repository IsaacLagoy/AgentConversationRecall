import { json } from '@sveltejs/kit';
import { openai } from '#lib/server/openai.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = await request.json();
	const completion = await openai.chat.completions.create({ model: 'gpt-5-mini', messages });
	return json({ reply: completion.choices[0].message.content ?? '' });
};
