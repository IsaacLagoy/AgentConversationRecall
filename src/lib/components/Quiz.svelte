<script lang="ts">
	import { quiz, resetQuiz, scheduleReview, type Card } from '#lib/review.svelte.js';

	let { onSource }: { onSource?: (card: Card) => void } = $props();

	let index = $state(0);
	let flipped = $state(false);
	let reminder = $state<string | null>(null);

	const current = $derived(quiz.cards[index]);
	const done = $derived(quiz.cards.length > 0 && quiz.results.every((r) => r !== null));
	const correct = $derived(quiz.results.filter((r) => r === true).length);
	const missed = $derived(quiz.cards.filter((_, i) => quiz.results[i] === false));

	// Compare self-rated confidence with the actual score, as percentages
	const calibration = $derived.by(() => {
		if (quiz.confidence === null || !quiz.cards.length) return null;
		const felt = Math.round((quiz.confidence / 5) * 100);
		const scored = Math.round((correct / quiz.cards.length) * 100);
		if (felt - scored > 25)
			return {
				felt,
				scored,
				note: 'You felt more confident than your score. Go over the cards you missed.'
			};
		if (scored - felt > 25) return { felt, scored, note: 'You know more than you thought.' };
		return { felt, scored, note: 'Your confidence matched your score.' };
	});

	function grade(recalled: boolean) {
		quiz.results[index] = recalled;
		flipped = false;
		const next = quiz.results.findIndex((r) => r === null);
		if (next >= 0) index = next;
	}

	function flip() {
		if (current) flipped = !flipped;
	}

	const REMINDERS = [
		{ label: 'In 1 minute (demo)', ms: 60_000 },
		{ label: 'Tomorrow', ms: 24 * 3_600_000 },
		{ label: 'In 3 days', ms: 3 * 24 * 3_600_000 }
	];

	function remind(label: string, ms: number) {
		const cards = $state.snapshot(quiz.cards);
		const ok = scheduleReview(cards, ms);
		reminder = ok
			? `Review set for ${new Date(Date.now() + ms).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })} (${label.toLowerCase()}).`
			: 'Could not save the review in this browser.';
	}

	function restart() {
		reminder = null;
		index = 0;
		resetQuiz();
	}
</script>

{#if quiz.loading}
	<p class="text-gray-400 italic">Creating flashcards from your key points…</p>
{:else if done}
	<div class="flex flex-col gap-5">
		<div>
			<p class="text-sm text-gray-500">Score</p>
			<p class="text-3xl font-semibold tabular-nums">{correct} / {quiz.cards.length}</p>
		</div>

		{#if calibration}
			<div class="rounded-xl bg-violet-50 p-4">
				<p class="text-sm text-gray-600">
					Confidence before the quiz: <strong>{calibration.felt}%</strong> · Recalled:
					<strong>{calibration.scored}%</strong>
				</p>
				<p class="mt-1 font-medium text-violet-900">{calibration.note}</p>
			</div>
		{/if}

		{#if missed.length}
			<div>
				<p class="mb-2 text-sm font-semibold">Cards you missed</p>
				<ul class="flex flex-col gap-2">
					{#each missed as card (card.question)}
						<li class="rounded-lg border p-3 text-sm">
							<p class="font-medium">{card.question}</p>
							<p class="text-gray-600">{card.answer}</p>
							{#if card.source !== undefined && onSource}
								<button
									class="mt-1 text-xs text-violet-700 underline"
									onclick={() => onSource(card)}>See it in the chat</button
								>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div>
			<p class="mb-2 text-sm font-semibold">Review again later</p>
			<p class="mb-2 text-xs text-gray-500">
				Recalling again after a gap strengthens long-term memory.
			</p>
			<div class="flex flex-wrap gap-2">
				{#each REMINDERS as r (r.label)}
					<button
						class="rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
						onclick={() => remind(r.label, r.ms)}>{r.label}</button
					>
				{/each}
			</div>
			{#if reminder}<p class="mt-2 text-sm text-green-700">{reminder}</p>{/if}
		</div>

		<button class="self-start text-sm text-gray-500 underline" onclick={restart}
			>Back to key points</button
		>
	</div>
{:else if current}
	<div class="flex flex-1 flex-col items-center justify-center gap-6">
		<p class="text-sm text-gray-500 tabular-nums">
			Card {index + 1} of {quiz.cards.length}
			{#if current.concept}· {current.concept}{/if}
		</p>
		<div
			role="button"
			tabindex="0"
			onclick={flip}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), flip())}
			aria-label={flipped ? 'Show question' : 'Show answer'}
			class="scene"
		>
			<div class={['card', flipped && 'flipped']}>
				<div class="face front"><p>{current.question}</p></div>
				<div class="face back"><p>{current.answer}</p></div>
			</div>
		</div>

		{#if flipped}
			<div class="flex gap-3">
				<button
					class="rounded-full border border-red-300 px-5 py-2 text-red-700"
					onclick={() => grade(false)}>Missed it</button
				>
				<button class="rounded-full bg-green-600 px-5 py-2 text-white" onclick={() => grade(true)}
					>Got it</button
				>
			</div>
		{:else}
			<p class="text-xs text-gray-400">Try to answer first, then click the card to check</p>
		{/if}
	</div>
{/if}

<style>
	/* Same flip card as the study's flashcard condition */
	.scene {
		width: 100%;
		max-width: 36rem;
		height: 16rem;
		perspective: 1200px;
		cursor: pointer;
		outline: none;
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
		font-size: 1.25rem;
		font-weight: 500;
		color: #1c1917;
	}
	.back {
		transform: rotateY(180deg);
		background: #4f46e5;
		border: 1px solid #4338ca;
		font-size: 1.1rem;
		color: #fff;
	}
	.scene:focus-visible .face {
		outline: 2px solid #6366f1;
		outline-offset: 3px;
	}
</style>
