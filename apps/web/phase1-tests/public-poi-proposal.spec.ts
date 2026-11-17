import { test,expect } from '@playwright/test';
// Actual separate loopback contributor API and actual PostGIS; no draft/receipt interception.
test('UNI-026 synthetic held proposal uses real Nest/PostGIS without enabling guest writes',async({page,request},info)=>{
 await page.goto(process.env.PHASE1_PROPOSAL_BASE_URL!+'/contribute/place');await page.getByRole('button',{name:'Use synthetic draft example'}).click();
 await page.getByLabel(/Public business name/).fill('Synthetic Integrated Pharmacy '+info.project.name);await page.getByLabel(/Public entrance latitude/).fill(info.project.name==='mobile'?'20':'21');await page.getByLabel(/Public entrance longitude/).fill(info.project.name==='mobile'?'20':'21');
 await page.getByRole('checkbox',{name:/This draft describes/}).check();await page.getByRole('button',{name:'Check possible matches'}).click();await expect(page.getByRole('radio',{name:/Propose a distinct/})).toBeVisible();await page.getByRole('radio',{name:/Propose a distinct/}).check();await page.getByRole('textbox',{name:'Public business distinction'}).fill('Separate fictional public pharmacy for integration acceptance');
 await page.getByRole('button',{name:'Submit for review'}).click();await expect(page.getByRole('heading',{name:'3. Pending review'})).toBeFocused();await expect(page.getByText('Synthetic · not published')).toBeVisible();
 const id=await page.locator('.proposal-receipt code').textContent();expect((await request.get(process.env.PHASE1_PROPOSAL_BASE_URL!+'/api/places/'+id)).status()).toBe(404);
 await page.reload();await expect(page.getByLabel(/Public business name/)).toHaveValue('');await expect(page.locator('.proposal-receipt')).toHaveCount(0);
});
