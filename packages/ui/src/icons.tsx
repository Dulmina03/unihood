import type { SVGProps } from 'react';

const paths = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  lock: 'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4Zm8 5v3',
  users: 'M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3M14 3a4 4 0 0 1 0 8m7 10v-3a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  check: 'M5 12l4 4L19 6',
  shield: 'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6ZM8 12l3 3 5-6',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M3 6h18M3 12h18M3 18h18',
  bookmark: 'M6 3h12v19l-6-4-6 4Z',
  bed: 'M3 18V7m18 11V7M3 14h18M6 7h12v7H6Zm-3 11v4m18-4v4',
  filter: 'M3 6h18M6 12h12m-9 6h6',
  plus: 'M12 4v16M4 12h16',
  minus: 'M4 12h16',
  layers: 'm12 2 10 6-10 6L2 8Zm-10 12 10 6 10-6M2 18l10 6 10-6',
  info: 'M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  alert: 'm12 3 10 18H2Zm0 6v5m0 3v1',
  coffee: 'M4 7h12v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v2m5-2v2',
  clinic: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  bus: 'M5 17v4m14-4v4M5 4h14v14H5Zm0 8h14M8 16h1m6 0h1',
  compass: 'm16 8-3 5-5 3 3-5ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
} as const;
export type IconName = keyof typeof paths;
export function Icon({name, ...props}: SVGProps<SVGSVGElement> & {name: IconName}) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
