import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_NOTICES, MAX_QUEUED_NOTICES, enqueueNotice, dismissNotice, clearNotices } from '../lib/notification-center.js';
import { createInteractionNotice, shouldAnnounceEvent } from '../lib/interaction-feedback.js';
const source = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const notice = (id, event = 'network-online') => ({ id, event, duration: 4500, tone: 'info' });

test('v3.8.4 bundles a dedicated notification layer without changing GitHub endpoints', () => {
  assert.equal(JSON.parse(source('package.json')).version, '3.8.4');
  assert.match(source('app/layout.jsx'), /notifications-v384\.css/);
  assert.match(source('lib/pwa-reliability.js'), /APP_VERSION = '3\.8\.4'/);
  assert.match(source('app/page.jsx'), /<ConfirmationDialog request=\{confirmRequest\} onAnswer=\{answerConfirmation\}/);
  assert.match(source('app/components/WorkspacePanel.jsx'), /<ConfirmationDialog request=\{confirmRequest\} onAnswer=\{answerConfirmation\}/);
});

test('first toast is visible, new events queue rather than replace it', () => {
  const one = enqueueNotice(INITIAL_NOTICES, notice(1,'sha-copied'));
  const two = enqueueNotice(one, notice(2,'network-online'));
  assert.equal(two.active.id, 1);
  assert.deepEqual(two.queued.map(x=>x.id), [2]);
  assert.equal(INITIAL_NOTICES.active, null);
});

test('the same event cannot flood the queue with duplicate notices', () => {
  const first = enqueueNotice(INITIAL_NOTICES,notice(1));
  const duplicate = enqueueNotice(first,notice(2));
  assert.equal(duplicate, first);
  const waiting = enqueueNotice(first,notice(3,'sha-copied'));
  assert.equal(enqueueNotice(waiting,notice(4,'sha-copied')),waiting);
});

test('verified GitHub success is prioritized over informational events without removing visible notice', () => {
  let state = enqueueNotice(INITIAL_NOTICES,notice(1,'sha-copied'));
  state = enqueueNotice(state,notice(2,'network-online'));
  state = enqueueNotice(state,notice(3,'push-verified'));
  assert.deepEqual(state.queued.map(x=>x.event), ['push-verified','network-online']);
  assert.equal(shouldAnnounceEvent('push-verified',false),false);
  assert.equal(shouldAnnounceEvent('push-verified',true),true);
});

test('queue is bounded, evicting informational notice before verified outcomes', () => {
  let state = enqueueNotice(INITIAL_NOTICES,notice(1,'sha-copied'));
  state = enqueueNotice(state,notice(2,'push-verified'));
  state = enqueueNotice(state,notice(3,'network-online'));
  state = enqueueNotice(state,notice(4,'pr-verified'));
  state = enqueueNotice(state,notice(5,'repo-selected'));
  assert.equal(state.queued.length,MAX_QUEUED_NOTICES);
  assert.ok(state.queued.some(x=>x.event === 'push-verified'));
  assert.ok(state.queued.some(x=>x.event === 'pr-verified'));
});

test('stale timer id cannot dismiss the currently active toast', () => {
  let state = enqueueNotice(INITIAL_NOTICES,notice(1));
  state = enqueueNotice(state,notice(2,'sha-copied'));
  assert.equal(dismissNotice(state,123),state);
  const advanced = dismissNotice(state,1);
  assert.equal(advanced.active.id,2);
  assert.equal(dismissNotice(advanced,1),advanced);
  assert.equal(dismissNotice(advanced,2).active,null);
});

test('notice layer keeps warnings/errors on screen, avoids duplicate floating toasts', () => {
  for (const event of ['action-failed','zip-invalid','network-offline','repo-selected','review-ready','no-changes'])
    assert.equal(createInteractionNotice(event).presentation,'inline');
  for (const event of ['sha-copied','push-verified','pr-verified'])
    assert.equal(createInteractionNotice(event).presentation,undefined);
  assert.deepEqual(clearNotices(),{active:null,queued:[]});
});

test('toast exit, focus pause and reduced-motion safeguards are present', () => {
  const ui=source('app/components/InteractionFeedback.jsx');
  const css=source('app/styles/notifications-v384.css');
  assert.match(ui,/visibilitychange/);
  assert.match(ui,/onPointerEnter/);
  assert.match(ui,/onFocus/);
  assert.match(ui,/onDismissRef\.current\(id\)/);
  assert.match(css,/pro-toast--exiting/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/safe-area-inset-bottom|\.pro-toast/);
});

test('confirmation is cancel-safe and never automatically approves a destructive action', () => {
  const ui=source('app/components/InteractionFeedback.jsx');
  assert.match(ui,/onClose=\{\(\) => onAnswer\(false\)\}/);
  assert.match(ui,/pendingRef\.current = null/);
  assert.match(ui,/resolve\(value === true\)/);
  assert.match(ui,/if \(pendingRef\.current\) return Promise\.resolve\(false\)/);
  assert.match(source('app/page.jsx'), /askConfirmation\(\{ title: 'Đổi repository\?'/);
  assert.match(source('app/page.jsx'), /askConfirmation\(\{ title: 'Khởi động lại Zipverra\?'/);
});
