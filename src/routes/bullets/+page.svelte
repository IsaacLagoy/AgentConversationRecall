<script lang="ts">
	import Chat from '#lib/components/Chat.svelte';
	import { summary, addToSummary } from '#lib/summary.svelte.js';

	const items = $derived(summary.items.filter((i) => i.mode === 'bullets'));
</script>

<main class="grid h-screen grid-cols-2 gap-4 p-4">
	<Chat onAdd={(text) => addToSummary(text, 'bullets')} />

	<section class="flex min-h-0 flex-col border-l pl-4">
		<h2 class="mb-2 text-lg font-semibold">Summary</h2>
		<div class="flex-1 overflow-y-auto">
			{#if items.length}
				<ul class="flex list-disc flex-col gap-2 pl-5">
					{#each items as item (item.id)}
						<li class={[item.loading && 'text-gray-400 italic']}>
							{item.loading ? 'Summarizing…' : item.content.replace(/^[-*•]\s*/, '')}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-400">Highlight text in the chat to add it here</p>
			{/if}
		</div>
	</section>
</main>
