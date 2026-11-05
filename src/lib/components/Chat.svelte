<script lang="ts">
	import { chat, sendMessage } from '#lib/chat.svelte.js';

	let { onAdd }: { onAdd?: (text: string) => void } = $props();

	let input = $state('');
	let container: HTMLDivElement;
	let selection = $state<{ text: string; x: number; y: number } | null>(null);

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const text = input.trim();
		if (!text || chat.loading) return;
		input = '';
		sendMessage(text);
	}

	// Track text selected inside the message list so the add button can follow it
	$effect(() => {
		if (!onAdd) return;
		const onChange = () => {
			const sel = document.getSelection();
			const text = sel?.toString().trim();
			if (!sel || !text || !sel.rangeCount) return (selection = null);
			const range = sel.getRangeAt(0);
			if (!container.contains(range.commonAncestorContainer)) return (selection = null);
			const rect = range.getBoundingClientRect();
			selection = { text, x: rect.left + rect.width / 2, y: rect.top };
		};
		document.addEventListener('selectionchange', onChange);
		return () => document.removeEventListener('selectionchange', onChange);
	});

	function add() {
		if (!selection) return;
		onAdd?.(selection.text);
		document.getSelection()?.removeAllRanges();
		selection = null;
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div
		bind:this={container}
		onscroll={() => (selection = null)}
		class="flex flex-1 flex-col gap-2 overflow-y-auto"
	>
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
		<input
			bind:value={input}
			class="flex-1 rounded-full border px-4 py-2 outline-none"
			placeholder="Message"
		/>
		<button class="rounded-full bg-blue-500 px-4 text-white" disabled={chat.loading}>Send</button>
	</form>
</div>

{#if selection}
	<button
		onmousedown={(e) => e.preventDefault()}
		onclick={add}
		style:left="{selection.x}px"
		style:top="{selection.y}px"
		class="fixed z-10 -translate-x-1/2 -translate-y-full rounded-full bg-black px-3 py-1 text-sm text-white shadow"
	>
		Add to summary
	</button>
{/if}
