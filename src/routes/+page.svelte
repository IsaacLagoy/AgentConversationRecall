<script lang="ts">
	import { chat, sendMessage } from '#lib/chat.svelte.js';

	let input = $state('');

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const text = input.trim();
		if (!text || chat.loading) return;
		input = '';
		sendMessage(text);
	}
</script>

<main class="mx-auto flex h-screen max-w-2xl flex-col p-4">
	<div class="flex flex-1 flex-col gap-2 overflow-y-auto">
		{#each chat.messages as m, i (i)}
			<p
				class={[
					'max-w-[75%] rounded-2xl px-4 py-2 whitespace-pre-wrap',
					m.role === 'user' ? 'self-end bg-blue-500 text-white' : 'self-start bg-gray-200'
				]}
			>
				{m.content}
			</p>
		{/each}
		{#if chat.loading}<p class="self-start rounded-2xl bg-gray-200 px-4 py-2">...</p>{/if}
	</div>

	<form onsubmit={submit} class="mt-4 flex gap-2">
		<input bind:value={input} class="flex-1 rounded-full border px-4 py-2 outline-none" placeholder="Message" />
		<button class="rounded-full bg-blue-500 px-4 text-white" disabled={chat.loading}>Send</button>
	</form>
</main>
