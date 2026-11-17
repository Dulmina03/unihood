import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {OwnerPrivateContact} from '@unihood/contracts';

const id='00000000-0000-4000-8000-000000000001';
const assetId='90000000-0000-4000-8000-000000000001';
const stagingAssetId='90000000-0000-4000-8000-000000000002';

const overview={
  id,
  synthetic:true,
  maxBytes:5*1024*1024,
  maxAssets:20,
  storageConfigured:true,
  encryptionConfigured:true,
  scanner:'NOT_CONFIGURED',
  publicMediaDelivery:'DISABLED',
  publicContactDelivery:'DISABLED'
};

const mediaItem={
  id:assetId,
  requestKey:'91000000-0000-4000-8000-000000000001',
  revision:1,
  synthetic:true,
  state:'ACTIVE',
  previewAllowed:true,
  mime:'image/webp',
  bytes:12800,
  width:800,
  height:600,
  consent:'GRANTED',
  moderation:'PENDING',
  metadata:'STRIPPED',
  cleanupPending:false,
  createdAt:'2026-11-17T12:00:00.000Z'
};

const stagingItem={
  ...mediaItem,
  id:stagingAssetId,
  requestKey:'91000000-0000-4000-8000-000000000002',
  state:'STAGING',
  previewAllowed:false
};

const contactState:OwnerPrivateContact={
  id,
  synthetic:true,
  revision:1,
  state:'PRIVATE',
  maskedPhone:'•••0100',
  publicConsent:false,
  verification:'UNVERIFIED',
  publicAvailable:false,
  encryptionConfigured:true,
  readable:true
};

const eventsPage={
  items:[{
    id:'80000000-0000-4000-8000-000000000001',
    event:'MEDIA_QUARANTINED',
    assetId,
    occurredAt:'2026-11-17T12:00:00.000Z'
  }],
  page:{page:1,pageSize:20,hasNextPage:false}
};

const headers={
  'Access-Control-Allow-Origin':'http://127.0.0.1:3180',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'
};

async function capture(page:import('@playwright/test').Page,name:string,project:string){
  const out=resolve(process.env.UI_EVIDENCE_DIR??'../../docs/verification/UNI-037');
  await mkdir(out,{recursive:true});
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
  await page.screenshot({path:`${out}/${name}-${project}.png`});
  await page.screenshot({path:`${out}/${name}-${project}-full.png`,fullPage:true});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  await writeFile(`${out}/${name}-${project}-axe.json`,JSON.stringify({violations:axe.violations},null,2));
  expect(axe.violations).toEqual([]);
}

test('synthetic owner manages private quarantined images and preview without public delivery',async({page},info)=>{
  const mediaList=[mediaItem,stagingItem];
  await page.route('**/api/v1/owner/boardings/*/privacy/**',async r=>{
    if(r.request().method()==='OPTIONS'){await r.fulfill({status:204,headers});return;}
    const pathname=new URL(r.request().url()).pathname;
    if(pathname.endsWith('/overview'))return r.fulfill({headers,json:overview});
    if(pathname.endsWith('/events'))return r.fulfill({headers,json:eventsPage});
    if(pathname.endsWith('/content')){
      // 10x10 WebP image
      const webp=Buffer.from('UklGRjgAAABXRUJQVlA4ICwAAACQAQCdASoKAAoAAUAmJaACdLoAA5gA/vBTH+j64RZGX/7Gb/56P/z0f6hgAA==','base64');
      return r.fulfill({status:200,headers:{...headers,'Content-Type':'image/webp','Cache-Control':'no-store'},body:webp});
    }
    if(pathname.endsWith('/media')&&r.request().method()==='GET'){
      return r.fulfill({headers,json:{items:mediaList,page:{page:1,pageSize:20,hasNextPage:false}}});
    }
    if(pathname.includes('/media/')&&r.request().method()==='DELETE'){
      return r.fulfill({headers,json:{id,assetId,revision:2,synthetic:true,published:false,cleanupPending:false}});
    }
    await r.fulfill({status:404,headers});
  });

  await page.goto(`/owner/boardings/${id}/media`);
  await page.getByRole('button',{name:'Load current private state'}).click();
  await expect(page.getByRole('heading',{name:'A private place for your images.'})).toBeVisible();
  await expect(page.getByText('Private quarantine · pending review')).toBeVisible();
  await expect(page.getByText('Incomplete private upload')).toBeVisible();
  await expect(page.getByText('No public image URL is available.')).toBeVisible();

  // Test opening private preview
  await page.getByRole('button',{name:`Preview private image ${assetId.slice(-6)}`}).click();
  await expect(page.getByAltText(/Private sanitized image preview/)).toBeVisible();
  await expect(page.getByText('Private sanitized preview. No original metadata or public delivery.')).toBeVisible();

  await capture(page,'owner-media-preview',info.project.name);

  // Close preview
  await page.getByRole('button',{name:'Close private preview'}).click();
  await expect(page.getByRole('button',{name:'Close private preview'})).not.toBeVisible();

  // Test withdrawal modal
  await page.getByRole('button',{name:`Withdraw image consent ${assetId.slice(-6)}`}).click();
  await expect(page.getByRole('heading',{name:'Withdraw this private record?'})).toBeVisible();
  await page.getByRole('button',{name:'Keep private record'}).click();
  await expect(page.getByRole('heading',{name:'Withdraw this private record?'})).not.toBeVisible();

  // Responsive check
  for(const width of [320,768]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===768&&info.project.name==='desktop'){
      await page.screenshot({path:`${resolve(process.env.UI_EVIDENCE_DIR??'../../docs/verification/UNI-037')}/owner-media-tablet.png`,fullPage:true});
    }
  }

  await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');
});

test('synthetic owner manages private fictional contact and sharing intent without public exposure',async({page},info)=>{
  let currentContact:OwnerPrivateContact={...contactState,state:'ABSENT',maskedPhone:null,revision:0};
  await page.route('**/api/v1/owner/boardings/*/privacy/**',async r=>{
    if(r.request().method()==='OPTIONS'){await r.fulfill({status:204,headers});return;}
    const pathname=new URL(r.request().url()).pathname;
    if(pathname.endsWith('/overview'))return r.fulfill({headers,json:overview});
    if(pathname.endsWith('/events'))return r.fulfill({headers,json:eventsPage});
    if(pathname.endsWith('/contact')){
      if(r.request().method()==='GET')return r.fulfill({headers,json:currentContact});
      if(r.request().method()==='PUT'){
        currentContact={...contactState,revision:1};
        return r.fulfill({headers,json:{id,revision:1,synthetic:true,publicAvailable:false}});
      }
      if(r.request().method()==='DELETE'){
        currentContact={...contactState,state:'REMOVED' as const,maskedPhone:null,revision:2};
        return r.fulfill({headers,json:{id,revision:2,synthetic:true,publicAvailable:false}});
      }
    }
    await r.fulfill({status:404,headers});
  });

  await page.goto(`/owner/boardings/${id}/contact`);
  await page.getByRole('button',{name:'Load current private state'}).click();
  await expect(page.getByRole('heading',{name:'Your contact. Your choice.'})).toBeVisible();

  // Fill and store contact
  await page.getByRole('combobox',{name:'Fictional contact'}).selectOption('fictional-contact-a');
  await page.getByLabel('I acknowledge this stores only a fictional reference privately and proves no ownership.').check();
  await page.getByRole('button',{name:'Store private fictional contact'}).click();

  await expect(page.getByText('Private fixture mask: •••0100')).toBeVisible();
  await expect(page.getByText('Unverified · no public delivery')).toBeVisible();
  await expect(page.getByText('Sharing is off. No call, SMS or ownership proof exists.')).toBeVisible();

  await capture(page,'owner-contact',info.project.name);

  // Remove contact
  await page.getByRole('button',{name:'Remove private contact'}).click();
  await expect(page.getByRole('heading',{name:'Withdraw this private record?'})).toBeVisible();
  await page.getByRole('button',{name:'Confirm withdrawal'}).click();

  await expect(page.getByText('No readable contact value is displayed.')).toBeVisible();

  // Responsive check
  for(const width of [320,768]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===768&&info.project.name==='desktop'){
      await page.screenshot({path:`${resolve(process.env.UI_EVIDENCE_DIR??'../../docs/verification/UNI-037')}/owner-contact-tablet.png`,fullPage:true});
    }
  }

  await expect(page.locator('body')).not.toContainText('PRIVATE_CANARY');
  await expect(page.locator('body')).not.toContainText('5550100');
});
