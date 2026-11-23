<script lang="ts">
	import Chat from '#lib/components/Chat.svelte';
	import Quiz from '#lib/components/Quiz.svelte';
	import { chat } from '#lib/chat.svelte.js';
	import { summary, addToSummary, type SummaryItem } from '#lib/summary.svelte.js';
	import {
		quiz,
		buildQuiz,
		startQuiz,
		savedReview,
		clearReview,
		type Card
	} from '#lib/review.svelte.js';

	// Final prototype: key points first, flashcards once the learner feels ready (Phase 6 findings)
	const points = $derived(summary.items.filter((i) => i.mode === 'keypoints'));
	const ready = $derived(points.filter((p) => !p.loading));

	let tab = $state<'points' | 'quiz'>('points');
	let confidence = $state<number | null>(null);
	let focus = $state<{ index: number; text: string } | null>(null);
	let hovered = $state<number | null>(null);
	let review = $state<ReturnType<typeof savedReview>>(null);

	const unlocked = $derived(ready.length >= 2 && confidence !== null && confidence >= 3);
	const due = $derived(review !== null && review.dueAt <= Date.now());
	// Hide the chat while cards are being answered so recall comes from memory, not the screen
	const hideChat = $derived(
		tab === 'quiz' && (quiz.loading || quiz.results.some((r) => r === null))
	);

	$effect(() => {
		review = savedReview();
		// Re-check every 30 s so a demo reminder turns into a banner without reloading
		const timer = setInterval(() => (review = savedReview()), 30_000);
		return () => clearInterval(timer);
	});

	// Leaving or finishing a quiz empties it, so fall back to the key points
	$effect(() => {
		if (tab === 'quiz' && !quiz.loading && !quiz.cards.length) tab = 'points';
	});

	function add(text: string, source?: number) {
		addToSummary(text, 'keypoints', { source, verify: true });
	}

	function showSource(index: number | undefined, text: string) {
		if (index === undefined) return;
		// Reassign so clicking the same point twice scrolls again
		focus = null;
		queueMicrotask(() => (focus = { index, text }));
	}

	async function startFromPoints() {
		if (!unlocked || confidence === null) return;
		tab = 'quiz';
		await buildQuiz($state.snapshot(ready), confidence);
	}

	function startDueReview() {
		if (!review) return;
		startQuiz(review.cards, null);
		clearReview();
		review = null;
		tab = 'quiz';
	}

	// Web sources behind a key point: the ones cited inside the highlight, else all of its message's
	function sourcesOf(p: SummaryItem) {
		const all = p.source === undefined ? undefined : chat.messages[p.source]?.sources;
		if (!all?.length) return [];
		const cited = [...p.highlight.matchAll(/\[(\d+)\]/g)]
			.map((m) => Number(m[1]))
			.filter((n) => n >= 1 && n <= all.length);
		const numbers = cited.length ? [...new Set(cited)] : all.map((_, i) => i + 1);
		return numbers.map((n) => ({ n, ...all[n - 1] }));
	}

	function host(url: string) {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}

	function sourceOfCard(card: Card) {
		const point = points.find((p) => p.source === card.source && p.concept === card.concept);
		showSource(card.source, point?.highlight ?? '');
	}
</script>

<main class="flex h-screen flex-col">
	<header class="flex items-baseline gap-3 border-b px-6 py-3">
		<h1 class="text-xl font-bold">Recall<span class="text-violet-600">Lab</span></h1>
		<p class="text-sm text-gray-500">
			Chat with the tutor, highlight what matters, then test yourself
		</p>
	</header>

	<div class="grid min-h-0 flex-1 grid-cols-2 gap-6 p-4">
		<div class="relative h-full min-h-0">
			<div
				class={['h-full transition', hideChat && 'pointer-events-none blur-md select-none']}
				inert={hideChat}
			>
				<Chat onAdd={add} onHover={(i) => (hovered = i)} {focus} tutor />
			</div>
			{#if hideChat}
				<div class="absolute inset-0 flex items-center justify-center">
					<p class="rounded-full bg-white px-4 py-2 text-sm font-medium shadow">
						Chat hidden during the quiz. Answer from memory.
					</p>
				</div>
			{/if}
		</div>

		<section class="flex min-h-0 flex-col border-l pl-6">
			{#if due && review}
				<div
					class="mb-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm"
				>
					<span
						><strong>Review due:</strong>
						{review.cards.length} flashcards from {new Date(
							review.savedAt
						).toLocaleDateString()}</span
					>
					<button
						class="rounded-full bg-amber-500 px-3 py-1 font-medium text-white"
						onclick={startDueReview}>Start review</button
					>
				</div>
			{:else if review}
				<p class="mb-3 text-xs text-gray-500">
					Next review: {new Date(review.dueAt).toLocaleString([], {
						weekday: 'short',
						hour: '2-digit',
						minute: '2-digit'
					})}
				</p>
			{/if}

			<div class="mb-4 flex gap-1 rounded-full bg-gray-100 p-1 text-sm" role="tablist">
				<button
					role="tab"
					aria-selected={tab === 'points'}
					class={[
						'flex-1 rounded-full px-4 py-1.5',
						tab === 'points' && 'bg-white font-semibold shadow-sm'
					]}
					onclick={() => (tab = 'points')}>Key points</button
				>
				<button
					role="tab"
					aria-selected={tab === 'quiz'}
					disabled={!unlocked && !quiz.cards.length}
					title={unlocked ? '' : 'Unlocks when you have 2+ key points and feel ready'}
					class={[
						'flex-1 rounded-full px-4 py-1.5 disabled:text-gray-400',
						tab === 'quiz' && 'bg-white font-semibold shadow-sm'
					]}
					onclick={() => (tab = 'quiz')}
					>{unlocked || quiz.cards.length ? 'Quiz' : '🔒 Quiz'}</button
				>
			</div>

			{#if tab === 'points'}
				<div class="flex min-h-0 flex-1 flex-col">
					<div class="flex-1 overflow-y-auto">
						<!-- Same dot list as the tested bullet condition -->
						<ul class="flex list-disc flex-col gap-1 pl-5">
							{#each points as p (p.id)}
								<li>
									<button
										class={[
											'-mx-2 block w-full rounded-lg px-2 py-1 text-left transition-colors hover:bg-gray-50',
											hovered !== null &&
												p.source === hovered &&
												'bg-amber-50 ring-1 ring-amber-300'
										]}
										disabled={p.loading}
										onclick={() => showSource(p.source, p.highlight)}
									>
										{#if p.loading}
											<span class="text-gray-400 italic"
												>Summarizing and checking against the chat…</span
											>
										{:else}
											<span class="font-semibold">{p.concept}</span>
											<span class="text-gray-700"> — {p.content}</span>
											{#if p.check && !p.check.supported}
												<span class="mt-0.5 block text-xs text-amber-700"
													>⚠ May not match the chat: {p.check.issue}</span
												>
											{:else if p.check}
												<span class="mt-0.5 block text-xs text-green-700"
													>✓ Checked against the chat</span
												>
											{/if}
										{/if}
									</button>
									{#if !p.loading}
										{@const sources = sourcesOf(p)}
										{#if sources.length}
											<p class="flex flex-wrap gap-x-2 text-xs text-gray-500">
												Sources:
												{#each sources as s (s.url)}
													<!-- External web source, not an app route -->
													<!-- eslint-disable svelte/no-navigation-without-resolve -->
													<a
														href={s.url}
														title={s.title}
														target="_blank"
														rel="noopener noreferrer"
														class="text-violet-700 underline">[{s.n}] {host(s.url)}</a
													>
													<!-- eslint-enable svelte/no-navigation-without-resolve -->
												{/each}
											</p>
										{/if}
									{/if}
								</li>
							{/each}
						</ul>

						{#if !points.length}
							<p class="text-gray-400">Highlight text in the chat and click “Add to summary”.</p>
						{/if}
					</div>

					{#if ready.length}
						<p class="mt-1 text-xs text-gray-400">
							Click a key point to see where it came from in the chat.
						</p>
					{/if}

					<div class="mt-4 rounded-xl bg-gray-50 p-4">
						<p class="text-sm font-semibold">How well do you know this now?</p>
						<div class="mt-2 flex gap-2" role="radiogroup" aria-label="Confidence from 1 to 5">
							{#each [1, 2, 3, 4, 5] as n (n)}
								<button
									role="radio"
									aria-checked={confidence === n}
									class={[
										'h-9 w-9 rounded-full border text-sm',
										confidence === n ? 'border-violet-600 bg-violet-600 text-white' : 'bg-white'
									]}
									onclick={() => (confidence = n)}>{n}</button
								>
							{/each}
							<span class="ml-2 self-center text-xs text-gray-500"
								>1 = not at all · 5 = very well</span
							>
						</div>
						{#if confidence !== null && confidence < 3}
							<p class="mt-2 text-xs text-gray-600">
								Go over the key points a bit more. The quiz unlocks once you feel ready.
							</p>
						{:else if ready.length < 2}
							<p class="mt-2 text-xs text-gray-600">
								Add at least 2 key points to unlock the quiz.
							</p>
						{/if}
						<button
							class="mt-3 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
							disabled={!unlocked}
							onclick={startFromPoints}>Quiz me</button
						>
					</div>
				</div>
			{:else}
				<div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
					<Quiz onSource={sourceOfCard} />
				</div>
			{/if}
		</section>
	</div>
</main>
