import {describe,it,expect} from 'vitest';
import {activityMonths} from '../src/activity';
import {Engine} from '../src/engine';
import type {Index,Query} from '../src/types';
const q:Query={from:'',to:'',category:'',affiliation:'',topic:'',view:'overview',profile:null,page:0,search:''};
const data:Index={schema:1,meetings:[
 {durationSeconds:3600,id:'a',title:'A',date:'2024-01-15',scheduled:'',category:'GA',body:'',slug:'a',file:'a'},
 {durationSeconds:1800,id:'b',title:'B',date:'2024-03-10',scheduled:'',category:'SC',body:'',slug:'b',file:'b'},
 {id:'c',title:'Empty',date:'2024-03-20',scheduled:'',category:'GA',body:'',slug:'c',file:'c'}
],speakers:[],affiliations:[{id:'fr',code:'FRA',name:'France'},{id:'un',code:'UN',name:'UN'}],topics:[{id:'climate',key:'climate',name:'Climate'}],statements:[[0,0,-1,0,0,[0],'',0],[0,1,-1,0,1,[],'',1],[1,0,-1,0,0,[],'',0],[1,1,-1,1,1,[0],'',1]]};
describe('Monthly archive activity',()=>{
 it('retains empty months, handles leap years, and clips partial months',()=>{
  const rows=activityMonths('2024-01-15','2024-03-20');
  expect(rows.map(r=>[r.from,r.to,r.partial])).toEqual([['2024-01-15','2024-01-31',true],['2024-02-01','2024-02-29',false],['2024-03-01','2024-03-20',true]]);
  expect(activityMonths('2025-01-01','2024-12-31')).toEqual([]);
  expect(activityMonths('','')).toEqual([]);
  expect(activityMonths('2024-bad','2025-01-01')).toEqual([]);
 });
 it('counts distinct recordings and every matching intervention, including statement-free recordings',()=>{
  const r=new Engine(data).query(q);
  expect(r.monthly.map(m=>[m.meetings,m.interventions])).toEqual([[1,2],[0,0],[2,2]]);
  expect(r.monthly.reduce((n,m)=>n+m.meetings,0)).toBe(r.meetings);
  expect(r.monthly.reduce((n,m)=>n+m.interventions,0)).toBe(r.interventions);
 });
 it('totals full recording duration once per matching meeting and tracks unavailable durations',()=>{
  const e=new Engine(data),all=e.query(q);
  expect(all.durationSeconds).toBe(5400);expect(all.missingDurations).toBe(1);
  const filtered=e.query({...q,affiliation:'fr',topic:'climate'});
  expect(filtered.durationSeconds).toBe(3600);expect(filtered.missingDurations).toBe(0);
  expect(e.query({...q,from:'2024-03-01',category:'SC'}).durationSeconds).toBe(1800);
  expect(e.query({...q,from:'2025-01-01'}).durationSeconds).toBe(0);
 });
 it('applies date, type, affiliation and topic intersections consistently',()=>{
  const e=new Engine(data);
  const r=e.query({...q,affiliation:'fr',topic:'climate'});
  expect(r.monthly.map(m=>[m.meetings,m.interventions])).toEqual([[1,1],[0,0],[0,0]]);
  const march=e.query({...q,from:'2024-03-05',to:'2024-03-15',category:'SC'});
  expect(march.monthly).toEqual([{month:'2024-03',from:'2024-03-05',to:'2024-03-15',partial:true,meetings:1,interventions:2}]);
  expect(e.query({...q,from:'2025-01-01'}).monthly).toEqual([]);
  expect(e.query({...q,from:'2024-03-01',to:'2024-01-01'}).monthly).toEqual([]);
 });
});
