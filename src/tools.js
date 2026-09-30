// Tool layer: the ONLY way the agent gets facts. Strict schema, allowlisted values.
import {providers} from "./db.js";
const SPEC=["cardiology","emergency","internal_medicine"],CITY=["Alexandria","Cairo","Giza"];
const schema={type:["doctor","hospital"],specialty:SPEC,city:CITY};
export const toolSpecs=[{name:"search_providers",description:"Search doctors/hospitals in the HealTrip DB",
 args:{type:"doctor|hospital",specialty:SPEC,city:CITY,er:"boolean",secondOpinion:"boolean",maxFee:"number"}}];
function validate(a){
 if(typeof a!=="object"||!a)throw new Error("args must be object");
 const ok=["type","specialty","city","er","secondOpinion","maxFee"];
 for(const k of Object.keys(a)){
  if(!ok.includes(k))throw new Error("unknown arg "+k);
  if(schema[k]&&!schema[k].includes(a[k]))throw new Error("bad value for "+k);
 }
 if(a.maxFee!==undefined&&!(a.maxFee>0&&a.maxFee<1e6))throw new Error("bad maxFee");
 return a;
}
const impl={search_providers(a){
 return providers.filter(p=>(!a.type||p.type===a.type)&&(!a.specialty||p.specialties.includes(a.specialty))
  &&(a.er===undefined||p.er===a.er)&&(!a.secondOpinion||p.secondOpinion)&&(!a.maxFee||p.fee===null||p.fee<=a.maxFee))
  .sort((x,y)=>(y.city===a.city)-(x.city===a.city)||y.rating-x.rating).slice(0,3);
}};
export function runTool(name,args){
 if(!impl[name])throw new Error("unknown tool "+name);
 return impl[name](validate(args));
}
