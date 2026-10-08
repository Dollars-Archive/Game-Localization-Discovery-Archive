const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../docs/assets/exclusion-core.js');
const W = require('../docs/assets/watchlist-core.js');
const key = 'platforms/ps2/games/a.md';
const row = {key,title:'게임 A'};
const bkey = 'platforms/ps2/games/b.md';
const encode = s => Buffer.from(s).toString('base64');
const result = (status, payload) => ({status,ok:status<300,json:async()=>payload,text:async()=>payload});
class Element {
  constructor() { this.listeners={}; this.hidden=false;this.disabled=false;this.open=false;this.innerHTML='';this.textContent='';this.value='';this.dataset={}; this.classList={toggle(){},add(){},remove(){}}; }
  addEventListener(type, handler) { this.listeners[type]=handler; }
  setAttribute() {}
  querySelectorAll() { return []; }
  showModal() { this.open=true; }
  close() { this.open=false; }
}
async function ui({owner=314692476,token='test-token',offline=false,deleted=false,putStatus=200}={}) {
  const elements = new Map();
  const el = id => { if(!elements.has(id)) elements.set(id,new Element());return elements.get(id); };
  const storage = new Map(token?[['discovery-watchlist-token-v1',token]]:[]);
  let exclusions = E.empty();
  if(deleted) exclusions = E.withChange(exclusions,key,{title:row.title,deleted:true,updated:'2026-10-08T00:00:00Z'});
  let writes=0;
  const watchlist={version:1,order:[key,bkey],items:{[key]:{added:'2026-10-08',note:'내 메모'},[bkey]:{added:'2026-10-08',note:''}}};
  const originalWatchlist = JSON.stringify(watchlist);
  const markdown='| 게임 | 발매 | 장르 | 발굴 추천도 | 한글화 우선도 | 타 기종 / 다른 버전 | 상태 |\n|---|---|---|---|---|---|---|\n| [게임 A](games/a.md) | 2000 | RPG | ⭐⭐⭐⭐☆ | A | 없음 | 후보 |\n| [게임 B](games/b.md) | 2001 | ADV | ⭐⭐⭐½☆ | B | 없음 | 후보 |';
  const fetcher=async(url,init={})=>{
    if(url.endsWith('/user')) return result(owner===401?401:200,{id:owner});
    if(url.endsWith('/Game-Localization-Discovery-Archive')) return result(200,{permissions:{push:true}});
    if(url.includes('excluded-games.json')) {
      if(offline) throw Error('offline');
      if(init.method==='PUT') { writes++; if(putStatus!==200)return result(putStatus,{});exclusions=JSON.parse(Buffer.from(JSON.parse(init.body).content,'base64').toString()); }
      return result(200,{content:encode(JSON.stringify(exclusions)),sha:'s1'});
    }
    if(url.includes('/contents/docs/data/watchlist.json')) return result(200,{content:encode(JSON.stringify(watchlist)),sha:'w1'});
    if(url.includes('patches.json')) return result(200,{patches:[{discovery:key,status:'wip',url:'https://example.com'}]});
    if(url.includes('raw.githubusercontent.com')) return result(200,markdown);
    throw Error(`Unexpected request: ${url}`);
  };
  const location={search:'?platform=ps2',hash:`#compare=${encodeURIComponent(key)},${encodeURIComponent(bkey)}`,pathname:'/index.html',href:'https://example.com/index.html?platform=ps2'};
  const context={URL,URLSearchParams,TextDecoder,TextEncoder,Uint8Array,Date,console,fetch:fetcher,
    atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{body:{dataset:{page:'index'}},getElementById:el,querySelectorAll:()=>[]},
    window:{WatchlistCore:W,ExclusionCore:E,confirm:()=>true,addEventListener(){}},
    location,history:{replaceState(_a,_b,url){location.hash=String(url).includes('#')?'#'+String(url).split('#')[1]:'';}},
    setTimeout:()=>1,clearTimeout(){}
  };
  vm.createContext(context);
  const code=fs.readFileSync(path.join(__dirname,'../docs/assets/app.js'),'utf8').replace("if (page === 'index') initIndex();","if (page === 'index') globalThis.initialized = initIndex();");
  vm.runInContext(code,context);await context.initialized;
  const drain=async()=>{for(let i=0;i<15;i++)await new Promise(resolve=>setImmediate(resolve));};
  const click=async(selector,keyValue=key)=>{
    el(selector==='.candidate-delete'?'candidate-body':'deleted-content').listeners.click({target:{closest:s=>s===selector?{dataset:{key:keyValue}}:null}});
    await drain();
  };
  return {el,click,context,storage,drain,get writes(){return writes;},get exclusions(){return exclusions;},assertWatchlist(){assert.equal(JSON.stringify(watchlist),originalWatchlist);}};
}
test('actual app deletes a started/starred candidate, updates counts and comparison URL, then restores its note',async()=>{
  const f=await ui();
  assert.match(f.el('candidate-body').innerHTML,/candidate-delete/);
  assert.match(f.el('stats').innerHTML,/등록 후보 <strong>2<\/strong>/);
  await f.click('.candidate-delete');
  assert.equal(f.writes,1);
  assert.ok(!f.el('candidate-body').innerHTML.includes('게임 A'));
  assert.match(f.el('stats').innerHTML,/등록 후보 <strong>1<\/strong>/);
  assert.match(f.el('my-list-summary').textContent,/찜 1 · 🛠 착수 0/);
  assert.equal(f.el('compare-bar').hidden,true);
  assert.equal(f.context.location.hash,'');
  assert.equal(f.el('compare-dialog').open,false);
  assert.match(f.el('deleted-content').innerHTML,/게임 A/);
  await f.click('.candidate-restore');
  assert.match(f.el('candidate-body').innerHTML,/게임 A/);
  assert.match(f.el('candidate-body').innerHTML,/내 메모/);
  assert.match(f.el('stats').innerHTML,/등록 후보 <strong>2<\/strong>/);
  f.assertWatchlist();
});
test('public visitors and other accounts see deletion effects but no delete controls',async()=>{
  for(const tokenOwner of [{token:''},{owner:123},{owner:401}]) {
    const f=await ui({...tokenOwner,deleted:true});
    assert.ok(!f.el('candidate-body').innerHTML.includes('게임 A'));
    assert.ok(!f.el('candidate-body').innerHTML.includes('candidate-delete'));
    assert.equal(f.el('deleted-open').hidden,true);
    await f.click('.candidate-delete');assert.equal(f.writes,0);
  }
});
test('failed writes retain row, watchlist and comparison selection and show no success',async()=>{
  const f=await ui({putStatus:403});await f.click('.candidate-delete');
  assert.match(f.el('candidate-body').innerHTML,/게임 A/);
  assert.match(f.el('toast').textContent,/저장하지 못했습니다/);
  assert.match(f.el('stats').innerHTML,/등록 후보 <strong>2<\/strong>/);
  f.assertWatchlist();
});
test('unavailable deletion state warns publicly and disables deletion writes',async()=>{
  const f=await ui({offline:true});
  assert.equal(f.el('deletion-sync-notice').hidden,false);
  assert.match(f.el('candidate-body').innerHTML,/candidate-delete[^>]+disabled/);
  await f.click('.candidate-delete');assert.equal(f.writes,0);
});
