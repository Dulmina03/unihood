import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const id='71000000-0000-4000-8000-000000000001',requestId='46000000-0000-4000-8000-000000000001';
const receipt={requestId,boardingId:id,kind:'CONTACT_OWNER',status:'MOCK_PENDING',policyVersion:'boarding-request-mock-v1',synthetic:true,ownerNotified:false,locationDisclosed:false,duplicate:false,dataKind:'SYNTHETIC',createdAt:'2026-11-19T00:00:00Z'};
async function capture(page:import('@playwright/test').Page,name:string,project:string){const out=resolve(process.env.UI_EVIDENCE_DIR??'docs/verification/UNI-046');await mkdir(out,{recursive:true});await page.screenshot({path:`${out}/${name}-${project}.png`,fullPage:true});const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();await writeFile(`${out}/${name}-${project}-axe.json`,JSON.stringify(axe.violations,null,2));expect(axe.violations.filter(v=>!['region','landmark-one-main'].includes(v.id))).toEqual([]);}
test('UNI-046 owner contact and location requests stay an explicit local simulation',async({page},info)=>{
 await page.route('**/api/v1/boarding-requests**',async route=>{
  if(route.request().method()==='POST'){const body=JSON.parse(route.request().postData()??'{}');await route.fulfill({headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:3180','Cache-Control':'no-store'},json:{...receipt,kind:body.kind}});return;}
  const status={...receipt};delete (status as {duplicate?:boolean}).duplicate;await route.fulfill({headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:3180','Cache-Control':'no-store'},json:status});
 });
 await page.goto('/boardings/'+id);
 await expect(page.getByRole('heading',{name:'Synthetic Courtyard study home'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Contact owner/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Request location/})).toBeVisible();
 const main=await page.locator('main').textContent();
 expect(main).not.toMatch(/latitude|longitude|coordinates:|exact address|\+12025550100|555-0100/);
 await page.setViewportSize({width:info.project.name==='mobile'?390:1440,height:900});await capture(page,'boarding-request-actions',info.project.name);

 const trigger=page.getByRole('button',{name:/Contact owner/});await trigger.click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByText(/local simulation. No message is delivered/i)).toBeVisible();
 await expect(dialog.getByText(/No phone, email, coordinates or directions/)).toBeVisible();
 await dialog.getByLabel(/I acknowledge this is a simulated request/).check();
 await dialog.getByRole('button',{name:'Send mock contact request'}).click();
 await expect(dialog.getByRole('heading',{name:'Mock contact request pending.'})).toBeVisible();
 await expect(dialog.getByText(requestId)).toBeVisible();
 await expect(dialog.getByText(/not delivered/)).toBeVisible();
 await expect(dialog.getByText(/Owner notified/)).toBeVisible();
 await expect(dialog.getByText(/Location disclosed/)).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Check mock status'})).toBeVisible();
 await expect(page.locator('main')).not.toContainText(/synthetic:contributor|payload_hash|request_key/);
 await capture(page,'boarding-request-receipt',info.project.name);
 await dialog.getByRole('button',{name:'Check mock status'}).click();
 await expect(dialog.getByText(/Latest mock status/)).toBeVisible();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await expect(dialog).toBeHidden();
 await expect(trigger).toBeFocused();

 await page.getByRole('button',{name:/Request location/}).click();
 await expect(page.getByRole('dialog').getByText(/does not notify the owner, disclose coordinates/i)).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toBeHidden();
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
