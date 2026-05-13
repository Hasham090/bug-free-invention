const BASE = '/api';

export interface Clip {
  id: string;
  job_id: string;
  start: number;
  end: number;
  duration: number;
  score: number;
  title: string;
  hook_line: string;
  why_it_works: string;
  suggested_hashtags: string[];
  dimension_scores: Record<string, number>;
  warning: string | null;
  status: 'pending' | 'rendering' | 'done' | 'failed';
  error: string | null;
  has_video: boolean;
  has_thumbnail: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  status: string;
  source_type: string;
  source_ref: string;
  video_title: string | null;
  duration_seconds: number | null;
  progress_pct: number;
  progress_stage: string;
  error: string | null;
  created_at: string;
  clip_count: number;
}

export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<{ job_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

    xhr.open('POST', `${BASE}/upload`);
    xhr.send(form);
  });
}

export async function ingestUrl(url: string): Promise<{ job_id: string }> {
  const res = await fetch(`${BASE}/ingest-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Failed: ${await res.text()}`);
  return res.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Job not found`);
  return res.json();
}

export function streamJobEvents(jobId: string, handlers: {
  onProgress?: (pct: number, stage: string) => void;
  onStage?: (stage: string) => void;
  onClipProgress?: (clipId: string, pct: number, msg: string) => void;
  onClipDone?: (clipId: string) => void;
  onClipFailed?: (clipId: string, error: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}): () => void {
  const es = new EventSource(`${BASE}/jobs/${jobId}/stream`);

  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    switch (data.type) {
      case 'progress':
        handlers.onProgress?.(data.pct, data.stage);
        break;
      case 'stage':
        handlers.onStage?.(data.stage);
        break;
      case 'clip_progress':
        handlers.onClipProgress?.(data.clip_id, data.pct, data.msg);
        break;
      case 'clip_done':
        handlers.onClipDone?.(data.clip_id);
        break;
      case 'clip_failed':
        handlers.onClipFailed?.(data.clip_id, data.error);
        break;
      case 'done':
        handlers.onDone?.();
        es.close();
        break;
      case 'error':
        handlers.onError?.(data.error);
        es.close();
        break;
    }
  };

  return () => es.close();
}

export async function getClips(jobId: string): Promise<Clip[]> {
  const res = await fetch(`${BASE}/clips?job_id=${jobId}`);
  if (!res.ok) throw new Error('Failed to load clips');
  return res.json();
}

export async function patchClip(clipId: string, patch: Partial<Pick<Clip, 'start' | 'end' | 'title'>>): Promise<Clip> {
  const res = await fetch(`${BASE}/clips/${clipId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update clip');
  return res.json();
}

export async function rerenderClip(clipId: string): Promise<void> {
  const res = await fetch(`${BASE}/clips/${clipId}/rerender`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to queue rerender');
}

export function clipDownloadUrl(clipId: string): string {
  return `${BASE}/clips/${clipId}/download`;
}

export function clipThumbnailUrl(clipId: string): string {
  return `${BASE}/clips/${clipId}/thumbnail`;
}

export function allClipsZipUrl(jobId: string): string {
  return `${BASE}/clips/job/${jobId}/download-all`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400 bg-green-400/10';
  if (score >= 65) return 'text-yellow-400 bg-yellow-400/10';
  return 'text-red-400 bg-red-400/10';
}
