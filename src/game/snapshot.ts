export interface SnapshotStats {
  netWorth: number;
  day: number;
  reputation: number;
  storeCount: number;
}

/**
 * Composes the current city canvas + a stats banner into a single PNG.
 * Relies on `preserveDrawingBuffer: true` on the game's Canvas so the last
 * rendered frame is still readable when we draw it into a 2D canvas.
 */
export async function captureEmpireSnapshot(stats: SnapshotStats): Promise<Blob | null> {
  const sourceCanvas = document.querySelector('canvas');
  if (!sourceCanvas) return null;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  if (w === 0 || h === 0) return null;

  const card = document.createElement('canvas');
  card.width = w;
  card.height = h;
  const ctx = card.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  const bannerHeight = Math.round(h * 0.2);
  const gradient = ctx.createLinearGradient(0, h - bannerHeight, 0, h);
  gradient.addColorStop(0, 'rgba(10,12,10,0)');
  gradient.addColorStop(1, 'rgba(10,12,10,0.88)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, h - bannerHeight, w, bannerHeight);

  const pad = Math.max(12, Math.round(w * 0.025));
  const titleSize = Math.max(16, Math.round(w * 0.028));
  const statSize = Math.max(12, Math.round(w * 0.018));

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${titleSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillText('TradeCity — My Empire', pad, h - bannerHeight + titleSize + pad * 0.4);

  ctx.font = `600 ${statSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const storeWord = stats.storeCount === 1 ? 'store' : 'stores';
  const line = `Net worth $${Math.round(stats.netWorth).toLocaleString()}  ·  Day ${stats.day}  ·  Reputation ${Math.round(stats.reputation)}  ·  ${stats.storeCount} ${storeWord}`;
  ctx.fillText(line, pad, h - pad * 1.2);

  return new Promise((resolve) => card.toBlob((blob) => resolve(blob), 'image/png'));
}

export type ShareResult = 'shared' | 'cancelled' | 'downloaded' | 'failed';

/** One-tap share: native share sheet when available, falling back to a direct download. */
export async function shareEmpireSnapshot(stats: SnapshotStats): Promise<ShareResult> {
  const blob = await captureEmpireSnapshot(stats);
  if (!blob) return 'failed';

  const file = new File([blob], 'tradecity-empire.png', { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: 'My TradeCity Empire',
        text: `Net worth $${Math.round(stats.netWorth).toLocaleString()} on Day ${stats.day}!`,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      // fall through to the download fallback
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tradecity-empire.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
