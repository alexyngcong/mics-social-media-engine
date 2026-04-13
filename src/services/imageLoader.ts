const cache = new Map<string, HTMLImageElement>();

/**
 * Load an image with CORS support and caching.
 * Returns null if the image fails to load (allows graceful fallback).
 */
export function loadImage(url: string, timeoutMs = 8000): Promise<HTMLImageElement | null> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(null);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      cache.set(url, img);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
}

/** Preload a set of images in parallel (fire-and-forget). */
export function preloadImages(urls: string[]): void {
  urls.forEach((url) => loadImage(url));
}
