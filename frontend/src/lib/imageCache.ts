const _blobUrls = new Map<string, string>();
const _inflight = new Map<string, Promise<string | null>>();

export function getCachedImageSync(src: string): string | null {
  return _blobUrls.get(src) ?? null;
}

export function getCachedImage(src: string): Promise<string | null> {
  const cached = _blobUrls.get(src);
  if (cached) return Promise.resolve(cached);
  if (_inflight.has(src)) return _inflight.get(src)!;

  const p = fetch(src, { referrerPolicy: "no-referrer" })
    .then((res) => (res.ok ? res.blob() : null))
    .then((blob) => {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      _blobUrls.set(src, url);
      _inflight.delete(src);
      return url;
    })
    .catch(() => {
      _inflight.delete(src);
      return null;
    });

  _inflight.set(src, p);
  return p;
}
