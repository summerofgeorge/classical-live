import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldRefresh} from '../scripts/refresh-needed.mjs';
test('scheduled and manual runs always refresh; unknown push history fails safe',()=>{
 for(const event of ['schedule','workflow_dispatch'])assert.equal(shouldRefresh(event,[]),true);
 assert.equal(shouldRefresh('push',undefined),true);
});
test('presentation and test edits reuse the current verified schedule',()=>{
 assert.equal(shouldRefresh('push',['dist/app.js','dist/index.html','dist/styles.css','dist/share.js','dist/analytics.js','dist/social-card-v3.jpg','test/share.test.mjs','scripts/serve.mjs','scripts/refresh-needed.mjs','.github/workflows/refresh-and-deploy.yml']),false);
});
test('collector, date logic, dependency and source data changes refresh before publishing',()=>{
 for(const path of ['scripts/ingest.mjs','scripts/new-school.mjs','scripts/http.mjs','scripts/reviewed.mjs','dist/core.js','dist/events.json','data/browser-reviewed.json','package.json','pnpm-lock.yaml'])assert.equal(shouldRefresh('push',['dist/app.js',path]),true,path);
});
