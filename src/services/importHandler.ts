/**
 * IMPORT HANDLER — Claude.ai bookmarklet payload ingestion
 *
 * Reads `?import=`, `?title=`, `?model=` from the current URL, decodes
 * the (optionally gzipped) payload, and returns a structured object
 * the AIBriefPaste view can auto-fill.
 *
 * Payload format (set by the bookmarklet in claudeBookmarklet.ts):
 *   "g:<base64>" — gzip-compressed bytes, base64-encoded
 *   "p:<base64>" — plain UTF-8 bytes, base64-encoded (Safari fallback)
 *
 * After successful read, the URL is cleaned (history.replaceState) so a
 * refresh doesn't re-trigger the import.
 */

export interface ImportPayload {
  raw: string;            // decoded plain text of the Claude message
  title: string;          // conversation title (provenance)
  model: string;          // e.g. "sonnet-4.6"
  importedAtMs: number;
}

/**
 * Read & decode the import payload from the current URL.
 * Returns null if no `?import=` param is present or decoding fails.
 */
export async function readImportFromUrl(): Promise<ImportPayload | null> {
  const params = new URLSearchParams(window.location.search);
  const importRaw = params.get('import');
  if (!importRaw) return null;

  const title = params.get('title') || 'Claude chat';
  const model = params.get('model') || 'sonnet-4.6';

  try {
    const payload = await decodePayload(importRaw);
    // Clean URL so a reload doesn't re-import
    cleanImportParamsFromUrl();
    return {
      raw: payload,
      title,
      model,
      importedAtMs: Date.now(),
    };
  } catch (e) {
    console.warn('[import] Failed to decode bookmarklet payload:', e);
    cleanImportParamsFromUrl();
    return null;
  }
}

/** Decode either "g:<b64-gzip>" or "p:<b64-plain>" → utf-8 string */
async function decodePayload(payload: string): Promise<string> {
  const colonIdx = payload.indexOf(':');
  const scheme = colonIdx > 0 ? payload.slice(0, colonIdx) : '';
  const b64 = colonIdx > 0 ? payload.slice(colonIdx + 1) : payload;

  if (scheme === 'p') {
    // Plain base64-encoded UTF-8 (Safari fallback path in the bookmarklet)
    return decodeURIComponent(escape(atob(b64)));
  }

  if (scheme === 'g') {
    // gzip-compressed payload
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Browser does not support DecompressionStream — open in Chrome/Edge/Firefox 113+');
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Blob([bytes]).stream().pipeThrough(ds);
    const text = await new Response(decompressedStream).text();
    return text;
  }

  // No scheme prefix — treat as plain base64 for forward compat
  try {
    return decodeURIComponent(escape(atob(payload)));
  } catch {
    throw new Error('Unknown payload scheme');
  }
}

/** Strip the import-related query params so the URL is clean */
function cleanImportParamsFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('import');
    url.searchParams.delete('title');
    url.searchParams.delete('model');
    url.searchParams.delete('v');
    const newUrl = url.pathname + (url.search ? url.search : '') + url.hash;
    window.history.replaceState({}, document.title, newUrl);
  } catch {
    /* ignore — URL cleanup is best-effort */
  }
}
