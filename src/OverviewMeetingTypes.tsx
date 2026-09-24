export default function OverviewMeetingTypes({categories}:{categories:[string,number][]}){
 const top=categories.slice(0,10),remaining=categories.slice(10),max=Math.max(1,...categories.map(([,n])=>n));
 const rows=(items:[string,number][])=>items.map(([name,n])=><div className="bar-row" key={name}><span>{name}</span><div className="bar-track" aria-hidden="true"><div style={{width:`${n/max*100}%`}}/></div><strong>{n.toLocaleString('en-US')}</strong></div>);
 return <section className="panel" aria-labelledby="overview-types-heading"><div className="panel-heading"><h2 id="overview-types-heading">Meetings by type</h2><span>Top 10 · Meeting recordings</span></div>{top.length?<><div className="bars">{rows(top)}</div>{remaining.length>0&&<details className="chart-data"><summary>Show remaining meeting types ({remaining.length.toLocaleString('en-US')})</summary><div className="bars">{rows(remaining)}</div></details>}</>:<p className="empty">No recordings match these filters.</p>}</section>;
}
