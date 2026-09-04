/** Share-as-image: capture a section's DOM as a branded PNG and hand it to
 *  the native share sheet (WhatsApp etc.). Falls back to a download, and to
 *  the old link-share only when image capture is impossible. */
import { toPng } from 'html-to-image';

let meta = { hotel: 'FirstLight', date: '' };
export function setShareMeta(m: { hotel: string; date: string }) { meta = m; }

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent);

async function capture(el: HTMLElement): Promise<string> {
  const opts = {
    pixelRatio: 2,
    backgroundColor: '#EAEDF1',
    filter: (n: Node) => !(n instanceof HTMLElement && n.dataset.sharePill === '1'),
  };
  if (IOS) { try { await toPng(el, opts); } catch { /* warm-up render */ } }
  return toPng(el, opts);
}

async function compose(sectionPng: string, title: string): Promise<Blob> {
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img')); img.src = sectionPng; });
  const logo = new Image();
  await new Promise<void>(res => { logo.onload = () => res(); logo.onerror = () => res(); logo.src = '/icon-192.png'; });

  const PAD = 28, HEAD = 64, FOOT = 56, W = img.width + PAD * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = img.height + PAD * 2 + HEAD + FOOT;
  const g = c.getContext('2d')!;
  g.fillStyle = '#EAEDF1'; g.fillRect(0, 0, c.width, c.height);

  /* header: hotel + section left, date right */
  g.fillStyle = '#0A1F4D';
  g.font = '700 26px Manrope, sans-serif';
  g.fillText(meta.hotel, PAD, 40);
  g.fillStyle = '#6E7A96';
  g.font = '600 19px Manrope, sans-serif';
  g.fillText(title, PAD, 66);
  const d = g.measureText(meta.date).width;
  g.fillText(meta.date, W - PAD - d, 40);

  g.drawImage(img, PAD, PAD + HEAD);

  /* footer: mark + address */
  const fy = c.height - FOOT + 14;
  if (logo.width) g.drawImage(logo, PAD, fy - 2, 26, 26);
  g.fillStyle = '#6E7A96';
  g.font = '600 16px Manrope, sans-serif';
  g.fillText('FirstLight · firstlight.hbis.io', PAD + (logo.width ? 34 : 0), fy + 16);

  return await new Promise<Blob>((res, rej) =>
    c.toBlob(b => (b ? res(b) : rej(new Error('blob'))), 'image/png'));
}

/** Returns a short status string for the toast ('' = native sheet shown). */
export async function shareSectionImage(el: HTMLElement, title: string): Promise<string> {
  const blob = await compose(await capture(el), title);
  const file = new File([blob], `firstlight-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: `FirstLight — ${title}` }); return ''; }
    catch { return ''; /* user dismissed the sheet */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'Image saved';
}
