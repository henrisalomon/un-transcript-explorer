import {Engine} from './engine';
import type {Index,Manifest,Query} from './types';
let engine:Engine;
self.onmessage=async(e:MessageEvent<{type:string;id:number;query:Query}>)=>{
  try{
    if(e.data.type==='init'){
      const mr=await fetch('/data/manifest.json',{cache:'no-cache'});if(!mr.ok)throw Error('Could not load archive information.');const manifest:Manifest=await mr.json();
      const response=await fetch('/data/'+manifest.index);if(!response.ok)throw Error('Could not load the archive index.');const data:Index=await response.json();if(data.schema!==1)throw Error('Unsupported archive version.');engine=new Engine(data);
      self.postMessage({type:'ready',meta:{schema:data.schema,manifest,affiliations:data.affiliations,speakers:data.speakers,topics:data.topics,categories:[...new Set(data.meetings.map(m=>m.category))].sort()}});
    }else if(engine){self.postMessage({type:'result',id:e.data.id,result:engine.query(e.data.query)})}
  }catch(error){self.postMessage({type:'error',id:e.data.id,message:error instanceof Error?error.message:'Could not load data.'})}
};
