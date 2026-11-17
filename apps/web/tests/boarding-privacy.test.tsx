import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import type {OwnerPrivateContact} from '@unihood/contracts';
import {OwnerPrivacyTools} from '../src/components/owner/privacy-tools';

const id='00000000-0000-4000-8000-000000000001';
const endpoint=`http://127.0.0.1:3001/api/v1/owner/boardings/${id}/privacy`;

const overview={
  id,
  synthetic:true as const,
  maxBytes:5*1024*1024,
  maxAssets:20,
  storageConfigured:true,
  encryptionConfigured:true,
  scanner:'NOT_CONFIGURED' as const,
  publicMediaDelivery:'DISABLED' as const,
  publicContactDelivery:'DISABLED' as const
};

const mediaItem={
  id:'90000000-0000-4000-8000-000000000001',
  requestKey:'91000000-0000-4000-8000-000000000001',
  revision:1,
  synthetic:true as const,
  state:'ACTIVE' as const,
  previewAllowed:true,
  mime:'image/webp' as const,
  bytes:10240,
  width:800,
  height:600,
  consent:'GRANTED' as const,
  moderation:'PENDING' as const,
  metadata:'STRIPPED' as const,
  cleanupPending:false,
  createdAt:'2026-11-17T12:00:00.000Z'
};

const stagingItem={
  ...mediaItem,
  id:'90000000-0000-4000-8000-000000000002',
  requestKey:'91000000-0000-4000-8000-000000000002',
  state:'STAGING' as const,
  previewAllowed:false
};

const contactState={
  id,
  synthetic:true as const,
  revision:1,
  state:'PRIVATE' as const,
  maskedPhone:'•••0100' as const,
  publicConsent:false,
  verification:'UNVERIFIED' as const,
  publicAvailable:false as const,
  encryptionConfigured:true,
  readable:true
};

const eventsPage={
  items:[{
    id:'80000000-0000-4000-8000-000000000001',
    event:'MEDIA_QUARANTINED' as const,
    assetId:mediaItem.id,
    occurredAt:'2026-11-17T12:00:00.000Z'
  }],
  page:{page:1,pageSize:20,hasNextPage:false}
};

afterEach(()=>{
  cleanup();
  vi.unstubAllGlobals();
});

it('loads private media state and displays quarantined items without public delivery URLs',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockImplementation(async(url)=>{
    const u=String(url);
    if(u.endsWith('/overview'))return Response.json(overview);
    if(u.includes('/events'))return Response.json(eventsPage);
    if(u.includes('/media'))return Response.json({items:[mediaItem,stagingItem],page:{page:1,pageSize:20,hasNextPage:false}});
    throw new Error('Unexpected URL: '+u);
  });
  vi.stubGlobal('fetch',fetcher);

  render(<OwnerPrivacyTools endpoint={endpoint} mode="media"/>);
  fireEvent.click(screen.getByRole('button',{name:'Load current private state'}));

  await screen.findByRole('heading',{name:'Prepare a private image'});
  expect(screen.getByText(/Private quarantine · pending review/)).toBeInTheDocument();
  expect(screen.getByText(/Incomplete private upload/)).toBeInTheDocument();
  expect(screen.getAllByText(/Metadata stripped; this is not content clearance/)).toHaveLength(2);
  expect(screen.queryByText(/PRIVATE_CANARY/)).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Preview private image/})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Retry incomplete image/})).toBeInTheDocument();
});

it('opens and closes private sanitized WebP preview using blob URL without public delivery',async()=>{
  const fakeBlob=new Blob([new Uint8Array([1,2,3])],{type:'image/webp'});
  const createUrlMock=vi.fn().mockReturnValue('blob:http://localhost/test-preview');
  const revokeUrlMock=vi.fn();
  vi.stubGlobal('URL',{createObjectURL:createUrlMock,revokeObjectURL:revokeUrlMock} as unknown as typeof URL);

  const fetcher=vi.fn<typeof fetch>().mockImplementation(async(url)=>{
    const u=String(url);
    if(u.endsWith('/overview'))return Response.json(overview);
    if(u.includes('/events'))return Response.json(eventsPage);
    if(u.includes('/media')&&!u.includes('/content'))return Response.json({items:[mediaItem],page:{page:1,pageSize:20,hasNextPage:false}});
    if(u.includes('/content')){
      return new Response(fakeBlob,{
        status:200,
        headers:{'Content-Type':'image/webp','Cache-Control':'no-store'}
      });
    }
    throw new Error('Unexpected URL: '+u);
  });
  vi.stubGlobal('fetch',fetcher);

  render(<OwnerPrivacyTools endpoint={endpoint} mode="media"/>);
  fireEvent.click(screen.getByRole('button',{name:'Load current private state'}));
  await screen.findByRole('button',{name:/Preview private image/});

  fireEvent.click(screen.getByRole('button',{name:/Preview private image/}));
  await screen.findByRole('button',{name:'Close private preview'});
  expect(createUrlMock).toHaveBeenCalled();
  expect(screen.getByAltText(/Private sanitized image preview/)).toHaveAttribute('src','blob:http://localhost/test-preview');

  fireEvent.click(screen.getByRole('button',{name:'Close private preview'}));
  expect(revokeUrlMock).toHaveBeenCalledWith('blob:http://localhost/test-preview');
  expect(screen.queryByRole('button',{name:'Close private preview'})).not.toBeInTheDocument();
});

it('requires consent checkbox and file for media upload and sends bounded multipart request',async()=>{
  const receipt={id,assetId:mediaItem.id,revision:2,synthetic:true,published:false,cleanupPending:false};
  const fetcher=vi.fn<typeof fetch>().mockImplementation(async(url,options)=>{
    const u=String(url);
    if(options?.method==='POST'&&u.endsWith('/media')){
      return Response.json(receipt);
    }
    if(u.endsWith('/overview'))return Response.json(overview);
    if(u.includes('/events'))return Response.json(eventsPage);
    if(u.includes('/media'))return Response.json({items:[],page:{page:1,pageSize:20,hasNextPage:false}});
    throw new Error('Unexpected URL: '+u);
  });
  vi.stubGlobal('fetch',fetcher);

  render(<OwnerPrivacyTools endpoint={endpoint} mode="media"/>);
  fireEvent.click(screen.getByRole('button',{name:'Load current private state'}));
  await screen.findByRole('button',{name:'Upload to private quarantine'});

  const fileInput=screen.getByLabelText(/Synthetic image/);
  const consentCheckbox=screen.getByLabelText(/I created this synthetic image/);
  const file=new File([new Uint8Array([255,216,255])],'test.jpg',{type:'image/jpeg'});

  fireEvent.change(fileInput,{target:{files:[file]}});
  fireEvent.click(consentCheckbox);

  const form=screen.getByRole('button',{name:'Upload to private quarantine'}).closest('form')!;
  fireEvent.submit(form);
  await waitFor(()=>expect(fetcher).toHaveBeenCalledWith(
    endpoint+'/media',
    expect.objectContaining({
      method:'POST',
      body:expect.any(FormData)
    })
  ));
});

it('loads private contact, stores fictional reference and handles unreadable key state safely',async()=>{
  let currentContact:OwnerPrivateContact=contactState;
  const contactReceipt={id,revision:2,synthetic:true,publicAvailable:false};
  const fetcher=vi.fn<typeof fetch>().mockImplementation(async(url,options)=>{
    const u=String(url);
    if(options?.method==='PUT'&&u.endsWith('/contact')){
      currentContact={...currentContact,revision:2};
      return Response.json(contactReceipt);
    }
    if(options?.method==='DELETE'&&u.endsWith('/contact')){
      currentContact={...currentContact,revision:3,state:'REMOVED' as const,maskedPhone:null};
      return Response.json({...contactReceipt,revision:3});
    }
    if(u.endsWith('/overview'))return Response.json(overview);
    if(u.includes('/events'))return Response.json(eventsPage);
    if(u.endsWith('/contact'))return Response.json(currentContact);
    throw new Error('Unexpected URL: '+u);
  });
  vi.stubGlobal('fetch',fetcher);

  render(<OwnerPrivacyTools endpoint={endpoint} mode="contact"/>);
  fireEvent.click(screen.getByRole('button',{name:'Load current private state'}));

  await screen.findByRole('heading',{name:'Current private contact'});
  expect(screen.getByText(/Private fixture mask: •••0100/)).toBeInTheDocument();
  expect(screen.getByText(/Unverified · no public delivery/)).toBeInTheDocument();

  // Test updating fictional contact
  fireEvent.change(screen.getByRole('combobox',{name:'Fictional contact'}),{target:{value:'fictional-contact-a'}});
  fireEvent.click(screen.getByLabelText(/I acknowledge this stores only a fictional reference privately/));
  fireEvent.click(screen.getByRole('button',{name:'Store private fictional contact'}));

  await waitFor(()=>expect(screen.getByText(/Private synthetic change acknowledged/)).toBeInTheDocument());

  // Test withdrawal / removal
  fireEvent.click(screen.getByRole('button',{name:'Remove private contact'}));
  await screen.findByRole('heading',{name:'Withdraw this private record?'});
  fireEvent.click(screen.getByRole('button',{name:'Confirm withdrawal'}));

  await waitFor(()=>expect(screen.getByText(/No readable contact value is displayed/)).toBeInTheDocument());
});
