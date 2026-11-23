import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {saveCalendar} from '../scripts/save-calendar.mjs';

function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'calendar-save-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const origin=join(root,'origin.git'),writer=join(root,'writer'),editor=join(root,'editor');
  git(root,'init','--bare','--initial-branch=main',origin);
  git(root,'clone',origin,writer);
  const identity=dir=>{git(dir,'config','user.name','Calendar test');git(dir,'config','user.email','calendar-test@example.invalid');};
  identity(writer);
  for(const dir of ['dist','data'])mkdirSync(join(writer,dir));
  writeFileSync(join(writer,'dist/events.json'),'original\n');
  writeFileSync(join(writer,'data/maintenance-state.json'),'{}\n');
  writeFileSync(join(writer,'dist/map.css'),'old map\n');
  git(writer,'add','.');git(writer,'commit','-m','Initial');git(writer,'push','origin','main');
  git(root,'clone',origin,editor);identity(editor);
  return {git,origin,writer,editor};
}

test('saving a refresh preserves a PR merged during collection',t=>{
  const {git,origin,writer,editor}=fixture(t);
  writeFileSync(join(writer,'dist/events.json'),'fresh concerts\n');
  writeFileSync(join(editor,'dist/map.css'),'political map\n');
  git(editor,'add','.');git(editor,'commit','-m','Merge map improvement');git(editor,'push','origin','main');
  assert.equal(saveCalendar(writer),true);
  assert.equal(git(origin,'show','main:dist/map.css'),'political map');
  assert.equal(git(origin,'show','main:dist/events.json'),'fresh concerts');
  assert.equal(readFileSync(join(writer,'dist/map.css'),'utf8').trim(),'political map');
  assert.equal(saveCalendar(writer),false);
});

test('a simultaneous calendar edit is not overwritten',t=>{
  const {git,origin,writer,editor}=fixture(t);
  writeFileSync(join(writer,'dist/events.json'),'collected concerts\n');
  writeFileSync(join(editor,'dist/events.json'),'reviewed concerts\n');
  git(editor,'add','.');git(editor,'commit','-m','Review calendar');git(editor,'push','origin','main');
  assert.throws(()=>saveCalendar(writer));
  assert.equal(git(origin,'show','main:dist/events.json'),'reviewed concerts');
  assert.equal(git(writer,'status','--porcelain'),'');
});
