// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync(new URL('../../../packages/ui/src/tokens.css', import.meta.url), 'utf8');
const colors = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]));
function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
it('retains the approved brand tokens and AA text pairings', () => {
  expect(colors).toMatchObject({'navy-900': '#0D2940', 'teal-600': '#087E79', 'mint-100': '#DDF4EA', canvas: '#F7F9F6', 'amber-500': '#E9AA40', 'coral-500': '#F16A50'});
  for (const [foreground, background] of [['ink', 'surface'], ['text-muted', 'surface'], ['text-muted', 'canvas'], ['text-muted', 'mint-100'], ['surface', 'teal-600'], ['teal-600', 'canvas'], ['navy-900', 'mint-100'], ['navy-900', 'amber-500'], ['navy-900', 'coral-500']]) {
    const a = luminance(colors[foreground]), b = luminance(colors[background]);
    expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
  }
});
