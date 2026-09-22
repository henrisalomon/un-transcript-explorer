import {useRef} from 'react';
import type {Meta,Query} from './types';
import {activeFilterChips,clearedFilters,datePresets} from './filters';
export function DatePresets({state,meta,onChange}:{state:Query;meta:Meta|null;onChange:(patch:Partial<Query>)=>void}){
 if(!meta)return null;
 return <div className="date-presets" role="group" aria-label="Date presets"><span>Quick dates</span>{datePresets(meta.manifest).map(p=><button key={p.label} type="button" aria-pressed={state.from===p.from&&state.to===p.to} title={p.from?`${p.from} to ${p.to}`:'All dates in the archive'} onClick={()=>onChange({from:p.from,to:p.to})}>{p.label}</button>)}</div>;
}
export default function FilterSummary({state,meta,onChange}:{state:Query;meta:Meta|null;onChange:(patch:Partial<Query>)=>void}){
 const ref=useRef<HTMLElement>(null),chips=activeFilterChips(state,meta);
 function remove(patch:Partial<Query>){
  onChange(patch);
  requestAnimationFrame(()=>ref.current?.querySelector<HTMLButtonElement>('.filter-chip, .edit-filters')?.focus({preventScroll:true}));
 }
 function edit(){
  const controls=document.getElementById('transcript-filters');
  controls?.scrollIntoView({block:'start'});
  controls?.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});
 }
 return <section className="filter-summary" aria-label="Active filters" ref={ref}>
  <span className="filter-summary-label">Filters{chips.length?` (${chips.length})`:''}</span>
  <div className="filter-chips">{chips.length?chips.map(chip=><button className="filter-chip" key={chip.key} type="button" title={`Remove ${chip.label}`} aria-label={`Remove ${chip.label}`} onClick={()=>remove(chip.clear)}><span>{chip.label}</span><span aria-hidden="true">×</span></button>):<span className="no-filters">None applied</span>}{chips.length>0&&<button className="clear-all-filters" onClick={()=>remove(clearedFilters)}>Clear all</button>}</div>
  <button className="edit-filters" onClick={edit}>Edit filters</button>
 </section>;
}
