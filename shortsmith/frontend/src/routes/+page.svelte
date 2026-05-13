<script lang="ts">
  import { goto } from '$app/navigation';
  import { uploadFile, ingestUrl } from '$lib/api';

  let mode: 'upload' | 'url' = 'upload';
  let url = '';
  let file: File | null = null;
  let dragging = false;
  let uploading = false;
  let uploadPct = 0;
  let error = '';

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const f = e.dataTransfer?.files[0];
    if (f) file = f;
  }

  function onFileInput(e: Event) {
    file = (e.target as HTMLInputElement).files?.[0] ?? null;
  }

  async function submit() {
    error = '';
    uploading = true;
    try {
      let result: { job_id: string };
      if (mode === 'upload') {
        if (!file) { error = 'Select a file first'; uploading = false; return; }
        result = await uploadFile(file, (pct) => { uploadPct = pct; });
      } else {
        if (!url.trim()) { error = 'Enter a YouTube URL'; uploading = false; return; }
        result = await ingestUrl(url.trim());
      }
      goto(`/jobs/${result.job_id}`);
    } catch (err: any) {
      error = err.message ?? 'Unknown error';
      uploading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-bold">Turn long videos into viral Shorts</h1>
    <p class="text-gray-400 text-lg">AI-powered moment detection, vertical reframing, and animated captions — self-hosted, no subscription.</p>
  </div>

  <!-- Mode tabs -->
  <div class="flex rounded-lg border border-brand-border overflow-hidden">
    <button
      class="flex-1 py-3 text-sm font-medium transition-colors {mode === 'upload' ? 'bg-brand-card text-white' : 'text-gray-400 hover:text-white'}"
      on:click={() => mode = 'upload'}
    >Upload file</button>
    <button
      class="flex-1 py-3 text-sm font-medium transition-colors {mode === 'url' ? 'bg-brand-card text-white' : 'text-gray-400 hover:text-white'}"
      on:click={() => mode = 'url'}
    >YouTube URL</button>
  </div>

  {#if mode === 'upload'}
    <!-- Drop zone -->
    <div
      role="button"
      tabindex="0"
      class="card p-12 text-center cursor-pointer transition-colors border-2 border-dashed {dragging ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border hover:border-gray-500'}"
      on:dragover|preventDefault={() => dragging = true}
      on:dragleave={() => dragging = false}
      on:drop={onDrop}
      on:click={() => document.getElementById('file-input')?.click()}
      on:keydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
    >
      <input id="file-input" type="file" accept="video/*,.mkv" class="hidden" on:change={onFileInput} />
      {#if file}
        <p class="text-brand-accent font-semibold text-lg">{file.name}</p>
        <p class="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB — click to change</p>
      {:else}
        <div class="text-5xl mb-4">🎬</div>
        <p class="text-lg font-medium">Drop video here or click to browse</p>
        <p class="text-gray-400 text-sm mt-2">MP4 · MOV · MKV · WebM · up to 4 hours</p>
      {/if}
    </div>
  {:else}
    <div class="card p-6 space-y-4">
      <label class="block text-sm font-medium text-gray-300">YouTube URL</label>
      <input
        type="url"
        bind:value={url}
        placeholder="https://www.youtube.com/watch?v=..."
        class="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-accent"
      />
    </div>
  {/if}

  {#if error}
    <p class="text-red-400 text-sm text-center">{error}</p>
  {/if}

  {#if uploading && mode === 'upload' && uploadPct > 0}
    <div class="space-y-2">
      <div class="flex justify-between text-sm text-gray-400">
        <span>Uploading...</span>
        <span>{(uploadPct * 100).toFixed(0)}%</span>
      </div>
      <div class="h-2 bg-brand-border rounded-full overflow-hidden">
        <div class="h-full bg-brand-accent transition-all duration-300" style="width: {uploadPct * 100}%" />
      </div>
    </div>
  {/if}

  <button
    class="btn-primary w-full py-4 text-base"
    on:click={submit}
    disabled={uploading}
  >
    {uploading ? 'Processing...' : 'Generate Shorts →'}
  </button>

  <div class="grid grid-cols-3 gap-4 pt-4 text-center text-sm text-gray-400">
    <div class="space-y-1"><div class="text-2xl">🤖</div><div>Claude AI scoring</div></div>
    <div class="space-y-1"><div class="text-2xl">📱</div><div>9:16 vertical crop</div></div>
    <div class="space-y-1"><div class="text-2xl">💬</div><div>Animated captions</div></div>
  </div>
</div>
