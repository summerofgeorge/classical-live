import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source = await readFile(new URL('../dist/analytics.js', import.meta.url), 'utf8');
const storageKey = 'classicalwatch.analytics-consent.v1';
const disabledKey = 'ga-disable-G-CCRKXW68XX';
function browser({choice, savedAt = Date.now(), hostname = 'classicalwatch.stringfestanalytics.com', blockedStorage = false} = {}) {
  const elements = new Map(['analytics-choice','analytics-settings','analytics-accept','analytics-decline'].map(id => [id, {
    hidden: true, handlers: {}, attributes: {},
    addEventListener(name, fn) { this.handlers[name] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {}, scrollIntoView() {}
  }]));
  const scripts = [], removedCookies = [], storage = new Map(), handlers = {};
  if (choice) storage.set(storageKey, JSON.stringify({choice, savedAt}));
  let reloads = 0;
  const document = {
    getElementById: id => elements.get(id), createElement: () => ({}),
    head: {append: script => scripts.push(script)},
    get cookie() { return '_ga=main-site; cw_ga=classical; cw_ga_CCRKXW68XX=session'; },
    set cookie(value) { removedCookies.push(value); }
  };
  const window = {addEventListener: (name, fn) => { handlers[name] = fn; }};
  const localStorage = {
    getItem(key) { if (blockedStorage) throw new Error('blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blockedStorage) throw new Error('blocked'); storage.set(key, value); }
  };
  runInNewContext(source, {document, window, localStorage, location: {hostname, reload() { reloads++; }}});
  return {elements, scripts, removedCookies, storage, window, handlers,
    click: id => elements.get(id).handlers.click(), get reloads() { return reloads; }};
}

test('new and declined visitors do not load or queue Google measurement', () => {
  for (const choice of [undefined, 'denied']) {
    const b = browser({choice});
    assert.equal(b.scripts.length, 0);
    assert.equal(b.window.dataLayer, undefined);
    assert.equal(b.window[disabledKey], true);
    assert.equal(b.elements.get('analytics-choice').hidden, choice === 'denied');
  }
});

test('consent loads one tag with a single page-view config and no advertising consent', () => {
  const b = browser();
  b.click('analytics-accept');
  b.click('analytics-accept');
  assert.equal(b.scripts.length, 1);
  assert.equal(b.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-CCRKXW68XX');
  const commands = b.window.dataLayer.map(args => Array.from(args));
  assert.equal(commands.filter(args => args[0] === 'config').length, 1);
  assert.equal(commands[0][2].analytics_storage, 'denied');
  assert.equal(commands[0][2].ad_storage, 'denied');
  assert.equal(commands[0][2].ad_user_data, 'denied');
  assert.equal(commands[0][2].ad_personalization, 'denied');
  assert.equal(commands[1][2].analytics_storage, 'granted');
  const config = commands.find(args => args[0] === 'config')[2];
  assert.equal(config.cookie_domain, 'classicalwatch.stringfestanalytics.com');
  assert.equal(config.cookie_prefix, 'cw');
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
});

test('saved consent starts tracking, expired or future choices require a new choice', () => {
  assert.equal(browser({choice:'granted'}).scripts.length, 1);
  for (const savedAt of [Date.now() - 181 * 86400000, Date.now() + 86400000]) {
    const b = browser({choice:'granted', savedAt});
    assert.equal(b.scripts.length, 0);
    assert.equal(b.elements.get('analytics-choice').hidden, false);
  }
});

test('withdrawal stops tracking, removes only ClassicalWatch cookies and unloads the tag', () => {
  const b = browser({choice:'granted'});
  b.click('analytics-settings');
  assert.equal(b.elements.get('analytics-choice').hidden, false);
  b.click('analytics-decline');
  assert.equal(b.window[disabledKey], true);
  assert.equal(JSON.parse(b.storage.get(storageKey)).choice, 'denied');
  assert.equal(b.reloads, 1);
  assert.ok(b.removedCookies.length > 0);
  assert.ok(b.removedCookies.every(value => value.startsWith('cw_ga')));
});

test('withdrawal in another tab also stops active collection', () => {
  const b = browser({choice:'granted'});
  b.storage.set(storageKey, JSON.stringify({choice:'denied', savedAt:Date.now()}));
  b.handlers.storage({key:storageKey});
  assert.equal(b.window[disabledKey], true);
  assert.equal(b.reloads, 1);
});

test('blocked storage still permits a current-page choice without crashing the calendar', () => {
  const b = browser({blockedStorage:true});
  assert.equal(b.scripts.length, 0);
  b.click('analytics-accept');
  assert.equal(b.scripts.length, 1);
  b.click('analytics-decline');
  assert.equal(b.reloads, 1);
});

test('local and alternate hosts never load the live analytics tag', () => {
  for (const hostname of ['localhost','127.0.0.1','summerofgeorge.github.io']) {
    const b = browser({hostname, choice:'granted'});
    assert.equal(b.scripts.length, 0);
    assert.equal(b.elements.get('analytics-settings').hidden, true);
  }
});
