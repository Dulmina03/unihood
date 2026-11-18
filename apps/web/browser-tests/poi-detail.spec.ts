import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const id='40000000-0000-4000-8000-000000000001', selected='/explore?university=synthetic-demo-university&campus=20000000-0000-4000-8000-000000000001&entrance=30000000-0000-4000-8000-000000000001&category=essentials&view=list&poiCategory=pharmacy';
test('public service card to canonical detail, share, keyboard, history and responsive evidence',async({page,request},info)=>{
 await page.goto(selected);const link=page.getByRole('link',{name:'Details for Synthetic Demo Pharmacy'});await expect(link).toBeVisible();await expect(page.getByText('Location confirmation not recorded.')).toBeVisible();
 await link.focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Synthetic Demo Pharmacy',exact:true})).toBeVisible();await expect(page).toHaveURL(new RegExp('/places/'+id));
 await expect(page.getByText('Location confirmation not recorded.')).toBeVisible();await expect(page.getByText(/not a destination to visit/)).toBeVisible();await expect(page.locator('time')).toHaveAttribute('datetime','2026-11-16T00:00:00Z');await expect(page.locator('time')).toContainText('Asia/Colombo');
 await page.getByRole('button',{name:'Share public place',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();const shared=await page.getByRole('textbox',{name:'Shareable public place link'}).inputValue();expect(shared).toBe(`http://127.0.0.1:3180/places/${id}`);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Share public place',exact:true})).toBeFocused();
 await page.reload();await expect(page.getByRole('heading',{name:'Synthetic Demo Pharmacy',exact:true})).toBeVisible();
 await page.getByText('Information looks wrong?',{exact:true}).click();await expect(page.getByRole('link',{name:'Suggest a public place correction'})).toHaveAttribute('href','/contribute/correction?place='+id);await expect(page.getByText(/It stays held and cannot rewrite public facts/)).toBeVisible();await page.getByText('Information looks wrong?',{exact:true}).click();
 await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});const evidence=resolve(process.env.UI_EVIDENCE_DIR??'../../docs/verification/UNI-022');await mkdir(evidence,{recursive:true});await page.screenshot({path:`${evidence}/poi-detail-${info.project.name}.png`,fullPage:false});await page.screenshot({path:`${evidence}/poi-detail-${info.project.name}-full.png`,fullPage:true});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();await writeFile(`${evidence}/poi-detail-${info.project.name}-axe.json`,JSON.stringify({violations:axe.violations},null,2));expect(axe.violations).toEqual([]);
 for(const width of [320,768]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.setViewportSize(info.project.use.viewport!);
 await page.getByRole('link',{name:'Back to public exploration'}).click();await expect(page.getByRole('combobox',{name:'Service category',exact:true})).toHaveValue('pharmacy');await expect(page).toHaveURL(new RegExp('place='+id));await page.goBack();await expect(page.getByRole('heading',{name:'Synthetic Demo Pharmacy',exact:true})).toBeVisible();await page.goForward();await expect(page.locator('.poi-result-card')).toHaveCount(1);
 await page.goto(shared);await expect(page.getByRole('heading',{name:'Synthetic Demo Pharmacy',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Back to public exploration'})).toHaveAttribute('href','/explore');
 expect((await request.get('/api/places/'+id+'?lat=0')).status()).toBe(400);expect((await request.patch('/api/places/'+id,{headers:{'X-Role':'owner'}})).status()).toBe(405);
 const missing=await page.goto('/places/40000000-0000-4000-8000-000000000099');expect(missing?.status()).toBe(404);await expect(page.getByRole('heading',{name:'Public place not available'})).toBeVisible();
});
test('detail loading, sanitized failure and retry preserve a working public list alternative',async({page})=>{
 const failedId='40000000-0000-4000-8000-000000000098';
 await page.goto('/places/'+failedId);await expect(page.getByText('We couldn’t load this public place')).toBeVisible();await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/places/'+failedId,async route=>{await gate;await route.fulfill({json:{id:failedId,kind:'POI',name:'Synthetic recovery fixture',category:{code:'clinic',label:'Clinic'},location:{lat:0,lng:0},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic fault-recovery fixture; not a real business',verifiedAt:null},lastConfirmedAt:null,updatedAt:'2026-11-16T00:00:00Z'}});});
 await page.getByRole('button',{name:'Retry public place details'}).click();await expect(page.getByText('Loading public place details…',{exact:true})).toBeVisible();release();await expect(page.getByRole('heading',{name:'Synthetic recovery fixture',exact:true})).toBeFocused();
 await page.getByRole('link',{name:'Return to map / list'}).click();await expect(page.getByRole('heading',{name:/Explore around/})).toBeVisible();
});
