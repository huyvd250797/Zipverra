import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMainSourceZipInfo, getMainSourceZipStream, commitZipFilename,
  validateArchiveRedirect, validateSourceZipRequest, DOWNLOAD_BRANCH, MAX_SOURCE_ZIP_BYTES } from '../lib/source-zip.js';
import { AppError } from '../lib/github.js';
import { encodeSession, cookieName } from '../lib/auth/session.js';
import { GET } from '../app/api/github/source-zip/route.js';

const SHA = 'a'.repeat(40);
const archiveLink = 'https://codeload.github.com/alice/demo/legacy.zip/abcdef?token=short_lived';
const zip = new Uint8Array([0x50,0x4b,0x03,0x04,0x14,0,0,0,0,0,12,34,56,78]);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function mocks(extra={}) {
  const calls=[];
  return { calls, options: {
    checkGrant:async (...args)=>{ calls.push(['grant',...args]); },
    read:async (token,path)=>{calls.push(['read',path]); if(path.endsWith('/heads/main'))return {object:{sha:SHA}};
      if(path.endsWith(`/git/commits/${SHA}`))return {message:'Zipverra Pro v3.0.2 — Release\nLonger details'};
      throw Error('Unexpected read');},
    fetcher:async (url,opts)=>{calls.push(['archive',url,opts]);return new Response(null,{status:302,headers:{Location:archiveLink}});},
    downloadFetcher:async (url,opts)=>{calls.push(['codeload',url,opts]);return new Response(zip,{status:200,headers:{'Content-Type':'application/zip','Content-Length':String(zip.length)}});},
    ...extra,
  }};
}

test('downloads only main and rejects malformed repository parameters',()=>{
  assert.equal(DOWNLOAD_BRANCH,'main');
  assert.deepEqual(validateSourceZipRequest('alice','demo'),{owner:'alice',repo:'demo',branch:'main'});
  for(const [owner,repo] of [['../etc','demo'],['alice','../../other'],['alice',''],['','demo'],['alice','repo?branch=dev']])
    assert.throws(()=>validateSourceZipRequest(owner,repo),e=>e.code==='INVALID_ARCHIVE_REPOSITORY');
});

test('only the matching HTTPS codeload ZIP location is accepted on server',()=>{
  assert.equal(validateArchiveRedirect(archiveLink,'alice','demo'),archiveLink);
  for(const link of ['https://codeload.github.com.evil.test/alice/demo/legacy.zip/main',
    'https://evil.test/alice/demo/legacy.zip/main','http://codeload.github.com/alice/demo/legacy.zip/main',
    'https://user:secret@codeload.github.com/alice/demo/legacy.zip/main',
    'https://codeload.github.com/other/demo/legacy.zip/main',
    'https://codeload.github.com/alice/other/legacy.zip/main',
    'https://codeload.github.com/alice/demo/legacy.tar/main','javascript:alert(1)',''])
    assert.throws(()=>validateArchiveRedirect(link,'alice','demo'),e=>e.code==='ARCHIVE_REDIRECT_INVALID');
});

test('archive naming uses sanitized HEAD commit subject rather than Zipverra-main',()=>{
  assert.equal(commitZipFilename('Zipverra Pro v3.0.2\nUpdate details','Zipverra',SHA),'Zipverra_Pro_v3.0.2.zip');
  assert.equal(commitZipFilename('Nâng cấp bản mới 🚀 / release: 3.0.2','demo',SHA),'Nang_cap_ban_moi_release_3.0.2.zip');
  assert.equal(commitZipFilename('../../bad\r\nX-Injection: wow','demo',SHA),'bad.zip');
  assert.equal(commitZipFilename('', 'demo',SHA),`demo-${SHA.slice(0,12)}.zip`);
  const name=commitZipFilename('n'.repeat(600),'demo',SHA);
  assert.ok(name.length<=109);
  assert.match(name,/^[A-Za-z0-9._-]+\.zip$/);
});

test('checks GitHub grant and resolves immutable main SHA for archive and commit filename',async()=>{
  const m=mocks();
  const info=await getMainSourceZipInfo('server-only-token','alice','demo',m.options);
  assert.equal(info.sha,SHA);
  assert.equal(info.filename,'Zipverra_Pro_v3.0.2_Release.zip');
  assert.equal(info.url,archiveLink);
  assert.deepEqual(m.calls.map(v=>v[0]),['grant','read','read','archive']);
  assert.match(m.calls[1][1],/git\/ref\/heads\/main$/);
  assert.match(m.calls[2][1],new RegExp(`/git/commits/${SHA}$`));
  assert.match(m.calls[3][1],new RegExp(`zipball/${SHA}$`));
  assert.equal(m.calls[3][2].headers.Authorization,'Bearer server-only-token');
  assert.doesNotMatch(JSON.stringify(info),/server-only-token/);
});

test('server streams confirmed ZIP without buffering it or forwarding token to codeload',async()=>{
  const m=mocks();
  const download=await getMainSourceZipStream('server-only-token','alice','demo',m.options);
  assert.equal(download.filename,'Zipverra_Pro_v3.0.2_Release.zip');
  assert.equal(download.contentLength,zip.length);
  assert.equal(m.calls.at(-1)[0],'codeload');
  assert.equal(m.calls.at(-1)[1],archiveLink);
  assert.equal(m.calls.at(-1)[2].headers.Authorization,undefined);
  assert.deepEqual(new Uint8Array(await new Response(download.stream).arrayBuffer()),zip);
});

test('even ZIP streams with unknown content length work; short fragmented headers are assembled safely',async()=>{
  const chunks=[zip.slice(0,1),zip.slice(1,3),zip.slice(3,5),zip.slice(5)];
  const m=mocks({downloadFetcher:async()=>new Response(new ReadableStream({
    pull(controller){if(chunks.length)controller.enqueue(chunks.shift());else controller.close();}
  }),{status:200})});
  const dl=await getMainSourceZipStream('token','alice','demo',m.options);
  assert.equal(dl.contentLength,null);
  assert.deepEqual(new Uint8Array(await new Response(dl.stream).arrayBuffer()),zip);
});

test('does not send HTML under ZIP filename when GitHub archive endpoint fails',async()=>{
  const m=mocks({downloadFetcher:async()=>new Response('<html>denied</html>',{status:200,headers:{'content-type':'text/html'}})});
  await assert.rejects(()=>getMainSourceZipStream('token','alice','demo',m.options),e=>e.code==='CODELOAD_NOT_ZIP');
  for(const status of [403,404,429,302]){
    const alt=mocks({downloadFetcher:async()=>new Response('error',{status})});
    await assert.rejects(()=>getMainSourceZipStream('token','alice','demo',alt.options),e=>e.code==='CODELOAD_INVALID_RESPONSE');
  }
});

test('rejects overlarge ZIP by Content-Length before download starts',async()=>{
  let cancelCount=0;
  const m=mocks({downloadFetcher:async()=>new Response(new ReadableStream({cancel(){cancelCount++;}}),{
    status:200,headers:{'content-length':String(MAX_SOURCE_ZIP_BYTES+1)}
  })});
  await assert.rejects(()=>getMainSourceZipStream('token','alice','demo',m.options),e=>e.code==='SOURCE_ZIP_TOO_LARGE');
  assert.equal(cancelCount,1);
});

test('refuses unauthenticated and malformed requests without contacting GitHub',async()=>{
  const r=await GET(new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo'));
  assert.equal(r.status,401);assert.equal(r.headers.get('Location'),null);assert.match(r.headers.get('cache-control'),/no-store/);
  for(const query of ['?owner=alice','?owner=alice&repo=demo&repo=second','?owner=../etc&repo=demo']){
    const v=await GET(new Request(`https://zipverra.example/api/github/source-zip${query}`));
    assert.equal(v.status,400);assert.equal(v.headers.get('Location'),null);
  }
});

async function withPrivateSession(handler, sessionToken='github_token_private'){
  const oldSecret=process.env.SESSION_SECRET, oldFetch=globalThis.fetch;
  process.env.SESSION_SECRET='v3.0.2-source-zip-test-secret-not-for-production-123';
  const now=Date.now();
  const session={token:sessionToken,refreshToken:'refresh_private',tokenExpiresAt:now+3600000,
    refreshExpiresAt:now+86400000,user:{id:17,login:'alice'}};
  const cookie=`${cookieName('session')}=${encodeSession(session)}`;
  try {return await handler({cookie,replaceFetch(fn){globalThis.fetch=fn;}});}
  finally {globalThis.fetch=oldFetch; if(oldSecret===undefined)delete process.env.SESSION_SECRET;else process.env.SESSION_SECRET=oldSecret;}
}

test('private repo download sends ZIP attachment with commit-based filename and no redirect',async()=>{
  await withPrivateSession(async ({cookie,replaceFetch})=>{
    const calls=[];
    replaceFetch(async (url,opts)=>{
      const addr=String(url);calls.push({addr,opts});
      if(addr.includes('/user/installations?'))return Response.json({installations:[{id:1,account:{login:'alice'},permissions:{contents:'write'}}]});
      if(addr.includes('/user/installations/1/repositories?'))return Response.json({repositories:[{full_name:'alice/demo',permissions:{push:true}}]});
      if(addr.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:SHA}});
      if(addr.endsWith(`/git/commits/${SHA}`))return Response.json({message:'Zipverra Pro v3.0.2: Source ZIP Download'});
      if(addr.endsWith(`/zipball/${SHA}`))return new Response(null,{status:302,headers:{Location:archiveLink}});
      if(addr===archiveLink){assert.equal(opts.headers.Authorization,undefined);return new Response(zip,{status:200,headers:{'content-type':'application/zip'}});}
      throw Error(`Unexpected network request: ${addr}`);
    });
    const response=await GET(new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo',{headers:{Cookie:cookie}}));
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Location'),null);
    assert.equal(response.headers.get('Content-Type'),'application/zip');
    assert.equal(response.headers.get('Content-Disposition'),'attachment; filename="Zipverra_Pro_v3.0.2_Source_ZIP_Download.zip"');
    assert.match(response.headers.get('cache-control'),/no-store/);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),zip);
    assert.equal(calls.length,6);
    assert.ok(calls.slice(0,-1).every(x=>x.addr.startsWith('https://api.github.com/')));
    assert.ok(calls.every(x=>!x.addr.includes('github_token_private')));
  });
});

test('revoked GitHub App grant cannot access the server-side codeload fetch',async()=>{
  await withPrivateSession(async ({cookie,replaceFetch})=>{
    let calls=0;
    replaceFetch(async(url)=>{calls++;if(String(url).includes('/user/installations?'))return Response.json({installations:[]});throw Error('Must not fetch ZIP');});
    const r=await GET(new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo',{headers:{Cookie:cookie}}));
    assert.equal(r.status,403);assert.equal(calls,1);assert.equal(r.headers.get('Location'),null);
  });
});

test('missing main prevents reading commit or fetching ZIP',async()=>{
  await withPrivateSession(async ({cookie,replaceFetch})=>{
    const calls=[];
    replaceFetch(async(url)=>{
      const a=String(url);calls.push(a);
      if(a.includes('/user/installations?'))return Response.json({installations:[{id:1,account:{login:'alice'},permissions:{contents:'write'}}]});
      if(a.includes('/user/installations/1/repositories?'))return Response.json({repositories:[{full_name:'alice/demo',permissions:{push:true}}]});
      if(a.endsWith('/git/ref/heads/main'))return Response.json({message:'Not Found'},{status:404});
      throw Error('Must not fetch ZIP');
    });
    const r=await GET(new Request('https://zipverra.example/api/github/source-zip?owner=alice&repo=demo',{headers:{Cookie:cookie}}));
    assert.equal(r.status,404);assert.equal(calls.length,3);assert.ok(calls.every(u=>!u.includes('zipball')));
  });
});

test('iPhone download stays in the PWA; in-app preparation and user-tap share handle ZIP',()=>{
  const ui=read('app/components/SourceZipDownload.jsx');const api=read('app/api/github/source-zip/route.js');
  assert.match(ui,/fetch\(url/);
  assert.match(ui,/navigator\.share\(/);
  assert.match(ui,/onClick=\{download\.shareSupported \? saveToFiles : downloadInBrowser\}/);
  assert.doesNotMatch(ui,/window\.open\(|codeload\.github\.com|window\.location/);
  assert.match(api,/Content-Disposition/);assert.match(api,/getMainSourceZipStream/);
  assert.doesNotMatch(api,/headers\.set\('Location'/);
  assert.match(read('app/layout.jsx'),/source-zip-download\.css/);
});
