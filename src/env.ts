import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	OPENAI_API_KEY: { description: 'OpenAI API key, server only' }
});
