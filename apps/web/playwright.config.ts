import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser-tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: '/tmp/unihood-ui-test-results',
  use: {baseURL: 'http://127.0.0.1:3180', reducedMotion: 'reduce', trace: 'retain-on-failure', launchOptions: {args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']}},
  projects: [
    {name: 'mobile', use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}},
    {name: 'desktop', use: {viewport: {width: 1440, height: 900}}},
  ],
  webServer: {command: 'node browser-tests/start-landing-server.mjs', url: 'http://127.0.0.1:3180/design-system', reuseExistingServer: false, timeout: 60000},
});
