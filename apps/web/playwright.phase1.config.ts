import { defineConfig } from '@playwright/test';
// Only the owning runner supplies ephemeral loopback origins. Never target dev/staging.
function ownedOrigin(value: string | undefined) {
  if (process.env.PHASE1_ISOLATED !== '1' || !value) throw new Error('Run pnpm test:e2e; owned isolated services are required');
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Only owned loopback test origins are allowed');
  return url.origin;
}
const baseURL = ownedOrigin(process.env.PHASE1_BASE_URL);
ownedOrigin(process.env.PHASE1_LIST_BASE_URL);
ownedOrigin(process.env.PHASE1_PROPOSAL_BASE_URL);
export default defineConfig({
  testDir: './phase1-tests', fullyParallel: false, workers: 1, retries: 0,
  timeout: 60000, reporter: 'list', outputDir: '/tmp/unihood-phase1-results',
  use: {baseURL, reducedMotion: 'reduce', trace: 'retain-on-failure', launchOptions: {args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']}},
  projects: [{name: 'mobile', use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}}, {name: 'desktop', use: {viewport: {width: 1440, height: 900}}}],
});
