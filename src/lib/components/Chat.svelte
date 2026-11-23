<script lang="ts">
	import { chat, sendMessage } from '#lib/chat.svelte.js';

	let {
		onAdd,
		onHover,
		focus = null,
		tutor = false
	}: {
		// source is the index of the message the selection started in
		onAdd?: (text: string, source?: number) => void;
		// Called with the hovered message index, or null when the pointer leaves
		onHover?: (index: number | null) => void;
		// Passage to scroll to and mark, used when a summary point links back here
		focus?: { index: number; text: string } | null;
		tutor?: boolean;
	} = $props();

	let input = $state('');
	let container: HTMLDivElement;
	let selection = $state<{ text: string; source?: number; x: number; y: number } | null>(null);

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const text = input.trim();
		if (!text || chat.loading) return;
		input = '';
		sendMessage(text, { tutor });
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
			const start = range.startContainer;
			const el = (start instanceof Element ? start : start.parentElement)?.closest('[data-index]');
			const source = el ? Number(el.getAttribute('data-index')) : undefined;
			const rect = range.getBoundingClientRect();
			selection = { text, source, x: rect.left + rect.width / 2, y: rect.top };
		};
		document.addEventListener('selectionchange', onChange);
		return () => document.removeEventListener('selectionchange', onChange);
	});

	$effect(() => {
		if (!focus) return;
		container
			.querySelector(`[data-index="${focus.index}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});

	function add() {
		if (!selection) return;
		onAdd?.(selection.text, selection.source);
		document.getSelection()?.removeAllRanges();
		selection = null;
	}

	// Split a message around the focused passage so it can be wrapped in <mark>
	function parts(content: string, i: number) {
		const at = focus?.index === i ? content.indexOf(focus.text) : -1;
		if (at < 0 || !focus) return null;
		return [content.slice(0, at), focus.text, content.slice(at + focus.text.length)];
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div
		bind:this={container}
		onscroll={() => (selection = null)}
		class="flex flex-1 flex-col gap-2 overflow-y-auto"
	>
		{#each chat.messages as m, i (i)}
			{@const split = parts(m.content, i)}
			<p
				data-index={i}
				onmouseenter={() => onHover?.(i)}
				onmouseleave={() => onHover?.(null)}
				class={[
					'max-w-[75%] rounded-2xl px-4 py-2 whitespace-pre-wrap transition-shadow',
					m.role === 'user' ? 'self-end bg-blue-500 text-white' : 'self-start bg-gray-200',
					focus?.index === i && 'ring-2 ring-amber-400'
				]}
			>
				{#if split}{split[0]}<mark class="rounded bg-amber-200 px-0.5 text-gray-900"
						>{split[1]}</mark
					>{split[2]}{:else}{m.content}{/if}
			</p>
			{#if m.sources?.length}
				<ol class="-mt-1 mb-1 max-w-[75%] self-start pl-4 text-xs text-gray-500">
					<li class="font-semibold text-gray-600">Sources</li>
					{#each m.sources as s, n (s.url)}
						<li>
							[{n + 1}]
							<!-- External web source, not an app route -->
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={s.url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-violet-700 underline">{s.title}</a
							>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</li>
					{/each}
				</ol>
			{/if}
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
