import { AnalysisMeme } from '../core/models';

// memegen.link bakes the caption onto the template image. It has strict path
// escaping rules (see https://memegen.link) — encode each caption line here.
function enc(s: string): string {
  const cleaned = (s || '')
    // Drop emoji / pictographs — they don't render on the image and break the URL.
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu, '')
    .trim();
  const escaped = cleaned
    .replace(/_/g, '__')
    .replace(/-/g, '--')
    .replace(/ /g, '_')
    .replace(/\?/g, '~q')
    .replace(/%/g, '~p')
    .replace(/#/g, '~h')
    .replace(/\//g, '~s')
    .replace(/&/g, '~a')
    .replace(/"/g, "''");
  return escaped || '_';
}

// Full memegen image URL for a meme, or null when there's no template id.
export function memegenUrl(m: AnalysisMeme | null | undefined): string | null {
  if (!m || !m.id) return null;
  return `https://api.memegen.link/images/${m.id}/${enc(m.top)}/${enc(m.bottom)}.png?width=600`;
}
