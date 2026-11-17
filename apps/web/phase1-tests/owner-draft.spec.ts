import { test,expect } from '@playwright/test';
// Actual existing contributor Nest/Next/PostGIS. Never enable owner authority on
// guest or contributor services; the positive owner check is separate HTTP coverage.
test('contributor cannot turn a wizard session into property owner authority',async({page})=>{
 await page.goto(process.env.PHASE1_PROPOSAL_BASE_URL!+'/owner/new');await page.getByRole('button',{name:'Check advertisements',exact:true}).click();await expect(page.getByText('4 public suggestions (first page).')).toBeVisible();await page.getByRole('button',{name:'Continue with fictional property A draft'}).click();await page.getByRole('button',{name:'Use fictional example'}).click();for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Check authority & save session draft'}).click();await expect(page.locator('.owner-panel').getByRole('alert')).toContainText('Owner authorization unavailable');expect(await page.evaluate(()=>sessionStorage.getItem('unihood:synthetic-owner-draft:v1'))).toBeNull();await expect(page.getByRole('heading',{name:'Synthetic Study courtyard'})).toBeVisible();
});
