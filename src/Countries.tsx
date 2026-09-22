import {useState} from 'react';
import {comparisonCountries,permanentMembers,sharedParticipation} from './countryComparison';
import type {Profile,Result} from './types';
const colors=['#116f9d','#ba4e19','#63702c','#8656a4','#c13966','#257b69','#7a583c','#4e60ad','#66727d','#9b7410'];
const typeColors=[...colors,'#6a3c69','#14898b','#a55347','#857744','#53673e','#69619a'];
const fmt=(n:number)=>n.toLocaleString('en-US');
const monthName=(s:string)=>new Date(s+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
export default function Countries({result,onProfile}:{result:Result;onProfile:(p:Profile)=>void}){
 const rows=comparisonCountries(result.countryActivity,result.monthly.length);
 const [focus,setFocus]=useState(''),[pair,setPair]=useState(['USA','CHN']),[proportion,setProportion]=useState(false),[showValues,setShowValues]=useState(false);
 const a=rows.find(r=>r.code===pair[0])||rows[0],b=rows.find(r=>r.code===pair[1]&&r.code!==a.code)||rows.find(r=>r.code!==a.code)!;
 const shared=sharedParticipation(a,b),max=Math.max(1,...rows.flatMap(r=>r.monthly));
 const activeFocus=rows.some(r=>r.code===focus)?focus:'';
 const categoryTotals=new Map<string,number>();
 for(const r of rows)for(const [name,n] of r.categories)categoryTotals.set(name,(categoryTotals.get(name)||0)+n);
 const categories=[...categoryTotals.keys()].sort((a,b)=>categoryTotals.get(b)!-categoryTotals.get(a)!||a.localeCompare(b));
 const maxMeetings=Math.max(1,...rows.map(r=>r.meetings));
 const x=(i:number)=>56+(result.monthly.length===1?430:i/Math.max(1,result.monthly.length-1)*860),y=(n:number)=>240-n/max*210;
 const isP5=(code:string)=>permanentMembers.some(([c])=>c===code);
 return <><div className="page-heading"><div><h1>Countries</h1><p>Compare participation across time, meeting types, and shared recordings.</p></div></div>
 <section className="panel" aria-labelledby="country-trends"><div className="panel-heading"><h2 id="country-trends">Participation over time</h2><span>Distinct recordings per month</span></div>
 <div className="country-trend-layout">
 {result.monthly.length&&rows.some(r=>r.meetings)?<div className="trend-scroll"><svg className="country-trends" viewBox="0 0 950 290" role="img" aria-label="Monthly country participation. Exact values are available in the data table below.">
 {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="56" x2="916" y1={y(max*t)} y2={y(max*t)} stroke="#dce5ec"/><text x="45" y={y(max*t)+4} textAnchor="end">{Math.round(max*t)}</text></g>)}
 {result.monthly.map((m,i)=>(result.monthly.length<=16||i%2===0||i===result.monthly.length-1)&&<text key={m.month} x={x(i)} y="267" textAnchor="middle">{monthName(m.month)}{m.partial?'*':''}</text>)}
 {rows.map((r,i)=><g key={r.code} opacity={activeFocus&&activeFocus!==r.code?0.12:1}><polyline fill="none" stroke={colors[i]} strokeWidth={focus===r.code?3.5:2} strokeDasharray={i>4?'7 3':undefined} points={r.monthly.map((n,j)=>`${x(j)},${y(n)}`).join(' ')}/>{r.monthly.map((n,j)=><circle key={j} cx={x(j)} cy={y(n)} r="3" fill={colors[i]}><title>{r.name} · {monthName(result.monthly[j].month)}: {fmt(n)} recordings</title></circle>)}</g>)}
 </svg></div>:<p className="empty">No country participation matches these filters.</p>}
 <aside className="trend-totals"><div className="totals-heading"><span>Country</span><strong>Total</strong></div> <div className="country-legend country-totals">{rows.map((r,i)=><button key={r.code} aria-pressed={focus===r.code} onClick={()=>setFocus(focus===r.code?'':r.code)}><i style={{background:colors[i]}}/>{r.name}{isP5(r.code)&&<small>P5</small>}<strong>{fmt(r.meetings)}</strong></button>)}</div><p className="chart-note">Recordings in the selected period</p></aside></div>
 <p className="chart-note">Scroll horizontally on smaller screens to see all months. Select a country in the totals list to highlight its line; select it again to show all. {result.monthly.some(m=>m.partial)?'* Partial month within the archive or selected dates. ':''}Counts reflect the downloaded archive.</p>
 <details className="chart-data"><summary>View monthly data and country profiles</summary><div className="table-scroll"><table><thead><tr><th>Country</th>{result.monthly.map(m=><th className="numeric" key={m.month}>{monthName(m.month)}{m.partial?'*':''}</th>)}<th className="numeric">Total</th></tr></thead><tbody>{rows.map(r=><tr key={r.code}><th scope="row"><button className="text-link" onClick={()=>onProfile({kind:'country',id:r.code})}>{r.name}</button></th>{r.monthly.map((n,i)=><td className="numeric" key={i}>{fmt(n)}</td>)}<td className="numeric"><strong>{fmt(r.meetings)}</strong></td></tr>)}</tbody></table></div></details>
 </section>
 <section className="panel" aria-labelledby="country-breakdown"><div className="panel-heading"><h2 id="country-breakdown">Meeting-type breakdown</h2><div className="breakdown-controls"><button className="values-toggle" aria-pressed={showValues} onClick={()=>setShowValues(!showValues)}>{showValues?'Hide values':'Show values'}</button><div className="comparison-toggle" role="group" aria-label="Breakdown measure"><button aria-pressed={!proportion} onClick={()=>setProportion(false)}>Recordings</button><button aria-pressed={proportion} onClick={()=>setProportion(true)}>Percentage</button></div></div></div>
 <div className="type-legend">{categories.map((c,i)=><span key={c}><i style={{background:typeColors[i%typeColors.length]}}/>{c}</span>)}</div>
 <div className="breakdown-rows">{rows.map(r=><div className="breakdown-row" key={r.code}><button className="text-link" onClick={()=>onProfile({kind:'country',id:r.code})}>{r.name}</button><div className="stacked-track" role="img" aria-label={`${r.name}: ${r.categories.map(([c,n])=>`${c}, ${n} recordings (${(n/r.meetings*100).toFixed(1)}%)`).join('; ')||'No matching recordings'}`}><div className="stacked-bar" style={{width:`${proportion?(r.meetings?100:0):r.meetings/maxMeetings*100}%`}}>{[...r.categories].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([c,n])=>{const i=categories.indexOf(c);return n?<span key={c} title={`${c}: ${fmt(n)} (${(n/r.meetings*100).toFixed(1)}%)`} style={{width:`${n/r.meetings*100}%`,background:typeColors[i%typeColors.length]}}/>:null})}</div></div><strong>{fmt(r.meetings)}</strong>{showValues&&<div className="breakdown-values">{[...r.categories].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([c,n])=><span key={c}><i style={{background:typeColors[categories.indexOf(c)%typeColors.length]}}/>{c}: <strong>{proportion?`${(n/r.meetings*100).toFixed(1)}%`:fmt(n)}</strong></span>)}{!r.meetings&&<span>No matching recordings</span>}</div>}</div>)}</div>
 <p className="chart-note">Largest meeting types appear on the left of each bar. Each recording is counted once per country. Percentages use that country’s matching recordings. Select a country name to read its statements.</p>
 <details className="chart-data"><summary>View meeting-type data</summary><div className="table-scroll"><table><thead><tr><th>Country</th>{categories.map(c=><th className="numeric" key={c}>{c}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.code}><th scope="row">{r.name}</th>{categories.map(c=><td className="numeric" key={c}>{fmt(r.categories.find(([name])=>name===c)?.[1]||0)}</td>)}</tr>)}</tbody></table></div></details>
 </section>
 <section className="panel" aria-labelledby="country-shared"><div className="panel-heading"><h2 id="country-shared">Shared participation</h2><span>Compare two of the displayed countries</span></div>
 <div className="pair-selectors"><label className="field">First country<select value={a.code} onChange={e=>setPair([e.target.value,b.code===e.target.value?a.code:b.code])}>{rows.map(r=><option value={r.code} key={r.code}>{r.name}</option>)}</select></label><label className="field">Second country<select value={b.code} onChange={e=>setPair([a.code,e.target.value])}>{rows.filter(r=>r.code!==a.code).map(r=><option value={r.code} key={r.code}>{r.name}</option>)}</select></label></div>
 <div className="shared-stats"><div><span>Only {a.name}</span><strong>{fmt(shared.onlyA)}</strong></div><div><span>Both countries</span><strong>{fmt(shared.both)}</strong></div><div><span>Only {b.name}</span><strong>{fmt(shared.onlyB)}</strong></div></div>
 <div className="shared-bar" aria-hidden="true">{[shared.onlyA,shared.both,shared.onlyB].map((n,i)=><span key={i} style={{width:`${n/Math.max(1,shared.union)*100}%`,background:['#116f9d','#257b69','#ba4e19'][i]}}/>)}</div>

 </section></>;
}
