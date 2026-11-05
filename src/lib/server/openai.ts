import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$app/env/private';

export const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
