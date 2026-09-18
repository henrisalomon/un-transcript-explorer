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
 it('keeps speaker profiles narrower than affiliations',()=>{expect(new Engine(d).query({...q,profile:{kind:'speaker',id:'a'}}).profile?.interventions).toBe(2)});
 it('handles missing filters, invalid date ranges and small countries',()=>{const e=new Engine(d);expect(e.query({...q,from:'2026-02-01',to:'2026-01-01'}).meetings).toBe(0);expect(e.query({...q,topic:'missing'}).interventions).toBe(0);expect(e.query(q).countries.some(c=>c.code==='MDV')).toBe(true);expect(countryCode('UN')).toBe('')});
});
describe('Full exported archive',()=>{
 const manifest=JSON.parse(readFileSync('public/data/manifest.json','utf8'));const data:Index=JSON.parse(readFileSync('public/data/'+manifest.index,'utf8'));const engine=new Engine(data);
 it('matches manifest totals with consistent dictionary references',()=>{const r=engine.query(q);expect(r.meetings).toBe(manifest.recordings);expect(r.interventions).toBe(manifest.interventions);expect(r.unnamed).toBe(manifest.unnamedInterventions);for(const s of data.statements){expect(data.meetings[s[0]]).toBeDefined();expect(data.affiliations[s[3]]).toBeDefined();if(s[2]>=0)expect(data.speakers[s[2]]).toBeDefined();for(const t of s[5])expect(data.topics[t]).toBeDefined()}});
 it('returns independently counted sample affiliation and topic intersections',()=>{const sample=data.statements.find(s=>s[5].length)!;const aff=data.affiliations[sample[3]].id,topic=data.topics[sample[5][0]].id;const rows=data.statements.filter(s=>s[3]===sample[3]&&s[5].includes(sample[5][0]));const r=engine.query({...q,affiliation:aff,topic});expect(r.interventions).toBe(rows.length);expect(r.meetings).toBe(new Set(rows.map(s=>s[0])).size)});
 it('benchmarks full index filtering',()=>{const values=[];for(let i=0;i<5;i++)values.push(engine.query({...q,from:'2025-01-01'}).elapsed);console.log('Full archive filter milliseconds:',values.map(x=>x.toFixed(1)).join(', '));expect(Math.min(...values)).toBeLessThan(300)});
});
