import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizePriceSnapshot, getPriceQuality, isStaleDate } from '../src/priceSnapshot.mjs';
import { buildTradeupRoutes, calculateTradeup, defaultInputFloat } from '../src/tradeupRules.mjs';
const skin = (id, rarity, min = 0, max = 1, extra = {}) => ({ id: 'skin-' + id, name: id, rarity: { name: rarity }, min_float: min, max_float: max, stattrak: true, ...extra });
const a = skin('a', 'Restricted', .1, .7), b = skin('b', 'Restricted'), c = skin('c', 'Classified', 0, .8), d = skin('d', 'Classified'), e = skin('e', 'Classified');
const collections = [{id:'one', name:'One', contains:[a,c]}, {id:'two', name:'Two', contains:[b,d,e]}];
const routes = buildTradeupRoutes([a,b,c,d,e], collections, []);
test('Mixed collections contribute input shares, not outcome-count shares', () => {
  const slots = [...Array(6).fill({skin:a,float:.4}), ...Array(4).fill({skin:b,float:.5})];
  const result = calculateTradeup(slots, routes);
  assert.ok(Math.abs(result.outcomes.find(row=>row.skin.id===c.id).chance - 60) < 1e-8);
  assert.ok(Math.abs(result.outcomes.find(row=>row.skin.id===d.id).chance - 20) < 1e-8);
  assert.ok(Math.abs(result.outcomes.reduce((sum,row)=>sum+row.chance,0)-100)<1e-8);
  assert.ok(Math.abs(result.outcomes[0].outFloat - .4)<1e-8);
});
test('Missing routes, souvenir inputs and mixed variants cannot produce invented results', () => {
  assert.equal(calculateTradeup([{skin:{...a,isSouvenir:true},float:.4}],routes),null);
  assert.equal(calculateTradeup([{skin:a,float:.4},{skin:{...a,isStatTrak:true},float:.4}],routes),null);
  assert.equal(calculateTradeup([{skin:skin('missing','Restricted'),float:.4}],routes),null);
  assert.equal(routes.has(c.id),false);
});
test('Covert pool stays in input cases; StatTrak excludes gloves', () => {
  const red=skin('red','Covert');
  const knife=skin('knife','Covert',0,1,{category:{name:'Knives'}});
  const gloves=skin('gloves','Covert',0,1,{category:{name:'Gloves'},stattrak:false});
  const unrelated=skin('unrelated','Covert',0,1,{category:{name:'Knives'}});
  const skins=[red,knife,gloves,unrelated];
  const crates=[{name:'Case',type:'Case',contains:[red],contains_rare:[knife,gloves]}];
  assert.deepEqual(buildTradeupRoutes(skins,[],crates).get(red.id)[0].items.map(s=>s.id),[knife.id,gloves.id]);
  assert.deepEqual(buildTradeupRoutes(skins,[],crates,true).get(red.id)[0].items.map(s=>s.id),[knife.id]);
});
test('Narrow float ranges, invalid inputs and wear boundaries', () => {
  assert.equal(defaultInputFloat(skin('narrow','Restricted',0,.08)),.08);
  assert.equal(calculateTradeup([{skin:a,float:.9}],routes),null);
  assert.equal(calculateTradeup([{skin:a,float:NaN}],routes),null);
  const low = calculateTradeup([{skin:b,float:.069999}],routes);
  assert.ok(low.outcomes[0].outFloat < .07);
});
test('USD and cent schemas stay distinct; invalid payloads fail', () => {
  assert.equal(normalizePriceSnapshot({metadata:{currency:'USD'},prices:{A:42.1}}).A,42.1);
  assert.equal(normalizePriceSnapshot({prices:{A:4210}},true).A,42.1);
  assert.throws(()=>normalizePriceSnapshot({prices:{A:Infinity,B:-2}}));
  assert.throws(()=>normalizePriceSnapshot('<html>'));
});
test('Fresh packaging cannot disguise old item timestamps', () => {
  const now=Date.parse('2026-09-12T12:00:00Z');
  const prices=normalizePriceSnapshot({metadata:{currency:'USD',updated_at:'2026-09-12T12:00:00Z'},prices:{A:1,B:2,C:3,D:4},details:{A:{updated_at:'2026-08-08'},B:{updated_at:'2026-09-12'},C:{updated_at:'2026-09-12',estimated:true}}});
  assert.equal(getPriceQuality(prices,'A',now),'stale');
  assert.equal(getPriceQuality(prices,'B',now),'market');
  assert.equal(getPriceQuality(prices,'C',now),'estimated');
  assert.equal(getPriceQuality(prices,'D',now),'unknown');
  assert.equal(getPriceQuality(prices,'E',now),'missing');
  assert.equal(isStaleDate('nonsense',now),true);
  assert.equal(Object.keys(prices).length,4);
});

test('Real price lookup keeps wear and StatTrak/Souvenir variants separate', async () => {
  // Expo uzantısız importlarını Node testine uyarlıyoruz; fiyat kodu değiştirilmez.
  const utils = 'data:text/javascript;base64,' + Buffer.from(await fs.readFile(new URL('../src/utils.js', import.meta.url), 'utf8')).toString('base64');
  let source = await fs.readFile(new URL('../src/prices.js', import.meta.url), 'utf8');
  source = source.replace("'./utils'", JSON.stringify(utils)).replace("export { fetchPriceSnapshot as fetchLivePrices } from './api';", '');
  const { buildMarketHashName, hasLivePrice, getRealisticPrice } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.equal(buildMarketHashName({name:'★ Bayonet | Fade'},'Factory New',true), '★ StatTrak™ Bayonet | Fade (Factory New)');
  const item = { ...a, name:'AK-47 | Example', market_hash_name:'AK-47 | Example (Factory New)' };
  const prices = { 'AK-47 | Example (Factory New)':999, 'AK-47 | Example (Field-Tested)':42 };
  assert.equal(getRealisticPrice(prices,item,.2,false),42);
  assert.equal(hasLivePrice(prices,item,'Field-Tested',true),false);
  assert.notEqual(getRealisticPrice(prices,item,.2,true,undefined,false,{stable:true}),42);
  assert.equal(hasLivePrice(prices,item,'Field-Tested',false,true),false);
});

test('Vanilla knife outcomes remain possible without inventing wear', () => {
  const red=skin('red','Covert');
  const knife={id:'skin-vanilla',name:'★ Bayonet',rarity:{name:'Covert'},category:{name:'Knives'},min_float:null,max_float:null,stattrak:true};
  const localRoutes=buildTradeupRoutes([red,knife],[],[{name:'Case',type:'Case',contains:[red],contains_rare:[knife]}]);
  assert.equal(calculateTradeup([{skin:red,float:.5}],localRoutes).outcomes[0].outFloat,null);
});
