import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('daily publication uses 3:15 Eastern and retains push and manual triggers',async()=>{
 const workflow=await read('.github/workflows/refresh-and-deploy.yml');
 assert.match(workflow,/schedule:\s*\n\s*- cron: '15 3 \* \* \*'\s*\n\s*timezone: America\/New_York/);
 assert.match(workflow,/push:\s*\n\s*branches: \[main\]/);
 assert.match(workflow,/workflow_dispatch:/);
 const html=await read('dist/index.html'),readme=await read('README.md');
 assert.match(html,/daily around 3:15 a\.m\. Eastern/);
 assert.match(readme,/daily at \*\*3:15 a\.m\. America\/New_York\*\*/);
 assert.doesNotMatch(html+'\n'+readme,/weekly refresh|Monday refresh|every Monday|Monday schedule|weekly data commit/i);
});

test('About retains the personal story and contact form without an Oberlin callout',async()=>{
 const html=await read('dist/index.html'),$=load(html),about=$('#about');
 assert.equal(about.find('summary').text(),'About Classical Watch');
 assert.doesNotMatch(about.find('h2').text(),/Oberlin/);
 for(const text of ['George Mount','Stringfest Analytics','string instruments','Cleveland','Codex','free conservatory livestreams'])assert.ok(about.text().includes(text),text);
 assert.equal(about.find('a[href="https://stringfestanalytics.com/contact"]').length,1);
 assert.equal($('a[href^="mailto:"]').length,0);
 assert.doesNotMatch(html,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
 assert.match(about.text(),/daily refresh does not check them again/);
 assert.match(about.text(),/Finished concerts disappear automatically/);
});

test('daily calendar freshness warning uses two days while manual review labels remain',async()=>{
 const app=await read('dist/app.js'),readme=await read('README.md');
 assert.match(app,/Date\.now\(\)-Date\.parse\(data\.generated_at\)>2\*86400000/);
 assert.match(app,/not been refreshed in over two days/);
 assert.match(readme,/data file is over two days old/);
 assert.match(app,/not automatically rechecked/);
});
