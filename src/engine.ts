import iso from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import type {Index,Query,Result,Statement,CountryRow,PersonRow} from './types';
iso.registerLocale(en);
export function countryCode(code:string){const upper=code.toUpperCase();return /^[A-Z]{3}$/.test(upper)&&iso.alpha3ToAlpha2(upper)?upper:''}
export class Engine{
  private ai:Map<string,number>;private pi:Map<string,number>;private ti:Map<string,number>;private countryCodes:string[];
  constructor(public data:Index){this.ai=new Map(data.affiliations.map((a,i)=>[a.id,i]));this.pi=new Map(data.speakers.map((p,i)=>[p.id,i]));this.ti=new Map(data.topics.map((t,i)=>[t.id,i]));this.countryCodes=data.affiliations.map(a=>countryCode(a.code))}
  query(q:Query):Result{
    const start=performance.now(),d=this.data;
    const aid=q.affiliation?this.ai.get(q.affiliation):undefined,tid=q.topic?this.ti.get(q.topic):undefined;
    const validFilter=(!q.affiliation||aid!==undefined)&&(!q.topic||tid!==undefined);
    const valid=d.meetings.map(m=>validFilter&&(!q.from||m.date>=q.from)&&(!q.to||m.date<=q.to)&&(!q.category||m.category===q.category));
    const meetingIds=new Set<number>(),country=new Map<string,{name:string;m:Set<number>;n:number}>(),person=new Map<number,{m:Set<number>;n:number;latest:string}>();
    const groups=new Map<number,Statement[]>();let interventions=0,unnamed=0;
    const target=q.profile?.kind==='speaker'?this.pi.get(q.profile.id):q.profile?.kind==='affiliation'?this.ai.get(q.profile.id):undefined;
    for(const s of d.statements){const [m,,p,a,,topics]=s;if(!valid[m]||(q.affiliation&&a!==aid)||(q.topic&&!topics.includes(tid!)))continue;
      interventions++;meetingIds.add(m);if(p<0)unnamed++;
      const code=this.countryCodes[a];if(code){let c=country.get(code);if(!c){c={name:iso.getName(code,'en')||d.affiliations[a].name,m:new Set(),n:0};country.set(code,c)}c.m.add(m);c.n++}
      if(p>=0){let x=person.get(p);if(!x){x={m:new Set(),n:0,latest:''};person.set(p,x)}x.m.add(m);x.n++;if(d.meetings[m].date>x.latest)x.latest=d.meetings[m].date}
      if(q.profile&&((q.profile.kind==='country'&&code===q.profile.id)||(q.profile.kind==='speaker'&&p===target)||(q.profile.kind==='affiliation'&&a===target))){if(!groups.has(m))groups.set(m,[]);groups.get(m)!.push(s)}
    }
    // Recordings without statements remain part of the unfiltered archive overview.
    if(!q.affiliation&&!q.topic)valid.forEach((v,i)=>{if(v)meetingIds.add(i)});
    const categories=new Map<string,number>();meetingIds.forEach(m=>categories.set(d.meetings[m].category,(categories.get(d.meetings[m].category)||0)+1));
    const countries:CountryRow[]=[...country].map(([code,c])=>({code,name:c.name,meetings:c.m.size,interventions:c.n})).sort((a,b)=>b.meetings-a.meetings||a.name.localeCompare(b.name));
    const search=q.search.trim().toLocaleLowerCase();const people:PersonRow[]=[...person].filter(([p])=>!search||`${d.speakers[p].name} ${d.affiliations[d.speakers[p].a].name}`.toLocaleLowerCase().includes(search)).map(([speaker,x])=>({speaker,meetings:x.m.size,interventions:x.n,latest:x.latest})).sort((a,b)=>b.meetings-a.meetings||b.interventions-a.interventions||d.speakers[a.speaker].name.localeCompare(d.speakers[b.speaker].name));
    let profile:Result['profile']=null;
    if(q.profile){const sorted=[...groups].sort(([a],[b])=>d.meetings[b].date.localeCompare(d.meetings[a].date)||d.meetings[b].scheduled.localeCompare(d.meetings[a].scheduled)||d.meetings[a].id.localeCompare(d.meetings[b].id));
      const profileCategories=new Map<string,number>();
      for(const m of groups.keys()){const category=d.meetings[m].category;profileCategories.set(category,(profileCategories.get(category)||0)+1)}
      const name=q.profile.kind==='country'?(iso.getName(q.profile.id,'en')||q.profile.id):q.profile.kind==='speaker'?(d.speakers[target!]?.name||'Unknown speaker'):(d.affiliations[target!]?.name||'Unknown affiliation');
      const subtitle=q.profile.kind==='speaker'?(d.affiliations[d.speakers[target!]?.a]?.name||''):'All attributed interventions, including unnamed speakers';
      profile={name,subtitle,categories:[...profileCategories].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),meetings:sorted.length,interventions:sorted.reduce((n,[,s])=>n+s.length,0),latest:sorted[0]?d.meetings[sorted[0][0]].date:'',groups:sorted.slice(q.page*20,q.page*20+20).map(([m,statements])=>({meeting:d.meetings[m],statements:[...statements].sort((a,b)=>a[4]-b[4]||a[1]-b[1])}))};
    }
    return {meetings:meetingIds.size,interventions,named:person.size,unnamed,countries,categories:[...categories].sort((a,b)=>b[1]-a[1]),persons:people.slice(q.page*25,q.page*25+25),personCount:people.length,profile,elapsed:performance.now()-start};
  }
}
