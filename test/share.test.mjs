import test from 'node:test';
import assert from 'node:assert/strict';
import {shareDetails,xShareUrl} from '../dist/share.js';

const event={id:'recital/1 & é#2',title:'Bach & friends',institution:'Example Conservatory',start:'2026-09-27T20:00:00Z',end:'2026-09-27T21:30:00Z'};
test('share links identify the performance on Classical Watch and safely encode its ID',()=>{
  const details=shareDetails(event,new Date('2026-09-27T20:30:00Z')),url=new URL(details.url);
  assert.equal(url.origin,'https://classicalwatch.stringfestanalytics.com');
  assert.equal(url.searchParams.get('event'),event.id);assert.equal(url.hash,'');
  assert.match(details.text,/I’m watching Bach & friends/);assert.match(details.text,/found on Classical Watch\.$/);
  const intent=new URL(xShareUrl(details.text,details.url));
  assert.equal(intent.searchParams.get('text'),details.text);assert.equal(intent.searchParams.get('url'),details.url);
});
test('share wording distinguishes future, scheduled-now, and earlier performances',()=>{
  assert.match(shareDetails(event,new Date('2026-09-27T19:00:00Z')).text,/^On my watchlist:/);
  assert.match(shareDetails(event,new Date(event.start)).text,/^I’m watching/);
  assert.match(shareDetails(event,new Date(event.end)).text,/^Worth a listen:/);
  assert.match(shareDetails({...event,end:null},new Date('2026-09-27T21:29:00Z')).text,/^I’m watching/);
});
test('long titles keep the attribution and fit a standard X post with its link',()=>{
  const details=shareDetails({...event,title:'🎻'.repeat(300)},new Date('2026-09-27T19:00:00Z'));
  assert.match(details.text,/… — found on Classical Watch\.$/);
  // X counts emoji as two characters and shortens a URL to 23 characters.
  const weighted=Array.from(details.text).reduce((total,char)=>total+(char.codePointAt(0)>0x10ff?2:1),0);
  assert.ok(weighted+24<=280);
});
