import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const ownerAd='71000000-0000-4000-8000-000000000001',communityAd='71000000-0000-4000-8000-000000000003';
async function capture(page:import('@playwright/test').Page,name:string,project:string){const out=resolve(process.env.UI_EVIDENCE_DIR??'docs/verification/UNI-047');await mkdir(out,{recursive:true});await page.setViewportSize({width:project==='mobile'?390:1440,height:900});await page.screenshot({path:`${out}/${name}-${project}.png`,fullPage:true});const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();await writeFile(`${out}/${name}-${project}-axe.json`,JSON.stringify({url:page.url(),violations:axe.violations},null,2));}
test('UNI-047 visitor surfaces expose neither owner controls nor private owner/student data',async({page},info)=>{
 const ownerCalls:string[]=[];page.on('request',request=>{if(request.url().includes('/api/v1/owner'))ownerCalls.push(request.url());});
 await page.goto('/boardings/'+ownerAd);
 await expect(page.getByRole('heading',{name:'Synthetic Courtyard study home'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Contact owner/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Request location/})).toBeVisible();
 const ownerMain=(await page.locator('main').textContent())??'';
 expect(ownerMain).not.toMatch(/Manage advertisement|Owner controls|Privacy settings|Contact details|Set price|Vacancy controls|latitude|longitude|coordinates:|\+12025550100|555-0100|synthetic:owner|synthetic:contributor/);
 await capture(page,'owner-public-request-surface',info.project.name);
 expect(ownerCalls).toEqual([]);

 await page.goto('/boardings/'+communityAd);
 await expect(page.getByRole('heading',{name:'Synthetic Shared chapter'})).toBeVisible();
 const communityMain=page.locator('main');
 await expect(communityMain.getByRole('button',{name:/Contact owner/})).toHaveCount(0);
 await expect(communityMain.getByRole('button',{name:/Request location/})).toHaveCount(0);
 const communityText=(await communityMain.textContent())??'';
 expect(communityText).not.toMatch(/Owner controls|Manage advertisement|Privacy settings|Contact details|latitude|longitude|\+12025550100|555-0100|synthetic:owner|synthetic:contributor/);
 await capture(page,'community-recommendation-no-owner-actions',info.project.name);
 expect(ownerCalls).toEqual([]);

 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toMatch(/latitude|longitude|synthetic:owner|synthetic:contributor|555-0100/);
});
