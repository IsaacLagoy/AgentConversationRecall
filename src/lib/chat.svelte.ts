export type Source = { title: string; url: string };
// sources holds the web pages a tutor answer cited, numbered [1], [2]… in content
export type Message = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

// Shared conversation state that any component or function can import
export const chat = $state({ messages: [] as Message[], loading: false });

// tutor adds the structured study prompt and web search on the server; the study conditions ran without them
export async function sendMessage(content: string, { tutor = false } = {}) {
	chat.messages.push({ role: 'user', content });
	chat.loading = true;
	try {
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages: chat.messages, tutor })
		});
		const { reply, sources } = await res.json();
		chat.messages.push({ role: 'assistant', content: reply, sources });
	} finally {
		chat.loading = false;
	}
}
