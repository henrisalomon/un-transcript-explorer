import type {CountryActivity} from './types';
export const permanentMembers=[['CHN','China'],['FRA','France'],['RUS','Russian Federation'],['GBR','United Kingdom'],['USA','United States']] as const;
export function comparisonCountries(rows:CountryActivity[],months:number):CountryActivity[]{
 const p5=new Set<string>(permanentMembers.map(([code])=>code));
 const selected=[...permanentMembers.map(([code,name])=>rows.find(r=>r.code===code)||{code,name,meetings:0,interventions:0,monthly:Array(months).fill(0),categories:[],recordings:[]}),...rows.filter(r=>!p5.has(r.code)).sort((a,b)=>b.meetings-a.meetings||a.name.localeCompare(b.name)).slice(0,5)];
 return selected.sort((a,b)=>b.meetings-a.meetings||a.name.localeCompare(b.name));
}
export function sharedParticipation(a:CountryActivity,b:CountryActivity){
 const ids=new Set(b.recordings),both=a.recordings.filter(id=>ids.has(id)).length;
 return {both,onlyA:a.recordings.length-both,onlyB:b.recordings.length-both,union:a.recordings.length+b.recordings.length-both};
}
