import type {MonthlyActivity} from './types';

export function monthEnd(month:string){
 const [year,n]=month.split('-').map(Number);
 return new Date(Date.UTC(year,n,0)).toISOString().slice(0,10);
}

// Keep zero-activity months visible and mark clipped boundary months explicitly.
export function activityMonths(from:string,to:string):MonthlyActivity[]{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)return [];
 if(!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to)))return [];
 const rows:MonthlyActivity[]=[];
 let month=from.slice(0,7);
 while(month<=to.slice(0,7)){
  const start=month+'-01',end=monthEnd(month);
  rows.push({month,from:start<from?from:start,to:end>to?to:end,partial:start<from||end>to,meetings:0,interventions:0});
  const [year,n]=month.split('-').map(Number);
  month=new Date(Date.UTC(year,n,1)).toISOString().slice(0,7);
 }
 return rows;
}
