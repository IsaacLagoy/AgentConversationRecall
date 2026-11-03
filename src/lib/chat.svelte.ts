export type Message = { role: 'user' | 'assistant'; content: string };

// Shared conversation state that any component or function can import
export const chat = $state({ messages: [] as Message[], loading: false });

export async function sendMessage(content: string) {
	chat.messages.push({ role: 'user', content });
	chat.loading = true;
	try {
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages: chat.messages })
		});
		const { reply } = await res.json();
		chat.messages.push({ role: 'assistant', content: reply });
	} finally {
		chat.loading = false;
	}
}
