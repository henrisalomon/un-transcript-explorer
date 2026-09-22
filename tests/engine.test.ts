import {describe,it,expect} from 'vitest';
import {Engine,countryCode} from '../src/engine';
import type{Index,Query}from'../src/types';
import{readFileSync}from'node:fs';
const q:Query={from:'',to:'',category:'',affiliation:'',topic:'',view:'overview',profile:null,page:0,search:''};
const d:Index={schema:1,meetings:[{id:'one',title:'Morning',date:'2026-01-01',scheduled:'2026-01-01T09:00:00Z',category:'SC',body:'',slug:'sc/one',file:'a'},{id:'two',title:'Afternoon, part 2',date:'2026-01-01',scheduled:'2026-01-01T15:00:00Z',category:'SC',body:'',slug:'sc/two',file:'b'}],affiliations:[{id:'fr',name:'France',code:'FRA'},{id:'un',name:'United Nations',code:'UN'},{id:'mv',name:'Maldives',code:'MDV'}],speakers:[{id:'a',name:'A',a:0},{id:'b',name:'B',a:1}],topics:[{id:'t',name:'Climate',key:'climate'}],statements:[[0,0,0,0,50,[0],'Representative',1],[0,1,-1,0,90,[],'President',2],[1,0,1,1,10,[0],'Official',1],[1,1,0,0,20,[],'Representative',2],[1,2,-1,2,30,[],'Representative',3]]};
describe('Filtering and profiles',()=>{
 it('counts distinct recordings without counting repeat interventions',()=>{const r=new Engine(d).query(q);expect(r.meetings).toBe(2);expect(r.interventions).toBe(5);expect(r.countries.find(c=>c.code==='FRA')?.meetings).toBe(2)});
 it('combines topic and affiliation on the same intervention',()=>{const r=new Engine(d).query({...q,affiliation:'fr',topic:'t'});expect(r.meetings).toBe(1);expect(r.interventions).toBe(1)});
 it('includes unnamed interventions and orders same-day recordings by schedule',()=>{const r=new Engine(d).query({...q,profile:{kind:'affiliation',id:'fr'}});expect(r.profile?.interventions).toBe(3);expect(r.profile?.groups.map(g=>g.meeting.id)).toEqual(['two','one']);expect(r.profile?.groups[1].statements.map(s=>s[4])).toEqual([50,90])});
 it('counts country meeting types across all pages and applies intervention and date filters',()=>{
  const data:Index={...d,meetings:Array.from({length:22},(_,i)=>({...d.meetings[0],id:String(i),date:i<21?'2026-01-01':'2026-02-01',category:i<15?'SC':'GA'})),statements:[]};
  for(let i=0;i<22;i++)data.statements.push([i,0,0,0,10,i%2===0?[0]:[],'Representative',1],[i,1,-1,0,20,[],'President',2]);
  data.meetings.push({...d.meetings[0],id:'un-only',category:'Other'});
  data.statements.push([22,0,1,1,10,[0],'Official',1]);
  const engine=new Engine(data),country={...q,profile:{kind:'country' as const,id:'FRA'}};
  const profile=engine.query(country).profile!;
  expect(profile.categories).toEqual([['SC',15],['GA',7]]);
  expect(profile.meetings).toBe(22);expect(profile.groups).toHaveLength(20);
  expect(engine.query({...country,page:1}).profile?.categories).toEqual(profile.categories);
  expect(engine.query({...country,topic:'t',affiliation:'fr',to:'2026-01-31'}).profile?.categories).toEqual([['SC',8],['GA',3]]);
  expect(engine.query({...country,category:'GA',from:'2026-02-01'}).profile?.categories).toEqual([['GA',1]]);
  expect(engine.query({...country,affiliation:'un'}).profile?.categories).toEqual([]);
 });
 it('keeps speaker profiles narrower than affiliations',()=>{expect(new Engine(d).query({...q,profile:{kind:'speaker',id:'a'}}).profile?.interventions).toBe(2)});
 it('handles missing filters, invalid date ranges and small countries',()=>{const e=new Engine(d);expect(e.query({...q,from:'2026-02-01',to:'2026-01-01'}).meetings).toBe(0);expect(e.query({...q,topic:'missing'}).interventions).toBe(0);expect(e.query(q).countries.some(c=>c.code==='MDV')).toBe(true);expect(countryCode('UN')).toBe('')});
});
describe('Full exported archive',()=>{
 const manifest=JSON.parse(readFileSync('public/data/manifest.json','utf8'));const data:Index=JSON.parse(readFileSync('public/data/'+manifest.index,'utf8'));const engine=new Engine(data);
 it('matches manifest totals with consistent dictionary references',()=>{const r=engine.query(q);expect(r.meetings).toBe(manifest.recordings);expect(r.interventions).toBe(manifest.interventions);expect(r.unnamed).toBe(manifest.unnamedInterventions);for(const s of data.statements){expect(data.meetings[s[0]]).toBeDefined();expect(data.affiliations[s[3]]).toBeDefined();if(s[2]>=0)expect(data.speakers[s[2]]).toBeDefined();for(const t of s[5])expect(data.topics[t]).toBeDefined()}});
 it('returns independently counted sample affiliation and topic intersections',()=>{const sample=data.statements.find(s=>s[5].length)!;const aff=data.affiliations[sample[3]].id,topic=data.topics[sample[5][0]].id;const rows=data.statements.filter(s=>s[3]===sample[3]&&s[5].includes(sample[5][0]));const r=engine.query({...q,affiliation:aff,topic});expect(r.interventions).toBe(rows.length);expect(r.meetings).toBe(new Set(rows.map(s=>s[0])).size)});
 it('benchmarks full index filtering',()=>{const values=[];for(let i=0;i<5;i++)values.push(engine.query({...q,from:'2025-01-01'}).elapsed);console.log('Full archive filter milliseconds:',values.map(x=>x.toFixed(1)).join(', '));expect(Math.min(...values)).toBeLessThan(300)});
});

describe('Country topic rankings',()=>{
 it('counts distinct recordings from country interventions and keeps rankings stable on selection',()=>{
  const data:Index={...d,topics:[...d.topics,{id:'peace',key:'peace',name:'Peace'}],statements:[...d.statements,[0,2,-1,0,100,[0,0,1],'',3],[1,3,-1,0,100,[1],'',4]]};
  const engine=new Engine(data),country:Query={...q,profile:{kind:'country',id:'FRA'}};
  const profile=engine.query(country).profile!;
  expect(profile.topics.map(t=>[t.id,t.meetings])).toEqual([['peace',2],['t',1]]);
  const selected=engine.query({...country,topic:'t'}).profile!;
  expect(selected.topics).toEqual(profile.topics);expect(selected.meetings).toBe(1);
  expect(selected.groups.flatMap(g=>g.statements).every(s=>s[3]===0&&s[5].includes(0))).toBe(true);
  expect(engine.query({...country,affiliation:'un'}).profile?.topics).toEqual([]);
  expect(engine.query({...country,from:'2027-01-01'}).profile?.topics).toEqual([]);
  expect(engine.query({...country,category:'missing'}).profile?.topics).toEqual([]);
 });
 it('ranks all recordings before pagination and limits the chart to ten topics',()=>{
  const topics=Array.from({length:12},(_,i)=>({id:String(i),key:String(i),name:`Topic ${String(i).padStart(2,'0')}`}));
  const data:Index={...d,topics,meetings:Array.from({length:23},(_,i)=>({...d.meetings[0],id:String(i)})),statements:Array.from({length:23},(_,i)=>[i,0,-1,0,0,topics.map((_,t)=>t),'',0])};
  const engine=new Engine(data),country:Query={...q,profile:{kind:'country',id:'FRA'}};
  const profile=engine.query(country).profile!;
  expect(profile.topics).toHaveLength(10);expect(profile.topics.map(t=>t.meetings)).toEqual(Array(10).fill(23));
  expect(profile.topics.map(t=>t.id)).toEqual(Array.from({length:10},(_,i)=>String(i)));
  expect(engine.query({...country,page:1}).profile?.topics).toEqual(profile.topics);
 });
});
