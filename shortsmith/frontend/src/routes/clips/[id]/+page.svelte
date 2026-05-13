<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import {
    getClips, patchClip, rerenderClip,
    clipDownloadUrl, clipThumbnailUrl, scoreColor,
    type Clip
  } from '$lib/api';

  const clipId = $page.params.id;
  const jobId = $page.url.searchParams.get('job') ?? '';

  let clip: Clip | null = null;
  let clips: Clip[] = [];
  let editStart = 0;
  let editEnd = 0;
  let editTitle = '';
  let saving = false;
  let rerendering = false;
  let showReasoning = false;
  let error = '';

  const DIMENSION_LABELS: Record<string, string> = {
    hook_strength: 'Hook',
    payoff: 'Payoff',
    self_containment: 'Self-contained',
    emotional_peak: 'Emotional peak',
    quotability: 'Quotability',
    retention_shape: 'Retention shape',
    novelty: 'Novelty',
  };

  onMount(async () => {
    if (jobId) {
      clips = await getClips(jobId);
      clip = clips.find(c => c.id === clipId) ?? null;
    }
    if (!clip) {
      const res = await fetch(`/api/clips/${clipId}`);
      if (res.ok) clip = await res.json();
    }
    if (clip) {
      editStart = clip.start;
      editEnd = clip.end;
      editTitle = clip.title;
    }
  });

  async function save() {
    if (!clip) return;
    saving = true;
    error = '';
    try {
      clip = await patchClip(clipId, {
        start: editStart,
        end: editEnd,
        title: editTitle,
      });
    } catch (e: any) {
      error = e.message;
    } finally {
      saving = false;
    }
  }

  async function rerender() {
    rerendering = true;
    error = '';
    try {
      await save();
      await rerenderClip(clipId);
      clip = { ...clip!, status: 'rendering', has_video: false, has_thumbnail: false };
    } catch (e: any) {
      error = e.message;
    } finally {
      rerendering = false;
    }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1).padStart(4, '0');
    return `${m}:${sec}`;
  }

  $: duration = editEnd - editStart;
  $: adjacentClips = clips.filter(c => c.id !== clipId);
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Back -->
  <a href={jobId ? `/jobs/${jobId}` : '/'} class="text-gray-400 hover:text-white text-sm flex items-center gap-1">
    ← Back to {jobId ? 'all clips' : 'home'}
  </a>

  {#if clip}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Preview + download -->
      <div class="space-y-4">
        <div class="card overflow-hidden">
          {#if clip.has_video && clip.status === 'done'}
            <video
              src={clipDownloadUrl(clipId)}
              class="w-full aspect-[9/16] object-contain bg-black"
              controls
              muted
              autoplay
              loop
            />
          {:else if clip.has_thumbnail}
            <img src={clipThumbnailUrl(clipId)} alt={clip.title} class="w-full aspect-[9/16] object-cover" />
          {:else}
            <div class="aspect-[9/16] flex items-center justify-center bg-brand-border text-4xl">
              {clip.status === 'rendering' ? '⏳' : clip.status === 'failed' ? '⚠️' : '🎬'}
            </div>
          {/if}
        </div>

        <div class="flex gap-3">
          {#if clip.status === 'done'}
            <a href={clipDownloadUrl(clipId)} download class="btn-primary flex-1 text-center py-3">
              ⬇ Download
            </a>
          {/if}
          <button on:click={rerender} disabled={rerendering} class="btn-ghost flex-1 py-3">
            {rerendering ? 'Re-rendering...' : '↺ Re-render'}
          </button>
        </div>

        {#if clip.warning}
          <div class="card p-3 border-yellow-500/30 bg-yellow-500/5 text-yellow-300 text-sm">
            ⚠ {clip.warning}
          </div>
        {/if}
      </div>

      <!-- Right: Score + editor -->
      <div class="space-y-5">
        <!-- Score header -->
        <div class="flex items-center gap-3">
          <span class="text-4xl font-black {scoreColor(clip.score).split(' ')[0]}">{clip.score}</span>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Virality score</p>
            <div class="flex gap-1 mt-0.5">
              {#each clip.suggested_hashtags.slice(0, 4) as tag}
                <span class="text-xs text-gray-400">#{tag}</span>
              {/each}
            </div>
          </div>
        </div>

        <!-- Dimension scores -->
        <div class="card p-4 space-y-2.5">
          {#each Object.entries(clip.dimension_scores) as [key, val]}
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-400 w-28 flex-shrink-0">{DIMENSION_LABELS[key] ?? key}</span>
              <div class="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all
                  {val >= 8 ? 'bg-green-500' : val >= 5 ? 'bg-yellow-400' : 'bg-red-500'}"
                  style="width: {val * 10}%"
                />
              </div>
              <span class="text-xs font-medium w-4">{val}</span>
            </div>
          {/each}
        </div>

        <!-- Why it works -->
        <div class="card p-4 space-y-2">
          <button
            class="flex items-center justify-between w-full text-left"
            on:click={() => showReasoning = !showReasoning}
          >
            <span class="text-sm font-medium text-gray-300">Why it works</span>
            <span class="text-gray-400 text-xs">{showReasoning ? '▲' : '▼'}</span>
          </button>
          {#if showReasoning}
            <p class="text-sm text-gray-300 leading-relaxed">{clip.why_it_works}</p>
            <p class="text-sm text-brand-yellow font-medium italic">"{clip.hook_line}"</p>
          {/if}
        </div>

        <!-- Mini editor -->
        <div class="card p-4 space-y-4">
          <h3 class="font-semibold text-sm text-gray-300">Edit clip</h3>

          <div class="space-y-1">
            <label class="text-xs text-gray-400">Title</label>
            <input
              type="text"
              bind:value={editTitle}
              class="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs text-gray-400">Start time</label>
              <div class="flex gap-2 items-center">
                <button on:click={() => editStart = Math.max(0, editStart - 2)} class="btn-ghost px-2 py-1 text-xs">−2s</button>
                <span class="text-sm font-mono text-white">{fmt(editStart)}</span>
                <button on:click={() => editStart = Math.min(editEnd - 1, editStart + 2)} class="btn-ghost px-2 py-1 text-xs">+2s</button>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-xs text-gray-400">End time</label>
              <div class="flex gap-2 items-center">
                <button on:click={() => editEnd = Math.max(editStart + 1, editEnd - 2)} class="btn-ghost px-2 py-1 text-xs">−2s</button>
                <span class="text-sm font-mono text-white">{fmt(editEnd)}</span>
                <button on:click={() => editEnd = editEnd + 2} class="btn-ghost px-2 py-1 text-xs">+2s</button>
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-400">Duration: <span class="text-white">{duration.toFixed(1)}s</span></p>

          {#if error}
            <p class="text-red-400 text-xs">{error}</p>
          {/if}

          <div class="flex gap-2">
            <button on:click={save} disabled={saving} class="btn-ghost flex-1 py-2 text-sm">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button on:click={rerender} disabled={rerendering} class="btn-primary flex-1 py-2 text-sm">
              {rerendering ? 'Queued...' : '↺ Re-crop & render'}
            </button>
          </div>
        </div>

        <!-- Hashtags -->
        {#if clip.suggested_hashtags.length}
          <div class="flex flex-wrap gap-2">
            {#each clip.suggested_hashtags as tag}
              <span class="text-xs bg-brand-card border border-brand-border px-2 py-1 rounded-full text-gray-300">#{tag}</span>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Other clips in this job -->
    {#if adjacentClips.length}
      <div class="space-y-3">
        <h2 class="font-semibold text-gray-300 text-sm">Other clips</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {#each adjacentClips as c (c.id)}
            <a href="/clips/{c.id}?job={jobId}" class="card overflow-hidden hover:border-brand-accent/50 transition-colors block">
              <div class="aspect-[9/16] bg-brand-border">
                {#if c.has_thumbnail}
                  <img src={clipThumbnailUrl(c.id)} alt={c.title} class="w-full h-full object-cover" />
                {/if}
              </div>
              <div class="p-2">
                <span class="score-badge text-xs {scoreColor(c.score)}">{c.score}</span>
                <p class="text-xs text-gray-300 mt-1 line-clamp-2">{c.title}</p>
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="text-center py-20 text-gray-400">Loading clip...</div>
  {/if}
</div>
