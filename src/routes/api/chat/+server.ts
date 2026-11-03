import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$app/env/private';
import type { RequestHandler } from './$types';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = await request.json();
	const completion = await openai.chat.completions.create({ model: 'gpt-5-mini', messages });
	return json({ reply: completion.choices[0].message.content ?? '' });
};
