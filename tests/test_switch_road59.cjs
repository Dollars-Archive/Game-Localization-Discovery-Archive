const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {root,readRows,createHarness}=require('./helpers/index-harness.cjs');
const road='platforms/switch/games/road59-a-yakuzas-last-stand.md';

test('ROAD59 is preserved as 3.0/5 rejected Switch review, not promoted to a 3.5 candidate',()=>{
 const txt=fs.readFileSync(path.join(root,'platforms/switch/README.md'),'utf8');
 const rows=readRows(txt);
 const chosen=rows.filter(r=>!/패스|보류/.test(r['상태']));
 const rejects=rows.filter(r=>/패스/.test(r['상태']));
 const match=txt.match(/등록 후보: \*\*(\d+)개\*\*.*기준 미달 평가 기록: \*\*(\d+)개\*\*/);
 assert.ok(match);
 assert.equal(Number(match[1]),chosen.length);
 assert.equal(Number(match[2]),rejects.length);
 const item=rows.find(r=>r['게임'].includes('games/road59-a-yakuzas-last-stand.md'));
 assert.ok(item);
 assert.match(item['상태'],/패스/);
 assert.match(item['발굴 추천도'],/3\.0\/5/);
 assert.equal(item['한글화 우선도'],'미부여');
 for(const slug of ['mamiya-a-shared-illusion-of-the-worlds-end','wizards-symphony','soul-cradle-world-eaters','touhou-sky-arena-matsuri-climax','astral-takers']){
  assert.ok(rows.some(r=>r['게임'].includes('games/'+slug+'.md')));
 }
 const source=fs.readFileSync(path.join(root,road),'utf8');
 assert.match(source,/한국어.*미지원/);
 assert.match(source,/파트보이스/);
 assert.match(source,/37%/);
 assert.match(source,/63건/);
 assert.match(source,/Extra Story/);
 assert.match(source,/정식 후보 등록 결론/);
 const main=fs.readFileSync(path.join(root,'README.md'),'utf8');
 assert.match(main,new RegExp('\\| Nintendo Switch \\| '+chosen.length+' \\|'));
});

test('Switch UI includes ROAD59 without dropping prior recorded titles',async()=>{
 const h=await createHarness({query:'?platform=switch'});
 assert.ok(h.keys().includes(road));
 assert.ok(h.keys().includes('platforms/switch/games/astral-takers.md'));
 assert.ok(h.keys().includes('platforms/switch/games/touhou-sky-arena-matsuri-climax.md'));
 assert.match(h.elements['stats'].innerHTML,/평가 기록/);
 assert.match(h.elements['candidate-body'].innerHTML,/ROAD59/);
});
