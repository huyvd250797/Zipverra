import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_IN_APP_ZIP_BYTES, sourceZipFilename, isZipMagic, downloadStatusMessage,
  readSourceZipResponse, canShareZip, isIosLike } from '../lib/source-zip-client.js';

const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 1, 2, 3, 4]);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function zipResponse(body = ZIP, headers = {}) {
  return new Response(body, { status: 200,
    headers: { 'Content-Type': 'application/zip', 'Content-Length': `${ZIP.byteLength}`,
      'Content-Disposition': 'attachment; filename="Finzaro_v3.5.0_Release.zip"', ...headers } });
}

test('client keeps exact commit filename from same-origin Content-Disposition and does not navigate', async () => {
  const done = await readSourceZipResponse(zipResponse());
  assert.equal(done.filename, 'Finzaro_v3.5.0_Release.zip');
  assert.equal(done.blob.type, 'application/zip');
  assert.equal(done.size, ZIP.length);
  assert.deepEqual(new Uint8Array(await done.blob.arrayBuffer()), ZIP);
  const component = read('app/components/SourceZipDownload.jsx');
  assert.match(component, /await fetch\(url/);
  assert.match(component, /credentials: 'same-origin'/);
  assert.match(component, /navigator\.share\(\{ files: \[file\], title: download\.filename \}\)/);
  assert.match(component, /URL\.createObjectURL\(download\.blob\)/);
  assert.doesNotMatch(component, /<a className="source-zip-download-action" href=\{url\}/);
  assert.doesNotMatch(component, /window\.location|window\.open\(|codeload\.github\.com/);
});

test('file name sanitizer rejects separators and control characters', () => {
  assert.equal(sourceZipFilename('attachment; filename="../../secret.zip"'), '.._.._secret.zip'.replace(/^[._ ]+/, ''));
  assert.equal(sourceZipFilename('attachment; filename*=UTF-8\'\'Finzaro%20Release.zip'), 'Finzaro_Release.zip');
  assert.equal(sourceZipFilename('attachment; filename="report.html"'), 'source-main.zip');
  assert.equal(sourceZipFilename('attachment; filename="bad\\path\n.zip"'), 'source-main.zip');
  assert.equal(sourceZipFilename(''), 'source-main.zip');
});

test('browser ZIP magic checks local header, empty archive and rejects HTML', () => {
  assert.equal(isZipMagic(ZIP), true);
  assert.equal(isZipMagic([0x50,0x4b,0x05,0x06]), true);
  assert.equal(isZipMagic([0x50,0x4b,0x07,0x08]), true);
  assert.equal(isZipMagic([0x3c,0x68,0x74,0x6d]), false);
});

test('fragmented streamed ZIP checks signature and computes actual progress', async () => {
  const chunks = [ZIP.slice(0,1), ZIP.slice(1,3), ZIP.slice(3,4), ZIP.slice(4)];
  const progress = [];
  const response = new Response(new ReadableStream({
    pull(controller) { if (chunks.length) controller.enqueue(chunks.shift()); else controller.close(); },
  }), { status: 200, headers: { 'Content-Type':'application/zip',
    'Content-Disposition':'attachment; filename="Commit_Title.zip"' } });
  const result = await readSourceZipResponse(response, { onProgress: state => progress.push(state.received) });
  assert.equal(result.filename, 'Commit_Title.zip');
  assert.equal(result.size, ZIP.length);
  assert.deepEqual(progress,[1,3,4,12]);
});

test('in-app download rejects untrusted HTML and 401/403/404 correctly', async () => {
  for (const status of [401,403,404,429,502]) {
    await assert.rejects(() => readSourceZipResponse(new Response('error', { status })), error => error.code === 'DOWNLOAD_HTTP');
    assert.ok(downloadStatusMessage(status).length > 20);
  }
  await assert.rejects(() => readSourceZipResponse(new Response('<html/>', {
    status:200,headers:{'Content-Type':'text/html'},
  })), error => error.code === 'DOWNLOAD_NOT_ZIP');
  await assert.rejects(() => readSourceZipResponse(zipResponse(new Uint8Array([60,104,116,109]), {
    'Content-Length':'4',
  })), error => error.code === 'DOWNLOAD_NOT_ZIP');
});

test('size guard rejects oversized by header before buffering, and stream exceeding limit', async () => {
  assert.equal(MAX_IN_APP_ZIP_BYTES, 48 * 1024 * 1024);
  await assert.rejects(() => readSourceZipResponse(zipResponse(ZIP, {
    'Content-Length': `${MAX_IN_APP_ZIP_BYTES + 1}`,
  })), error => error.code === 'DOWNLOAD_TOO_LARGE');
  await assert.rejects(() => readSourceZipResponse(zipResponse(), { maxBytes: ZIP.length - 1 }),
    error => error.code === 'DOWNLOAD_TOO_LARGE');
  await assert.rejects(() => readSourceZipResponse(zipResponse(ZIP, {
    'Content-Length':'7',
  })), error => error.code === 'DOWNLOAD_INCOMPLETE');
});

test('iOS share capability is checked and user cancellation never changes ZIP bytes', () => {
  const file = new File([ZIP], 'Commit_Title.zip', {type:'application/zip'});
  const nav = { share:()=>Promise.resolve(), canShare:({files})=>files.length===1, userAgent:'Mozilla iPhone' };
  assert.equal(isIosLike(nav), true);
  assert.equal(isIosLike({platform:'MacIntel',maxTouchPoints:5}), true);
  assert.equal(isIosLike({userAgent:'Mozilla desktop'}),false);
  assert.equal(canShareZip(nav,file),true);
  assert.equal(canShareZip({...nav,canShare:()=>false},file),false);
  assert.equal(canShareZip({...nav,canShare:()=>{throw Error('not allowed');}},file),false);
  assert.equal(canShareZip({share:nav.share},file),false);
});

test('component prepares first, saves only on explicit second tap; supports abort and fallback', () => {
  const source = read('app/components/SourceZipDownload.jsx');
  assert.match(source, /async function prepareZip\(\)/);
  assert.match(source, /async function saveToFiles\(\)/);
  assert.match(source, /onClick=\{download\.shareSupported \? saveToFiles : downloadInBrowser\}/);
  assert.match(source, /onClick=\{prepareZip\}/);
  assert.match(source, /abortRef\.current\?\.abort\(\)/);
  assert.match(source, /window\.setTimeout\(\(\) => \{/);
  assert.match(source, /state: 'ready'/);
  assert.match(source, /Tải qua trình duyệt \(dự phòng\)/);
});
