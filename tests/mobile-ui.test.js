import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_TABS, CHANGE_FILTERS, filterChanges, updateRecentRepositories, getPushTimeline } from '../lib/mobile-ui.js';

const changes = [{ path:'a',kind:'add' }, { path:'b',kind:'modify' }, { path:'c',kind:'delete' }];
test('all four mobile tabs are independent from mutations', () => {
  assert.deepEqual(MOBILE_TABS, ['home','repositories','activity','settings']);
});
test('diff filtering never changes the source array', () => {
  assert.deepEqual(CHANGE_FILTERS, ['all','add','modify','delete']);
  assert.deepEqual(filterChanges(changes, 'delete'), [changes[2]]);
  assert.deepEqual(filterChanges(changes, 'all'), changes);
  assert.equal(changes.length, 3);
});
test('recent repository list is local metadata, deduplicated and bounded', () => {
  assert.deepEqual(updateRecentRepositories(['org/one','org/two'], 'org/two'), ['org/two','org/one']);
  assert.deepEqual(updateRecentRepositories(['org/one'], 'bad token/\n'), ['org/one']);
  assert.equal(updateRecentRepositories(['a/1','b/2','c/3','d/4','e/5'], 'f/6').length, 5);
});
test('timeline reports progress without implying a completed commit', () => {
  assert.deepEqual(getPushTimeline('UPLOADING').map((x)=>x.state), ['complete','active','waiting','waiting']);
  assert.deepEqual(getPushTimeline('UNCONFIRMED', { pending:true }).map((x)=>x.state), ['complete','complete','uncertain','waiting']);
  assert.deepEqual(getPushTimeline('SUCCEEDED', { result:true }).map((x)=>x.state), ['complete','complete','complete','complete']);
  assert.equal(getPushTimeline('IDLE', {preview:true})[0].state, 'complete');
});
