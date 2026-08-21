export async function copyOrShareLink(url: string): Promise<'shared' | 'copied' | 'prompt' | 'cancelled'> {
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const tryClipboard = async (): Promise<'copied' | null> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        return 'copied';
      } catch {
        // Fall through to next strategy.
      }
    }
    return null;
  };

  const tryShare = async (): Promise<'shared' | 'cancelled' | null> => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Link do paciente',
          url,
        });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
    return null;
  };

  if (!isMobile) {
    const copied = await tryClipboard();
    if (copied) return copied;
  }

  if (isMobile) {
    const shared = await tryShare();
    if (shared) return shared;
  }

  const copied = await tryClipboard();
  if (copied) return copied;

  const shared = await tryShare();
  if (shared) return shared;

  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    window.prompt('Copie este link:', url);
  }
  return 'prompt';
}
