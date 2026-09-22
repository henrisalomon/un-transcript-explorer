import {useState} from 'react';
import type {MonthlyActivity} from './types';
const fmt=(n:number)=>n.toLocaleString('en-US');
const monthLabel=(month:string)=>new Date(month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});
export default function ActivityChart({rows,from,to,onRange}:{rows:MonthlyActivity[];from:string;to:string;onRange:(from:string,to:string)=>void}){
 const [hover,setHover]=useState('');
 const max=Math.max(1,...rows.map(r=>r.meetings));
 const active=rows.find(r=>r.month===hover);
 const describe=(row:MonthlyActivity)=>`${monthLabel(row.month)}: ${fmt(row.meetings)} meeting${row.meetings===1?'':'s'}${row.partial?' · partial month':''}`;
 return <section className="panel activity-panel" aria-labelledby="activity-heading">
  <div className="panel-heading"><h2 id="activity-heading">Activity in the downloaded archive</h2><span>Number of meetings</span></div>
  {rows.length?<><div className="activity-scroll"><div className="activity-plot" style={{minWidth:Math.max(280,rows.length*38)}}><div className="activity-axis" aria-hidden="true"><span>{fmt(max)}</span><span>{fmt(Math.round(max/2))}</span><span>0</span></div><div className="activity-columns">{rows.map(row=><button className={'month-column'+(row.partial?' partial':'')} key={row.month} onClick={()=>onRange(row.from,row.to)} aria-label={describe(row)+'. Filter to this month.'} aria-pressed={from===row.from&&to===row.to} onMouseEnter={()=>setHover(row.month)} onMouseLeave={()=>setHover('')} onFocus={()=>setHover(row.month)} onBlur={()=>setHover('')}><span className="month-bar-space"><span className="month-bar" style={{height:`${row.meetings/max*100}%`}}/></span><span className="month-label">{monthLabel(row.month).split(' ')[0]}{row.partial?'*':''}<small>{row.month.slice(0,4)}</small></span></button>)}</div></div></div><div className="activity-caption"><span role="status">{active?describe(active):'Select a month to filter the dashboard.'}</span>{(from||to)&&<button className="text-link" onClick={()=>onRange('','')}>Reset dates</button>}</div><p className="chart-note"><span className="timeline-scroll-hint">Scroll horizontally to see all months. </span>{rows.some(r=>r.partial)?'* Partial month within the archive or selected dates. ':''}Counts reflect downloaded transcripts, not all UN activity.</p></>:<p className="empty">No archive dates overlap this selection.</p>}
 </section>;
}
