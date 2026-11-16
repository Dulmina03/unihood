import { test,expect } from '@playwright/test';
import { syntheticStyle } from '../browser-tests/fixtures/map-style';
const path='/explore?university=synthetic-demo-university&campus=20000000-0000-4000-8000-000000000001&entrance=30000000-0000-4000-8000-000000000001&category=essentials';
test('UNI-021 public services use real Next/Nest/PostGIS with bounded category/name and URL selection',async({page,request},info)=>{
 // Only provider resources are mocked. No university/POI/category API interception.
 await page.route('https://tiles.openfreemap.org/**',route=>route.request().url().endsWith('/styles/liberty')?route.fulfill({json:syntheticStyle,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort());
 const response=await request.get('/api/places?bbox=-0.01,-0.01,0.01,0.01&pageSize=1');expect(response.status()).toBe(200);expect((await response.json()).page.hasNextPage).toBe(true);
 await page.goto(path);await expect(page.locator('.discovery-card')).toHaveCount(4);await expect(page.locator('.explore-context small')).toContainText('Map ready',{timeout:20000});
 await page.getByRole('combobox',{name:'Service category',exact:true}).selectOption('clinic');await expect(page.locator('.discovery-card')).toHaveCount(1);await expect(page.locator('.campus-map-marker')).toHaveCount(1);
 await page.getByRole('button',{name:'Select Synthetic Demo Clinic',exact:true}).click();await expect(page.locator('.explore-preview')).toBeFocused();await expect(page).toHaveURL(/place=40000000-0000-4000-8000-000000000003/);
 if(info.project.name==='mobile')await page.getByRole('button',{name:'Collapse results'}).click();await page.getByRole('button',{name:'Select Synthetic Demo Clinic on map · Synthetic example',exact:true}).click();
 await page.reload();await expect(page.getByRole('heading',{name:'Synthetic Demo Clinic',exact:true})).toHaveCount(2);await expect(page.getByRole('combobox',{name:'Service category',exact:true})).toHaveValue('clinic');
 await page.getByRole('button',{name:'List',exact:true}).click();await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);await page.goBack();await expect(page.locator('.explore-context small')).toContainText('Map ready',{timeout:20000});
 await page.goto(`${process.env.PHASE1_LIST_BASE_URL}${path}&view=list`);await expect(page.locator('.discovery-card')).toHaveCount(4);await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
});
test('UNI-022 public detail reads real PostGIS, preserves map selection and shares a canonical ID',async({page,request})=>{
 const id='40000000-0000-4000-8000-000000000003';
 await page.route('https://tiles.openfreemap.org/**',route=>route.request().url().endsWith('/styles/liberty')?route.fulfill({json:syntheticStyle,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort());
 const response=await request.get('/api/places/'+id);expect(response.status()).toBe(200);expect((await response.json()).name).toBe('Synthetic Demo Clinic');
 await page.goto(path+'&view=list&poiCategory=clinic');await page.getByRole('link',{name:'Details for Synthetic Demo Clinic'}).click();
 await expect(page.getByRole('heading',{name:'Synthetic Demo Clinic',exact:true})).toBeVisible();await expect(page.getByText('Location confirmation not recorded.')).toBeVisible();await expect(page.getByText(/Asia\/Colombo/)).toBeVisible();await page.reload();
 await page.getByRole('button',{name:'Share public place',exact:true}).click();const share=await page.getByRole('textbox',{name:'Shareable public place link'}).inputValue();expect(new URL(share).pathname).toBe('/places/'+id);expect(new URL(share).search).toBe('');await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Back to public exploration'}).click();await expect(page).toHaveURL(new RegExp('place='+id));await expect(page.locator('.explore-preview')).toContainText('Synthetic Demo Clinic');
 await page.getByRole('button',{name:'Map',exact:true}).click();await expect(page.locator('.explore-context small')).toContainText('Map ready',{timeout:20000});await expect(page.locator('.campus-map-marker')).toHaveCount(1);
 expect((await request.get('/api/places/40000000-0000-4000-8000-000000000099')).status()).toBe(404);
});
