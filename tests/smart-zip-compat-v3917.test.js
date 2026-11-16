import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateRawSync, deflateRawSync } from 'node:zlib';
import { readZipDirectory, crc32 } from '../lib/zip-central-directory.js';
import { getWrapperFolders } from '../lib/paths.js';

function makeZip(inputs){
  const locals=[],central=[];let offset=0;
  for(const [name,value] of inputs){
    const raw=Buffer.from(value);const packed=deflateRawSync(raw),key=Buffer.from(name);const checksum=crc32(raw);
    const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(8,8);lh.writeUInt32LE(checksum,14);lh.writeUInt32LE(packed.length,18);lh.writeUInt32LE(raw.length,22);lh.writeUInt16LE(key.length,26);
    locals.push(lh,key,packed);
    const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(8,10);ch.writeUInt32LE(checksum,16);ch.writeUInt32LE(packed.length,20);ch.writeUInt32LE(raw.length,24);ch.writeUInt16LE(key.length,28);ch.writeUInt32LE(offset,42);
    central.push(ch,key);offset+=lh.length+key.length+packed.length;
  }
  const cd=Buffer.concat(central);const eocd=Buffer.alloc(22);eocd.writeUInt32LE(0x06054b50,0);eocd.writeUInt16LE(inputs.length,8);eocd.writeUInt16LE(inputs.length,10);eocd.writeUInt32LE(cd.length,12);eocd.writeUInt32LE(offset,16);
  return new Blob([...locals,cd,eocd]);
}

test('CRC32 matches the ZIP standard known vector and decompressed data',()=>{
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
  const payload=Buffer.from('Đã xử lý file ZIP rỗng đúng chuẩn','utf8');
  assert.equal(crc32(inflateRawSync(deflateRawSync(payload))),crc32(payload));
});
test('reads zero-byte file metadata without JSZip private properties',async()=>{
  const list=await readZipDirectory(makeZip([['docs/empty.md',''],['src/index.js','const ok=true;']]));
  assert.equal(list.get('docs/empty.md').uncompressedSize,0);
  assert.equal(list.get('docs/empty.md').crc,0);
  assert.equal(list.get('src/index.js').uncompressedSize,14);
});
test('rejects repeated central-directory filenames rather than hiding them',async()=>{
  await assert.rejects(readZipDirectory(makeZip([['src/x.js','a'],['src/x.js','b']])),/đường dẫn bị lặp/);
});
test('rejects truncated or corrupted directory metadata',async()=>{
  const zip=makeZip([['src/a.js','ok']]);
  const truncated=new Blob([(await zip.arrayBuffer()).slice(0,-12)]);
  await assert.rejects(readZipDirectory(truncated),/ZIP không hợp lệ/);
});
test('wrapper normalization handles nested exported project folders safely',()=>{
  const project=['Export/username-MyApp-123/src/app.js','Export/username-MyApp-123/index.html','Export/username-MyApp-123/docs/empty.md'];
  assert.equal(getWrapperFolders(project),'Export/username-MyApp-123');
  assert.equal(getWrapperFolders(['src/app.js','src/index.js']),null);
  assert.equal(getWrapperFolders(['project/docs/readme.txt']),'project');
  assert.equal(getWrapperFolders(['vendor/pkg-only/assets/logo.png']),'vendor');
});
test('compatibility change is scoped to desktop and activity progress is not duplicated',()=>{
  const root=new URL('../',import.meta.url);
  const css=readFileSync(new URL('app/styles/smart-zip-desktop-v3917.css',root),'utf8');
  const page=readFileSync(new URL('app/page.jsx',root),'utf8');
  assert.match(css,/@media \(min-width:761px\)/);
  assert.match(css,/data-active-view="activity"\]>\.zip3915-progress\{display:none!important\}/);
  assert.match(page,/onDrop=\{handleZipDrop\}/);
  assert.match(page,/pendingCommit\.owner.*pendingCommit\.repo/);
  assert.match(page,/zip3917-mobile-drop-copy/);
});
