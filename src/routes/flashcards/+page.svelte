<script lang="ts">
	import Chat from '#lib/components/Chat.svelte';
	import { summary, addToSummary } from '#lib/summary.svelte.js';

	const cards = $derived(summary.items.filter((i) => i.mode === 'flashcards'));

	let index = $state(0);
	let flipped = $state(false);
	const current = $derived(cards[index]);

	// Jump to a newly added card and keep the index in range if one is removed
	let seen = 0;
	$effect(() => {
		const count = cards.length;
		if (count > seen) show(count - 1);
		else if (index >= count) show(Math.max(0, count - 1));
		seen = count;
	});

	function show(i: number) {
		index = i;
		flipped = false;
	}

	function flip() {
		if (current && !current.loading) flipped = !flipped;
	}

	function onkeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('input, textarea')) return;
		if (e.key === 'ArrowLeft' && index > 0) show(index - 1);
		else if (e.key === 'ArrowRight' && index < cards.length - 1) show(index + 1);
		else if (e.key === ' ' && !target.closest('button')) {
			e.preventDefault();
			flip();
		}
	}
</script>

<svelte:window {onkeydown} />

<main class="grid h-screen grid-cols-2 gap-4 p-4">
	<Chat onAdd={(text) => addToSummary(text, 'flashcards')} />

	<section class="flex min-h-0 flex-col border-l pl-4">
		<h2 class="mb-2 text-lg font-semibold">Flashcards</h2>

		{#if current}
			<div class="flex flex-1 flex-col items-center justify-center gap-8">
				<div
					role="button"
					tabindex="0"
					onclick={flip}
					onkeydown={(e) => e.key === 'Enter' && flip()}
					aria-label={flipped ? 'Show question' : 'Show answer'}
					aria-disabled={current.loading}
					class="scene"
				>
					<div class={['card', flipped && 'flipped']}>
						<div class="face front">
							<p class={[current.loading && 'text-gray-400 italic']}>
								{current.loading ? 'Creating card…' : current.content}
							</p>
						</div>
						<div class="face back">
							<p>{current.answer}</p>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-6">
					<button
						onclick={() => show(index - 1)}
						disabled={index === 0}
						aria-label="Previous card"
						class="rounded-full border px-6 py-3 disabled:opacity-30">←</button
					>
					<span class="text-sm text-gray-500 tabular-nums">{index + 1} / {cards.length}</span>
					<button
						onclick={() => show(index + 1)}
						disabled={index === cards.length - 1}
						aria-label="Next card"
						class="rounded-full border px-6 py-3 disabled:opacity-30">→</button
					>
				</div>
				<p class="text-xs text-gray-400">
					Click the card or press space to flip, arrow keys to move
				</p>
			</div>
		{:else}
			<p class="text-gray-400">Highlight text in the chat to add it here</p>
		{/if}
	</section>
</main>

<style>
	/* Plain CSS flip so every browser gets the same 3D rotation */
	.scene {
		width: 100%;
		max-width: 36rem;
		height: 18rem;
		perspective: 1200px;
		cursor: pointer;
		outline: none;
	}
	.scene[aria-disabled='true'] {
		cursor: default;
	}
	.card {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		-webkit-transform-style: preserve-3d;
		transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
	}
	.card.flipped {
		transform: rotateY(180deg);
	}
	.face {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		border-radius: 0.75rem;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		/* Stacked edge shadows give the card visible thickness */
		box-shadow:
			0 1px 0 #d6d3d1,
			0 2px 0 #d6d3d1,
			0 3px 0 #a8a29e,
			0 20px 30px -12px rgb(0 0 0 / 0.35);
	}
	.front {
		transform: rotateY(0deg);
		background: #fffdf7;
		border: 1px solid #e7e5e4;
		font-size: 1.35rem;
		font-weight: 500;
		color: #1c1917;
	}
	.back {
		transform: rotateY(180deg);
		background: #4f46e5;
		border: 1px solid #4338ca;
		font-size: 1.15rem;
		color: #fff;
	}
	.scene:focus-visible .face {
		outline: 2px solid #6366f1;
		outline-offset: 3px;
	}
</style>
