<script lang="ts">
	import Chat from '#lib/components/Chat.svelte';
	import { summary, addToSummary } from '#lib/summary.svelte.js';

	const items = $derived(summary.items.filter((i) => i.mode === 'paragraphs'));
</script>

<main class="grid h-screen grid-cols-2 gap-4 p-4">
	<Chat onAdd={(text) => addToSummary(text, 'paragraphs')} />

	<section class="flex min-h-0 flex-col border-l pl-4">
		<h2 class="mb-2 text-lg font-semibold">Summary</h2>
		<div class="flex flex-1 flex-col gap-3 overflow-y-auto">
			{#each items as item (item.id)}
				<p class={['leading-relaxed', item.loading && 'text-gray-400 italic']}>
					{item.loading ? 'Summarizing…' : item.content}
				</p>
			{:else}
				<p class="text-gray-400">Highlight text in the chat to add it here</p>
			{/each}
		</div>
	</section>
</main>
