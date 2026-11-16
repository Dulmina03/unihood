import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { syntheticStyle } from './fixtures/map-style';
const evidence = resolve(process.env.UI_EVIDENCE_DIR ?? '../../docs/verification/UNI-014');
const key = 'unihood:guest-entrances:v1';
const identity = {universityId: '10000000-0000-4000-8000-000000000001', campusId: '20000000-0000-4000-8000-000000000001', entranceId: '30000000-0000-4000-8000-000000000001'};
const selected = `/explore?university=synthetic-demo-university&campus=${identity.campusId}&entrance=${identity.entranceId}&view=list`;
const primary = 'Synthetic Primary Gate', secondary = 'Synthetic Secondary Gate';
test('editorial discovery and saved notebook: keyboard save, persistence, responsive screenshots and axe', async ({page}, info) => {
  await page.goto(selected); await expect(page.getByRole('heading', {name: primary})).toBeVisible();
  const save = page.locator('.explore-result-list').getByRole('button', {name: `Save ${primary}`, exact: true});
  await save.focus(); await page.keyboard.press('Enter'); await expect(save).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.explore-result-list').getByRole('button', {name: `Save ${secondary}`, exact: true}).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual({version: 1, entrances: [identity, {...identity, entranceId: '30000000-0000-4000-8000-000000000002'}]});
  for (const width of [320,390,768,1440]) {await page.setViewportSize({width,height:900}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);}
  await page.setViewportSize(info.project.use.viewport!); await page.evaluate(() => document.fonts.ready);
  await page.locator('.explore-rail-content').evaluate((panel)=>{const filters=panel.querySelector('.discovery-refinements')!;panel.scrollTop+=filters.getBoundingClientRect().top-panel.getBoundingClientRect().top-12;}); await mkdir(evidence,{recursive:true});
  await page.screenshot({path:`${evidence}/discovery-${info.project.name}.png`});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await page.locator('.discovery-saved-link a').click();
  await expect(page.getByRole('heading', {name:primary})).toBeVisible(); await expect(page.getByRole('heading',{name:secondary})).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', {name:primary})).toBeVisible();
  for (const width of [320,390,768,1440]) {await page.setViewportSize({width,height:900}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);}
  await page.setViewportSize(info.project.use.viewport!); await page.evaluate(() => document.fonts.ready); await page.screenshot({path:`${evidence}/saved-${info.project.name}.png`});
  await page.getByRole('heading',{name:'Saved places',exact:true}).evaluate((heading)=>heading.scrollIntoView({block:'start'}));await page.screenshot({path:`${evidence}/saved-collection-${info.project.name}.png`});
  const report = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  await writeFile(`${evidence}/saved-${info.project.name}-axe.json`,JSON.stringify({violations:report.violations,passes:report.passes.map(item=>item.id)},null,2)+'\n'); expect(report.violations).toEqual([]);
  await page.getByRole('button',{name:`Remove ${primary} from favourites`}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Saved places',exact:true})).toBeFocused();
  await expect(page.getByRole('heading',{name:primary})).toHaveCount(0); await page.getByRole('button',{name:'Clear all saved'}).click(); await expect(page.getByText('Room for your next starting point')).toBeVisible();
});
test('saved selection/share, cross-tab synchronization, Back/Forward and stable guest links',async({page,context})=>{
  await page.goto(selected);await page.locator('.explore-result-list').getByRole('button',{name:`Save ${primary}`,exact:true}).click();
  const other=await context.newPage();await other.goto('/saved');await expect(other.getByRole('heading',{name:primary})).toBeVisible();
  await page.locator('.discovery-saved-link a').click();await page.getByRole('button',{name:`Share ${primary}`}).click();
  const link=await page.getByLabel('Shareable gate link').inputValue();expect(link).toContain(`entrance=${identity.entranceId}`);expect(link).not.toMatch(/lat=|lng=|saved=|role=|token=/);
  await context.grantPermissions(['clipboard-read','clipboard-write']);await page.getByRole('button',{name:'Copy gate link'}).click();await expect(page.getByText('Link copied.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(link);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Unavailable');}}}));
  await page.getByRole('button',{name:'Copy gate link'}).click();await expect(page.getByText('Copy is unavailable. Select the link above and copy it manually.')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:`Share ${primary}`})).toBeFocused();
  await other.getByRole('button',{name:`Remove ${primary} from favourites`}).click();await expect(page.getByText('Room for your next starting point')).toBeVisible();
  await page.goto(link);await expect(page.getByRole('heading',{name:primary})).toBeVisible();
  await page.getByRole('button',{name:'List',exact:true}).click();await page.locator('.explore-result-list').getByRole('button',{name:`Save ${primary}`,exact:true}).click();await expect(other.getByRole('heading',{name:primary})).toBeVisible();
  await page.locator('.discovery-saved-link a').click();await page.getByRole('link',{name:'Explore this gate'}).click();await expect(page).toHaveURL(link);
  await page.goBack();await expect(page.getByRole('heading',{name:primary})).toBeVisible();await page.goForward();await expect(page.getByLabel('Public entrance',{exact:true})).toHaveValue(identity.entranceId);await other.close();
});
test('refined URL filters synchronize real markers/results while preserving selected starting point',async({page})=>{
  await page.route('https://tiles.openfreemap.org/**',route=>route.request().url().endsWith('/styles/liberty')?route.fulfill({json:syntheticStyle,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort());
  await page.goto(`http://127.0.0.1:3181${selected.replace('&view=list','')}`);await expect(page.locator('.explore-context small')).toContainText('Map ready',{timeout:20000});
  await page.getByRole('button',{name:'List',exact:true}).click();await page.getByRole('combobox',{name:'Gate type',exact:true}).selectOption('primary');await page.getByRole('combobox',{name:'Sort entrances',exact:true}).selectOption('name');
  await expect(page.locator('.discovery-card')).toHaveCount(1);await page.getByRole('button',{name:'Map',exact:true}).click();await expect(page.locator('.campus-map-marker')).toHaveCount(1);expect(page.url()).toContain('gate=primary');expect(page.url()).toContain('sort=name');
  await page.reload();await expect(page.getByRole('combobox',{name:'Gate type',exact:true})).toHaveValue('primary');
  await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByRole('dialog').getByLabel('Entrance name filter').fill('Secondary');await page.getByRole('button',{name:'Apply filters'}).click();await expect(page.getByText('No entrances match')).toBeVisible();await expect(page.locator('.campus-map-marker')).toHaveCount(0);
  await page.goBack();await expect(page.getByLabel('Find a public entrance')).toHaveValue('');await expect(page.locator('.campus-map-marker')).toHaveCount(1);
  await page.goForward();await expect(page.getByLabel('Find a public entrance')).toHaveValue('Secondary');await page.getByRole('button',{name:'Reset result filters'}).click();await expect(page.locator('.campus-map-marker')).toHaveCount(2);
  await expect(page.getByRole('heading',{name:primary})).toBeVisible();await expect(page.locator('body')).not.toContainText(/\d+ km|\d+ min|Owner.verified/);
  await page.locator('.discovery-saved-link a').click();await expect.poll(()=>page.workers().length).toBe(0);await page.goBack();await expect(page.locator('.campus-map-marker')).toHaveCount(2);
});
test('corrupt/denied storage and failed writes retain useful browsing and explicit recovery',async({page})=>{
  await page.goto('/saved');await page.evaluate(({key,identity})=>{localStorage.setItem('unrelated','keep');localStorage.setItem(key,JSON.stringify({version:1,entrances:[{...identity,location:{lat:2,lng:3},name:'PRIVATE_CANARY'}]}));},{key,identity});await page.reload();
  await expect(page.getByText(/Saved data could not be read/)).toBeVisible();await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');await page.getByRole('button',{name:'Reset saved data'}).click();await expect(page.locator('.favourites-storage')).toBeFocused();expect(await page.evaluate(()=>localStorage.getItem('unrelated'))).toBe('keep');
  await page.goto(selected);await page.evaluate((key)=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('PRIVATE_CANARY');return original.call(this,k,v);};},key);
  const save=page.locator('.explore-result-list').getByRole('button',{name:`Save ${primary}`,exact:true});await save.click();await expect(page.getByText(/Saved storage is unavailable/)).toBeVisible();await expect(save).toHaveAttribute('aria-pressed','false');await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');
  await page.reload();await expect(save).toBeEnabled();await save.click();await expect(save).toHaveAttribute('aria-pressed','true');
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw Error('PRIVATE_CANARY');}}));await page.goto('/saved');await expect(page.getByText(/Saved storage is unavailable/)).toBeVisible();await page.getByRole('button',{name:'Retry saved storage'}).click();await page.getByRole('link',{name:'Find another starting point',exact:true}).click();await expect(page.getByRole('heading',{name:/Explore around/})).toBeVisible();
});
test('saved API loading/error/retry and removed records never substitute sensitive snapshots',async({page})=>{
  await page.goto('/saved');await page.evaluate(({key,identity})=>localStorage.setItem(key,JSON.stringify({version:1,entrances:[identity]})),{key,identity});
  let fail=true,release!:()=>void;const hold=new Promise<void>(done=>{release=done;});
  await page.route('**/api/universities?*',async route=>{await hold;if(fail)await route.fulfill({status:503,json:{message:'PRIVATE_CANARY'}});else await route.continue();});
  await page.reload();await expect(page.getByText('Loading saved public places…')).toBeVisible();release();await expect(page.getByText('We couldn’t check your saved places')).toBeVisible();await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');fail=false;await page.getByRole('button',{name:'Retry public directory'}).click();await expect(page.getByRole('heading',{name:'Saved places',exact:true})).toBeFocused();await expect(page.getByRole('heading',{name:primary})).toBeVisible();
  await page.route('**/entrances?*',route=>route.fulfill({json:{items:[],page:{page:1,pageSize:100,hasNextPage:false}}}));await page.reload();await expect(page.getByText('Saved entrance unavailable')).toBeVisible();await expect(page.getByRole('link',{name:'Explore this gate'})).toHaveCount(0);await expect(page.locator('body')).not.toContainText(identity.entranceId);
  await page.getByRole('button',{name:'Remove unavailable saved entrance 1'}).click();await expect(page.getByText('Room for your next starting point')).toBeVisible();
});
