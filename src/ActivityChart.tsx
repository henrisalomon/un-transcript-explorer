import {useState} from 'react';
import type {MonthlyActivity} from './types';
export type Metric='meetings'|'interventions';
export const metricLabel=(metric:Metric)=>metric==='meetings'?'Meetings':'Interventions';
export function MetricToggle({value,onChange,label}:{value:Metric;onChange:(value:Metric)=>void;label:string}){return <div className="comparison-toggle" role="group" aria-label={label}>{(['meetings','interventions'] as const).map(metric=><button key={metric} aria-pressed={value===metric} onClick={()=>onChange(metric)}>{metricLabel(metric)}</button>)}</div>}
const fmt=(n:number)=>n.toLocaleString('en-US');
const monthLabel=(month:string)=>new Date(month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});
export default function ActivityChart({rows,from,to,onRange}:{rows:MonthlyActivity[];from:string;to:string;onRange:(from:string,to:string)=>void}){
 const [hover,setHover]=useState(''),[metric,setMetric]=useState<Metric>('meetings');
 const max=Math.max(1,...rows.map(r=>r[metric]));
 const active=rows.find(r=>r.month===hover);
 const describe=(row:MonthlyActivity)=>`${monthLabel(row.month)}: ${fmt(row[metric])} ${metricLabel(metric).toLowerCase()}${row.partial?' · partial month':''}`;
 return <section className="panel activity-panel" aria-labelledby="activity-heading">
  <div className="panel-heading"><h2 id="activity-heading">Activity in the downloaded archive</h2><MetricToggle value={metric} onChange={setMetric} label="Activity measure"/></div>
  {rows.length?<><div className="activity-scroll"><div className="activity-plot" style={{minWidth:Math.max(280,rows.length*38)}}><div className="activity-axis" aria-hidden="true"><span>{fmt(max)}</span><span>{fmt(Math.round(max/2))}</span><span>0</span></div><div className="activity-columns">{rows.map(row=><button className={'month-column'+(row.partial?' partial':'')} key={row.month} onClick={()=>onRange(row.from,row.to)} aria-label={describe(row)+'. Filter to this month.'} aria-pressed={from===row.from&&to===row.to} onMouseEnter={()=>setHover(row.month)} onMouseLeave={()=>setHover('')} onFocus={()=>setHover(row.month)} onBlur={()=>setHover('')}><span className="month-bar-space"><span className="month-bar" style={{height:`${row[metric]/max*100}%`}}/></span><span className="month-label">{monthLabel(row.month).split(' ')[0]}{row.partial?'*':''}<small>{row.month.slice(0,4)}</small></span></button>)}</div></div></div><div className="activity-caption"><span role="status">{active?describe(active):'Select a month to filter the dashboard.'}</span>{(from||to)&&<button className="text-link" onClick={()=>onRange('','')}>Reset dates</button>}</div><p className="chart-note"><span className="timeline-scroll-hint">Scroll horizontally to see all months. </span>{rows.some(r=>r.partial)?'* Partial month within the archive or selected dates. ':''}Counts reflect downloaded transcripts, not all UN activity.</p></>:<p className="empty">No archive dates overlap this selection.</p>}
 </section>;
}
