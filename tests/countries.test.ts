import {describe,it,expect} from 'vitest';
import {Engine} from '../src/engine';
import {comparisonCountries,sharedParticipation,permanentMembers} from '../src/countryComparison';
import type {Index,Query,CountryActivity} from '../src/types';
const q:Query={from:'',to:'',category:'',affiliation:'',topic:'',view:'countries',profile:null,page:0,search:''};
const data:Index={schema:1,meetings:[{id:'1',title:'One',date:'2026-01-01',scheduled:'',category:'SC',body:'',slug:'1',file:'1'},{id:'2',title:'Two',date:'2026-03-01',scheduled:'',category:'GA',body:'',slug:'2',file:'2'}],affiliations:[{id:'fr',name:'France',code:'FRA'},{id:'us',name:'United States',code:'USA'}],speakers:[],topics:[{id:'topic',key:'t',name:'Topic'}],statements:[[0,0,-1,0,0,[0],'',0],[0,1,-1,0,1,[],'',1],[0,2,-1,1,2,[],'',2],[1,0,-1,1,0,[0],'',0]]};
describe('Countries comparison',()=>{
 it('deduplicates recordings, includes unnamed speakers, and fills empty months',()=>{
  const r=new Engine(data).query(q),fr=r.countryActivity.find(c=>c.code==='FRA')!,us=r.countryActivity.find(c=>c.code==='USA')!;
  expect(fr.monthly).toEqual([1,0,0]);expect(us.monthly).toEqual([1,0,1]);expect(fr.categories).toEqual([['SC',1]]);
  expect(sharedParticipation(fr,us)).toEqual({both:1,onlyA:0,onlyB:1,union:2});
 });
 it('applies all filters to the same interventions before calculating overlap',()=>{
  const engine=new Engine(data),r=engine.query({...q,topic:'topic'}),fr=r.countryActivity.find(c=>c.code==='FRA')!,us=r.countryActivity.find(c=>c.code==='USA')!;
  expect(sharedParticipation(fr,us).both).toBe(0);
  const filtered=engine.query({...q,topic:'topic',affiliation:'us',category:'GA',from:'2026-03-01',to:'2026-03-31'});
  expect(filtered.countryActivity).toHaveLength(1);expect(filtered.countryActivity[0].monthly).toEqual([1]);
  expect(engine.query({...q,from:'2027-01-01'}).countryActivity).toEqual([]);
 });
 it('always retains P5 and ranks the remaining five by distinct recordings',()=>{
  const rows:CountryActivity[]=Array.from({length:12},(_,i)=>({code:`C${i}`,name:`Country ${i}`,meetings:i,interventions:100-i,monthly:[i],categories:[],recordings:[]}));
  const selected=comparisonCountries(rows,1);
  expect(selected).toHaveLength(10);for(const [code] of permanentMembers)expect(selected.find(c=>c.code===code)?.monthly).toEqual([0]);
  expect(selected.filter(r=>r.code.startsWith('C')&&r.code!=='CHN').map(r=>r.meetings)).toEqual([11,10,9,8,7]);
  const empty=comparisonCountries([],0);expect(empty).toHaveLength(5);expect(sharedParticipation(empty[0],empty[1]).union).toBe(0);
 });
});
