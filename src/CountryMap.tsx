import {useEffect,useMemo,useState} from 'react';
import {geoNaturalEarth1,geoPath} from 'd3-geo';
import {feature} from 'topojson-client';
import type {Feature,Geometry} from 'geojson';
import {metricLabel,type Metric} from './ActivityChart';
import type {CountryRow} from './types';
const fmt=(n:number)=>n.toLocaleString('en-US');
export default function CountryMap({rows,total,metric,onCountry}:{rows:CountryRow[];total:number;metric:Metric;onCountry:(s:string)=>void}){
 const [shapes,setShapes]=useState<Feature<Geometry>[]>([]),[error,setError]=useState(false),[hover,setHover]=useState<{code:string;name:string}|null>(null);
 useEffect(()=>{let alive=true;fetch('/world.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(w=>{const collection=feature(w,w.objects.features) as unknown as {features:Feature<Geometry>[]};if(alive)setShapes(collection.features.filter(f=>f.properties?.id!=='ATA'))}).catch(()=>{if(alive)setError(true)});return()=>{alive=false}},[]);
 const lookup=new Map(rows.map(r=>[r.code,r])),max=Math.max(1,...rows.map(r=>r[metric]));
 const ticks=[...new Set([1,Math.round(1+(max-1)*.25),Math.round(1+(max-1)*.5),Math.round(1+(max-1)*.75),max])];
 const color=(n:number)=>`color-mix(in srgb, var(--blue) ${20+(max===1?1:(n-1)/(max-1))*80}%, var(--map-low))`;
 const paths=useMemo(()=>{if(!shapes.length)return[];const projection=geoNaturalEarth1().fitExtent([[8,8],[992,498]],{type:'FeatureCollection',features:shapes});const path=geoPath(projection);return shapes.map(f=>({code:({SDS:'SSD',KOS:'XKX',PSX:'PSE'} as Record<string,string>)[f.properties?.id]||f.properties?.id,name:f.properties?.name_long||f.properties?.name,path:path(f)||''}))},[shapes]);
 const share=(row:CountryRow)=>`${total?(row[metric]/total*100).toFixed(1):'0.0'}% of filtered ${metricLabel(metric).toLowerCase()}`;
 const detail=(row:CountryRow)=>`${fmt(row[metric])} ${metricLabel(metric).toLowerCase()} · ${share(row)}`;
 const hovered=hover?lookup.get(hover.code):undefined;
 return <div className="map-area">
  <div className="map-canvas" onKeyDown={e=>{if(e.key==='Escape')setHover(null)}} onMouseLeave={()=>setHover(null)}>
   {error?<p className="empty">Map unavailable. Use the country list to explore participation.</p>:!paths.length?<p className="map-loading">Loading world map…</p>:<svg viewBox="0 0 1000 506" className="world-map" aria-label={`World map: ${metricLabel(metric).toLowerCase()} by country`}>{paths.map(f=>{const row=lookup.get(f.code);return <path key={f.code} d={f.path} fill={row?color(row[metric]):'var(--map-empty)'} role={row?'button':undefined} tabIndex={row?0:undefined} aria-label={`${row?.name||f.name}: ${row?detail(row):'no matching data'}`} onMouseEnter={()=>setHover(f)} onFocus={()=>setHover(f)} onBlur={()=>setHover(null)} onClick={()=>row&&onCountry(f.code)} onKeyDown={e=>{if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onCountry(f.code)}}}/>})}</svg>}
   {hover&&<div className="map-tooltip" role="tooltip"><strong>{hovered?.name||hover.name}</strong>{hovered?<><span>{fmt(hovered[metric])} {metricLabel(metric).toLowerCase()}</span><span>{share(hovered)}</span></>:<span>No matching data</span>}</div>}
  </div>
  <div className="map-scale"><span className="scale-title">{metricLabel(metric)} by country</span>{rows.length>0&&<div className="scale-ramp"><div style={{background:`linear-gradient(to right, ${color(1)}, ${color(max)})`}}/><div className="scale-ticks">{ticks.map(n=><span key={n}>{fmt(n)}</span>)}</div></div>}<span className="scale-empty"><i className="no-data"/>No matching data</span></div>
  <p className="chart-note">Select a country to read its statements. Hover or focus for counts and share.</p>
 </div>;
}
