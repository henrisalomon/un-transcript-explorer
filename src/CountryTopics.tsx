import type {Topic} from './types';
export default function CountryTopics({topics,selected,selectedName,onSelect}:{topics:(Topic&{meetings:number})[];selected:string;selectedName:string;onSelect:(id:string)=>void}){
 const max=Math.max(1,...topics.map(t=>t.meetings));
 return <section className="panel" aria-labelledby="country-topics-heading"><div className="panel-heading"><h2 id="country-topics-heading">Most discussed topics</h2><span>Top 10 · Recording counts</span></div>
 <p className="chart-note topic-scope">Topics attributed to this country’s interventions. Counts follow the date, meeting-type and affiliation filters; selecting a topic filters the statements below.</p>
 {selected&&<div className="topic-selection" role="status"><span>Selected topic: <strong>{selectedName}</strong></span><button className="text-link" onClick={()=>onSelect('')}>Show all topics</button></div>}
 {topics.length?<ol className="topic-bars">{topics.map(t=><li key={t.id}><button className="topic-bar-row" aria-pressed={selected===t.id} aria-label={`${t.name}: ${t.meetings.toLocaleString('en-US')} recordings. Filter statements.`} onClick={()=>onSelect(selected===t.id?'':t.id)}><span>{t.name}</span><span className="topic-bar-track" aria-hidden="true"><span style={{width:`${t.meetings/max*100}%`}}/></span><strong>{t.meetings.toLocaleString('en-US')}</strong></button></li>)}</ol>:<p className="empty">No supplied topics are available for this country under these filters.</p>}
 </section>;
}
