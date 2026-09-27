import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source = await readFile(new URL('../dist/analytics.js', import.meta.url), 'utf8');
function browser(hostname = 'classicalwatch.stringfestanalytics.com') {
  const scripts = [];
  const document = {
    getElementById: id => scripts.find(script => script.id === id),
    createElement: () => ({}),
    head: {append: script => scripts.push(script)}
  };
  const window = {};
  const context = {document, window, location: {hostname}};
  const run = () => runInNewContext(source, context);
  run();
  return {scripts, window, run};
}

test('live page starts analytics automatically without consent controls or localStorage', () => {
  const b = browser();
  assert.equal(b.scripts.length, 1);
  assert.equal(b.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-CCRKXW68XX');
  const commands = b.window.dataLayer.map(args => Array.from(args));
  assert.equal(commands[0][2].analytics_storage, 'granted');
  for (const key of ['ad_storage', 'ad_user_data', 'ad_personalization']) {
    assert.equal(commands[0][2][key], 'denied');
  }
  const config = commands.find(args => args[0] === 'config');
  assert.equal(config[1], 'G-CCRKXW68XX');
  assert.equal(config[2].cookie_domain, 'classicalwatch.stringfestanalytics.com');
  assert.equal(config[2].cookie_prefix, 'cw');
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(config[2].allow_ad_personalization_signals, false);
});

test('initializing twice does not duplicate the tag or page view', () => {
  const b = browser();
  b.run();
  assert.equal(b.scripts.length, 1);
  assert.equal(b.window.dataLayer.filter(args => args[0] === 'config').length, 1);
});

test('local and alternate hosts never load the live analytics tag', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'summerofgeorge.github.io']) {
    const b = browser(hostname);
    assert.equal(b.scripts.length, 0);
    assert.equal(b.window.dataLayer, undefined);
  }
});
