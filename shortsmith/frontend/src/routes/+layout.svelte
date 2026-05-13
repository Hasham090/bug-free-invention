<script lang="ts">
  import '../app.css';
</script>

<nav class="border-b border-brand-border px-6 py-4 flex items-center gap-3">
  <a href="/" class="flex items-center gap-2 font-bold text-lg">
    <span class="text-2xl">✂</span>
    <span>ShortSmith</span>
  </a>
  <span class="text-brand-border ml-1">|</span>
  <span class="text-sm text-gray-400">Self-hosted Shorts generator</span>
</nav>

<main class="max-w-6xl mx-auto px-4 py-8">
  <slot />
</main>
