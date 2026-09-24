import {activityMonths} from './activity';
import iso from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import type {Index,Query,Result,Statement,CountryRow,PersonRow} from './types';
iso.registerLocale(en);
export function countryCode(code:string){const upper=code.toUpperCase();return /^[A-Z]{3}$/.test(upper)&&iso.alpha3ToAlpha2(upper)?upper:''}
export class Engine{
  private ai:Map<string,number>;private pi:Map<string,number>;private ti:Map<string,number>;private countryCodes:string[];private dateFrom:string;private dateTo:string;
  constructor(public data:Index){this.ai=new Map(data.affiliations.map((a,i)=>[a.id,i]));this.pi=new Map(data.speakers.map((p,i)=>[p.id,i]));this.ti=new Map(data.topics.map((t,i)=>[t.id,i]));this.countryCodes=data.affiliations.map(a=>countryCode(a.code));const dates=data.meetings.map(m=>m.date).filter(Boolean).sort();this.dateFrom=dates[0]||'';this.dateTo=dates[dates.length-1]||''}
  query(q:Query):Result{
    const start=performance.now(),d=this.data;
    const aid=q.affiliation?this.ai.get(q.affiliation):undefined,tid=q.topic?this.ti.get(q.topic):undefined;
    const validFilter=(!q.affiliation||aid!==undefined);
    const valid=d.meetings.map(m=>validFilter&&(!q.from||m.date>=q.from)&&(!q.to||m.date<=q.to)&&(!q.category||m.category===q.category));
    const meetingIds=new Set<number>(),country=new Map<string,{name:string;m:Set<number>;n:number}>(),person=new Map<number,{m:Set<number>;n:number;latest:string;functions:Set<string>}>();
    const monthly=activityMonths(q.from>this.dateFrom?q.from:this.dateFrom,q.to&&q.to<this.dateTo?q.to:this.dateTo);
    const monthLookup=new Map(monthly.map(row=>[row.month,row]));
    const topicRecordings=new Map<number,Set<number>>();
    const overviewTopicRecordings=new Map<number,Set<number>>();
    const groups=new Map<number,Statement[]>();let interventions=0,unnamed=0;
    const target=q.profile?.kind==='speaker'?this.pi.get(q.profile.id):q.profile?.kind==='affiliation'?this.ai.get(q.profile.id):undefined;
    for(const s of d.statements){const [m,,p,a,,topics]=s;if(!valid[m]||(q.affiliation&&a!==aid))continue;
      // Keep topic choices stable while the selected topic filters the statements.
      if(q.profile?.kind==='country'&&this.countryCodes[a]===q.profile.id){for(const t of topics){if(!topicRecordings.has(t))topicRecordings.set(t,new Set());topicRecordings.get(t)!.add(m)}}
      for(const t of topics){if(!overviewTopicRecordings.has(t))overviewTopicRecordings.set(t,new Set());overviewTopicRecordings.get(t)!.add(m)}
      if(q.topic&&(tid===undefined||!topics.includes(tid)))continue;
      const month=monthLookup.get(d.meetings[m].date.slice(0,7));if(month)month.interventions++;
      interventions++;meetingIds.add(m);if(p<0)unnamed++;
      const code=this.countryCodes[a];if(code){let c=country.get(code);if(!c){c={name:iso.getName(code,'en')||d.affiliations[a].name,m:new Set(),n:0};country.set(code,c)}c.m.add(m);c.n++}
      if(p>=0){let x=person.get(p);if(!x){x={m:new Set(),n:0,latest:'',functions:new Set()};person.set(p,x)}x.m.add(m);x.n++;if(s[6].trim())x.functions.add(s[6].trim());if(d.meetings[m].date>x.latest)x.latest=d.meetings[m].date}
      if(q.profile&&((q.profile.kind==='country'&&code===q.profile.id)||(q.profile.kind==='speaker'&&p===target)||(q.profile.kind==='affiliation'&&a===target))){if(!groups.has(m))groups.set(m,[]);groups.get(m)!.push(s)}
    }
    // Recordings without statements remain part of the unfiltered archive overview.
    if(!q.affiliation&&!q.topic)valid.forEach((v,i)=>{if(v)meetingIds.add(i)});
    let durationSeconds=0,missingDurations=0;
    for(const m of meetingIds){const seconds=d.meetings[m].durationSeconds;if(seconds!=null&&Number.isFinite(seconds)&&seconds>=0)durationSeconds+=seconds;else missingDurations++}
    for(const m of meetingIds){const month=monthLookup.get(d.meetings[m].date.slice(0,7));if(month)month.meetings++}
    const categories=new Map<string,number>();meetingIds.forEach(m=>categories.set(d.meetings[m].category,(categories.get(d.meetings[m].category)||0)+1));
    const countries:CountryRow[]=[...country].map(([code,c])=>({code,name:c.name,meetings:c.m.size,interventions:c.n})).sort((a,b)=>b.meetings-a.meetings||a.name.localeCompare(b.name));
    const countryActivity=q.view==='countries'?countries.map(c=>{
      const recordings=[...country.get(c.code)!.m],counts=new Map<string,number>(),months=new Map<string,number>();
      for(const id of recordings){const m=d.meetings[id];counts.set(m.category,(counts.get(m.category)||0)+1);const key=m.date.slice(0,7);months.set(key,(months.get(key)||0)+1)}
      return {...c,recordings,categories:[...counts] as [string,number][],monthly:monthly.map(m=>months.get(m.month)||0)};
    }):[];
    const search=q.search.trim().toLocaleLowerCase();const people:PersonRow[]=[...person].filter(([p,x])=>!search||`${d.speakers[p].name} ${[...x.functions].join(' ')} ${d.affiliations[d.speakers[p].a].name}`.toLocaleLowerCase().includes(search)).map(([speaker,x])=>({speaker,functions:[...x.functions].sort((a,b)=>a.localeCompare(b)),meetings:x.m.size,interventions:x.n,latest:x.latest})).sort((a,b)=>{
      const column=q.speakerSort||'meetings',direction=q.speakerDirection||'desc';
      const value=(r:PersonRow)=>column==='name'?d.speakers[r.speaker].name:column==='function'?r.functions.join('; '):column==='affiliation'?d.affiliations[d.speakers[r.speaker].a].name:r[column];
      const av=value(a),bv=value(b);
      if(av===''&&bv!=='')return 1;if(bv===''&&av!=='')return -1;
      const order=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv));
      return order*(direction==='asc'?1:-1)||b.meetings-a.meetings||b.interventions-a.interventions||d.speakers[a.speaker].name.localeCompare(d.speakers[b.speaker].name)||a.speaker-b.speaker;
    });
    let profile:Result['profile']=null;
    if(q.profile){const sorted=[...groups].sort(([a],[b])=>d.meetings[b].date.localeCompare(d.meetings[a].date)||d.meetings[b].scheduled.localeCompare(d.meetings[a].scheduled)||d.meetings[a].id.localeCompare(d.meetings[b].id));
      const profileCategories=new Map<string,number>();
      for(const m of groups.keys()){const category=d.meetings[m].category;profileCategories.set(category,(profileCategories.get(category)||0)+1)}
      const name=q.profile.kind==='country'?(iso.getName(q.profile.id,'en')||q.profile.id):q.profile.kind==='speaker'?(d.speakers[target!]?.name||'Unknown speaker'):(d.affiliations[target!]?.name||'Unknown affiliation');
      const subtitle=q.profile.kind==='speaker'?(d.affiliations[d.speakers[target!]?.a]?.name||''):'All attributed interventions, including unnamed speakers';
      profile={name,subtitle,topics:[...topicRecordings].map(([t,ids])=>({...d.topics[t],meetings:ids.size})).sort((a,b)=>b.meetings-a.meetings||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).slice(0,10),categories:[...profileCategories].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),meetings:sorted.length,interventions:sorted.reduce((n,[,s])=>n+s.length,0),latest:sorted[0]?d.meetings[sorted[0][0]].date:'',groups:sorted.slice(q.page*20,q.page*20+20).map(([m,statements])=>({meeting:d.meetings[m],statements:[...statements].sort((a,b)=>a[4]-b[4]||a[1]-b[1])}))};
    }
    const topics=[...overviewTopicRecordings].map(([t,ids])=>({...d.topics[t],meetings:ids.size})).sort((a,b)=>b.meetings-a.meetings||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
    return {countryActivity,topics,durationSeconds,missingDurations,monthly,meetings:meetingIds.size,interventions,named:person.size,unnamed,countries,categories:[...categories].sort((a,b)=>b[1]-a[1]),persons:people.slice(q.page*25,q.page*25+25),personCount:people.length,profile,elapsed:performance.now()-start};
  }
}
