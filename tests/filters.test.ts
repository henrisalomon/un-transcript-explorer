import {describe,it,expect} from 'vitest';
import {datePresets,activeFilterChips} from '../src/filters';
import type {Meta,Query} from '../src/types';
const query:Query={from:'',to:'',category:'',affiliation:'',topic:'',view:'overview',profile:null,page:0,search:''};
const meta={manifest:{dateFrom:'2024-11-26',dateTo:'2026-09-14'},affiliations:[{id:'fr',name:'France',code:'FRA'}],topics:[{id:'t',name:'Climate',key:'climate'}]} as Meta;
describe('Date presets and active filters',()=>{
 it('uses calendar years and 90 inclusive UTC days ending at the archive date',()=>{
  expect(datePresets(meta.manifest)).toEqual([{label:'All dates',from:'',to:''},{label:'2025',from:'2025-01-01',to:'2025-12-31'},{label:'2026',from:'2026-01-01',to:'2026-12-31'},{label:'Latest 90 days in archive',from:'2026-06-17',to:'2026-09-14'}]);
  expect(datePresets({dateFrom:'2023-01-01',dateTo:'2024-03-10'}).at(-1)?.from).toBe('2023-12-12');
 });
 it('clips the latest window for short archives and handles missing dates',()=>{
  expect(datePresets({dateFrom:'2026-09-01',dateTo:'2026-09-14'}).at(-1)?.from).toBe('2026-09-01');
  expect(datePresets({dateFrom:'',dateTo:''})).toEqual([{label:'All dates',from:'',to:''}]);
 });
 it('resolves labels and clears only the selected filter',()=>{
  const selected={...query,from:'2025-01-01',to:'2025-12-31',category:'General Assembly',affiliation:'fr',topic:'t',profile:{kind:'country' as const,id:'FRA'},page:3};
  const chips=activeFilterChips(selected,meta);
  expect(chips.map(c=>c.label)).toEqual(['Dates: 2025','Type: General Assembly','Affiliation: France','Topic: Climate']);
  expect({...selected,...chips[0].clear}).toEqual({...selected,from:'',to:''});
  expect(chips[2].clear).toEqual({affiliation:''});
  expect(activeFilterChips({...query,from:'2026-08-15'},meta)[0].label).toBe('Dates: From 15 Aug 2026');
  expect(activeFilterChips({...query,topic:'unknown'},meta)[0].label).toBe('Topic: Unavailable selection');
 });
 it('shows directory search only where it affects results',()=>{
  expect(activeFilterChips({...query,view:'speakers',search:'France'},meta)[0].clear).toEqual({search:''});
  expect(activeFilterChips({...query,search:'France'},meta)).toEqual([]);
 });
});
