import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const id='40000000-0000-4000-8000-000000000001';
const headers={'Access-Control-Allow-Origin':'http://127.0.0.1:3180','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET, POST'};
const item={id,kind:'BOARDING_RECOMMENDATION',state:'HELD',createdAt:'2026-11-18T00:00:00Z',placeId:null,dataKind:'SYNTHETIC',riskDecision:'HOLD',riskLevel:'ELEVATED',riskRuleVersion:'risk-rules-v1',riskReasons:['RR-018-PUBLICATION-GATE-CLOSED'],riskExplanation:'Routine publication stays disabled until final identity and public-write gates pass.'};
async function capture(page:import('@playwright/test').Page,name:string,project:string){const out=resolve(process.env.UI_EVIDENCE_DIR??'docs/verification/UNI-045');await mkdir(out,{recursive:true});await page.screenshot({path:`${out}/${name}-${project}.png`});await page.screenshot({path:`${out}/${name}-${project}-full.png`,fullPage:true});const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();await writeFile(`${out}/${name}-${project}-axe.json`,JSON.stringify(axe,null,2));expect(axe.violations).toEqual([]);}
test('UNI-045 contribution history explains the safe versioned risk decision',async({page},info)=>{
 await page.route('**/api/v1/contributions?*',async route=>{await route.fulfill({headers,json:{items:[item],page:{page:1,pageSize:20,hasNextPage:false}}});});
 await page.goto('/contributions');await expect(page.getByRole('heading',{name:'Boarding recommendation'})).toBeVisible();
 await expect(page.getByText('Held by risk rules')).toBeVisible();
 await expect(page.getByText(/publication stays disabled/i)).toBeVisible();
 await expect(page.getByText(/risk-rules-v1/)).toBeVisible();
 expect(await page.locator('main').textContent()).not.toMatch(/score|PRIVATE_CANARY|fingerprint|payload_hash|synthetic:contributor/i);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:info.project.name==='mobile'?390:1440,height:900});await capture(page,'risk-history',info.project.name);
});
test('UNI-045 malformed risk identifiers stay private and recoverable',async({page})=>{
 let attempts=0;await page.route('**/api/v1/contributions?*',async route=>{attempts++;await route.fulfill({headers,json:{items:attempts===1?[{...item,riskReasons:['RR-999-UNKNOWN'],riskExplanation:'PRIVATE_CANARY contact evidence'}]:[item],page:{page:1,pageSize:20,hasNextPage:false}}});});
 await page.goto('/contributions');await expect(page.locator('main').getByRole('alert')).toContainText('Retry');expect(await page.locator('main').textContent()).not.toMatch(/PRIVATE_CANARY|RR-999/);
 await page.getByRole('button',{name:'Retry contributions'}).click();await expect(page.getByText('Held by risk rules')).toBeVisible();
});
