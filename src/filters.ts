import type {Meta,Query} from './types';
export type DatePreset={label:string;from:string;to:string};
export type FilterChip={key:string;label:string;clear:Partial<Query>};
export const clearedFilters={from:'',to:'',category:'',affiliation:'',topic:'',search:''};
const formatDate=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export function datePresets(range:{dateFrom:string;dateTo:string}):DatePreset[]{
 const end=new Date(range.dateTo+'T12:00:00Z');
 if(!Number.isFinite(end.getTime()))return [{label:'All dates',from:'',to:''}];
 const latest=end.getUTCFullYear(),first=Number(range.dateFrom.slice(0,4));
 const years=[latest-1,latest].filter(year=>year>=first).map(year=>({label:String(year),from:`${year}-01-01`,to:`${year}-12-31`}));
 end.setUTCDate(end.getUTCDate()-89);
 return [{label:'All dates',from:'',to:''},...years,{label:'Latest 90 days in archive',from:[end.toISOString().slice(0,10),range.dateFrom].sort().at(-1)!,to:range.dateTo}];
}
export function activeFilterChips(query:Query,meta:Meta|null):FilterChip[]{
 const chips:FilterChip[]=[];
 if(query.from||query.to){
  const preset=meta?datePresets(meta.manifest).find(p=>p.from===query.from&&p.to===query.to):undefined;
  const range=query.from&&query.to?`${formatDate(query.from)}–${formatDate(query.to)}`:query.from?`From ${formatDate(query.from)}`:`Through ${formatDate(query.to)}`;
  chips.push({key:'dates',label:preset&&preset.label!=='Latest 90 days in archive'?`Dates: ${preset.label}`:`Dates: ${range}`,clear:{from:'',to:''}});
 }
 if(query.category)chips.push({key:'category',label:`Type: ${query.category}`,clear:{category:''}});
 if(query.affiliation)chips.push({key:'affiliation',label:`Affiliation: ${meta?.affiliations.find(a=>a.id===query.affiliation)?.name||'Unavailable selection'}`,clear:{affiliation:''}});
 if(query.topic)chips.push({key:'topic',label:`Topic: ${meta?.topics.find(t=>t.id===query.topic)?.name||'Unavailable selection'}`,clear:{topic:''}});
 if(query.view==='speakers'&&!query.profile&&query.search)chips.push({key:'search',label:`Search: ${query.search}`,clear:{search:''}});
 return chips;
}
