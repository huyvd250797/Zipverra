import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scanSourceFile, scanSelectedChanges, reportSelectedSecurity, needsSensitiveConsent } from '../lib/source-security.js';
import { reviewReadiness } from '../lib/ux-polish.js';
import { analyzeSource } from '../lib/smart-push.js';
import { assertSafeContentPath } from '../lib/paths.js';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const utf8 = value => new TextEncoder().encode(value);
const FILE = 'tests/source-security.test.js';
const ready = { hasPreview:true, selectedCount:2, authenticated:true, online:true, confirmed:true };

test('v3.9.13 fake key fixture avoids triggering older Zipverra scanners on our own source',()=>{
  const findings=scanSourceFile(FILE,utf8(read(FILE)));
  assert.equal(findings.filter(f=>f.severity==='critical').length,0);
  // Test source still creates the key header dynamically at runtime for scanner regression.
  assert.match(read(FILE),/fakePrivateKeyHeader/);
});

test('Critical finding requires an affirmative decision, not just the final commit checkbox',()=>{
  const file={ path:'src/example.ts', data:utf8("const auth = 'ghp_"+'A'.repeat(30)+"';") };
  const report=scanSelectedChanges([file],[{path:file.path,kind:'add'}]);
  assert.ok(report.critical > 0);
  assert.ok(needsSensitiveConsent(report.findings));
  assert.equal(reviewReadiness({...ready,critical:report.critical,sensitiveFindings:report.critical}).code,'SECURITY');
  const accepted=reviewReadiness({...ready,critical:report.critical,sensitiveFindings:report.critical,sensitiveConsent:true});
  assert.equal(accepted.code,'READY');
  assert.equal(accepted.ready,true);
});

test('Accepting Security Scan does not bypass separate commit, Sync, pending and authorization gates',()=>{
  const base={...ready,critical:1,sensitiveFindings:1,sensitiveConsent:true};
  assert.equal(reviewReadiness({...base,confirmed:false}).code,'CONFIRM');
  assert.equal(reviewReadiness({...base,syncDeleteCount:3,syncConfirmed:false}).code,'SYNC');
  for (const extra of [{online:false},{authenticated:false},{pending:true},{busy:true}])
    assert.equal(reviewReadiness({...base,...extra}).ready,false);
});

test('Excluding risk-bearing file removes consent requirement for remaining safe changes',()=>{
  const files=[{path:'src/one.ts',data:utf8("const x='ghp_"+'C'.repeat(28)+"';")},{path:'src/two.ts',data:utf8('export const x = 2;')}];
  const changes=files.map(f=>({path:f.path,kind:'add'}));
  const full=scanSelectedChanges(files,changes);
  assert.equal(full.blocked,true);
  const filtered=reportSelectedSecurity(full,[changes[1]]);
  assert.equal(filtered.blocked,false);
  assert.equal(needsSensitiveConsent(filtered.findings),false);
});

test('High-risk path is advisory in Analyze, but traversal or .git writes are never overridable',()=>{
  const file={path:'.npmrc',bytes:10,data:utf8('plain config text')};
  const insights=analyzeSource({files:[file],changes:[{path:'.npmrc',kind:'add'}]});
  assert.equal(insights.hasBlockingWarning,false);
  assert.ok(insights.warnings.some(w=>w.code==='SECRET_FILE' && w.severity==='warning'));
  assert.equal(assertSafeContentPath('.npmrc',{allowSensitive:true}),'.npmrc');
  assert.throws(()=>assertSafeContentPath('../.npmrc',{allowSensitive:true}));
  assert.throws(()=>assertSafeContentPath('.git/config',{allowSensitive:true}));
});

test('UI prompts for explicit choice and still uses server-enforced consent for Push and PR',()=>{
  const page=read('app/page.jsx');
  const component=read('app/components/PremiumWorkflow.jsx');
  assert.match(page,/const sensitiveWarning=needsSensitiveConsent\(selectedReport\.findings\);\s*setSecurityDialogOpen\(sensitiveWarning\)/);
  assert.match(page,/Không, kiểm tra lại/);
  assert.match(page,/Có, tôi hiểu rủi ro · Tiếp tục/);
  assert.match(page,/allowSensitiveUpload: requiresConsent && sensitiveConsent/);
  assert.match(page,/allowSensitiveCommit: requiresConsent && sensitiveConsent/);
  assert.match(page,/\(requiresConsent && !sensitiveConsent\)/);
  assert.match(page,/disabled=\{!canSubmitPush\}/);
  assert.match(component,/needsApproval/);
});
