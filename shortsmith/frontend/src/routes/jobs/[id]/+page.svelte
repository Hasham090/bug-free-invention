<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { getJob, streamJobEvents, getClips, clipThumbnailUrl, scoreColor, allClipsZipUrl, type Job, type Clip } from '$lib/api';

  const jobId = $page.params.id;
  let job: Job | null = null;
  let clips: Clip[] = [];
  let stage = '';
  let stagePct = 0;
  let clipProgress: Record<string, { pct: number; msg: string }> = {};
  let done = false;
  let jobError = '';
  let unsubscribe: (() => void) | null = null;

  const STAGES = ['ingesting', 'transcribing', 'scoring', 'rendering', 'done'];
  const STAGE_LABELS: Record<string, string> = {
    ingesting: 'Ingesting video',
    transcribing: 'Transcribing audio',
    scoring: 'Finding viral moments',
    rendering: 'Rendering clips',
    done: 'Complete',
  };

  async function loadJob() {
    job = await getJob(jobId);
    stage = job.status;
  }

  async function refreshClips() {
    clips = await getClips(jobId);
  }

  onMount(async () => {
    await loadJob();

    if (job?.status === 'done') {
      done = true;
      await refreshClips();
      return;
    }

    if (job?.status === 'failed') {
      jobError = job.error ?? 'Unknown error';
      return;
    }

    unsubscribe = streamJobEvents(jobId, {
      onStage: (s) => { stage = s; },
      onProgress: (pct, msg) => { stagePct = pct; },
      onClipProgress: (clipId, pct, msg) => {
        clipProgress = { ...clipProgress, [clipId]: { pct, msg } };
      },
      onClipDone: async (clipId) => {
        await refreshClips();
      },
      onClipFailed: async () => { await refreshClips(); },
      onDone: async () => {
        done = true;
        stage = 'done';
        await refreshClips();
      },
      onError: (err) => { jobError = err; },
    });
  });

  onDestroy(() => unsubscribe?.());

  function stageIndex(s: string) {
    return STAGES.indexOf(s);
  }
</script>

<div class="space-y-8">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-2xl font-bold">{job?.video_title ?? 'Processing...'}</h1>
      {#if job?.duration_seconds}
        <p class="text-gray-400 text-sm mt-1">{(job.duration_seconds / 60).toFixed(1)} min source video</p>
      {/if}
    </div>
    {#if done && clips.length}
      <a href={allClipsZipUrl(jobId)} class="btn-primary flex items-center gap-2">
        ⬇ Download all ({clips.filter(c => c.status === 'done').length} clips)
      </a>
    {/if}
  </div>

  {#if jobError}
    <div class="card p-6 border-red-500/50 bg-red-500/5">
      <p class="text-red-400 font-medium">Processing failed</p>
      <p class="text-sm text-gray-400 mt-1">{jobError}</p>
    </div>
  {:else}
    <!-- Stage pipeline -->
    <div class="card p-6 space-y-5">
      <h2 class="font-semibold text-gray-300 text-sm uppercase tracking-wide">Pipeline</h2>
      <div class="space-y-3">
        {#each STAGES.filter(s => s !== 'done') as s}
          {@const current = stageIndex(stage) === stageIndex(s)}
          {@const completed = stageIndex(stage) > stageIndex(s) || done}
          <div class="flex items-center gap-4">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              {completed ? 'bg-green-500 text-white' : current ? 'bg-brand-accent text-white' : 'bg-brand-border text-gray-400'}">
              {completed ? '✓' : stageIndex(s) + 1}
            </div>
            <div class="flex-1">
              <div class="flex justify-between text-sm">
                <span class="{current ? 'text-white font-medium' : completed ? 'text-gray-300' : 'text-gray-500'}">
                  {STAGE_LABELS[s]}
                </span>
                {#if current && stagePct > 0}
                  <span class="text-gray-400">{(stagePct * 100).toFixed(0)}%</span>
                {/if}
              </div>
              {#if current && stagePct > 0}
                <div class="mt-1.5 h-1.5 bg-brand-border rounded-full overflow-hidden">
                  <div class="h-full bg-brand-accent transition-all duration-500 rounded-full" style="width: {stagePct * 100}%" />
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Clips grid (show as they complete) -->
    {#if clips.length}
      <div>
        <h2 class="text-lg font-bold mb-4">Clips ({clips.length})</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each clips as clip (clip.id)}
            <a href="/clips/{clip.id}?job={jobId}" class="card overflow-hidden group hover:border-brand-accent/50 transition-colors block">
              <!-- Thumbnail -->
              <div class="relative aspect-[9/16] max-h-48 bg-brand-border overflow-hidden">
                {#if clip.has_thumbnail}
                  <img src={clipThumbnailUrl(clip.id)} alt={clip.title} class="w-full h-full object-cover" />
                {:else}
                  <div class="w-full h-full flex items-center justify-center">
                    {#if clip.status === 'rendering' || clip.status === 'pending'}
                      <div class="text-center">
                        <div class="text-2xl mb-1">⏳</div>
                        {#if clipProgress[clip.id]}
                          <div class="text-xs text-gray-400">{(clipProgress[clip.id].pct * 100).toFixed(0)}%</div>
                        {/if}
                      </div>
                    {:else if clip.status === 'failed'}
                      <div class="text-2xl">⚠️</div>
                    {/if}
                  </div>
                {/if}

                <!-- Score badge -->
                <div class="absolute top-2 right-2">
                  <span class="score-badge {scoreColor(clip.score)}">{clip.score}</span>
                </div>
              </div>

              <div class="p-3 space-y-1">
                <p class="font-semibold text-sm line-clamp-2">{clip.title}</p>
                <p class="text-xs text-gray-400">{clip.duration.toFixed(0)}s</p>
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
