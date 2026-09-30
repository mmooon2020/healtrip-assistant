// Agent = LLM understanding + DETERMINISTIC triage policy + tool-grounded output.
import {extract} from "./nlu.js";
import {runTool} from "./tools.js";
const sessions=new Map();
const EMERGENCY_NO=process.env.EMERGENCY_NUMBER||"123";
const L=(lang,en,ar)=>lang==="ar"?ar:en;

function assertGrounded(cards,trace){ // anti-hallucination gate
 const seen=new Set(trace.flatMap(t=>t.resultIds));
 for(const c of cards)if(!seen.has(c.id))throw new Error("ungrounded provider "+c.id);
}
function call(trace,name,args){
 const res=runTool(name,args);
 trace.push({tool:name,args,resultIds:res.map(r=>r.id)});
 return res;
}
export async function chat(sid,text,lang){
 const s=sessions.get(sid)??{slots:{}};sessions.set(sid,s);
 const n=await extract(text),k=s.slots;
 for(const[a,b]of Object.entries(n))if(b!==undefined)k[a]=b;
 if(n.redFlags)delete k.noRedFlags;
 const trace=[],out={urgency:"info",questions:[],cards:[],trace,lang};

 if(!k.complaint){
  out.reply=L(lang,`This prototype covers chest pain only. If this is an emergency, call ${EMERGENCY_NO} now. Otherwise, describe your chest symptoms.`,
   `هذا النموذج يغطي ألم الصدر فقط. إذا كانت حالة طارئة اتصل بـ ${EMERGENCY_NO} فورًا. وإلا صف لي أعراض الصدر.`);
  return out;
 }
 if(k.redFlags){
  out.urgency="emergency";
  out.cards=call(trace,"search_providers",{type:"hospital",er:true,...(k.city&&{city:k.city})});
  out.reply=L(lang,`Chest pain with these warning signs can be serious. Call ${EMERGENCY_NO} or go to the nearest emergency room now. Don't drive yourself.`,
   `ألم الصدر مع هذه العلامات قد يكون خطيرًا. اتصل بـ ${EMERGENCY_NO} أو اذهب لأقرب طوارئ الآن، ولا تقُد السيارة بنفسك.`);
 }else if(!k.noRedFlags){
  out.questions=[L(lang,"Do you have shortness of breath, pain spreading to your arm/jaw, sweating, or fainting? Answer “none” if not.",
   "هل لديك ضيق تنفس، أو ألم يمتد للذراع/الفك، أو تعرق، أو إغماء؟ اكتب «لا» إن لم يكن.")];
  if(!k.duration)out.questions.push(L(lang,"How long has it lasted?","منذ متى بدأ الألم؟"));
  out.reply=L(lang,"To choose the right next step I need to check for warning signs first.","لأحدد الخطوة المناسبة أحتاج أولًا التأكد من علامات الخطر.");
 }else if(!k.duration){
  out.questions=[L(lang,"How long has the pain lasted, and does it come and go?","منذ متى الألم، وهل يأتي ويذهب؟")];
  out.reply=L(lang,"One more detail:","تفصيلة أخيرة:");
 }else{
  out.urgency="urgent";
  const a={type:"doctor",specialty:"cardiology",...(k.city&&{city:k.city})};
  out.cards=call(trace,"search_providers",a);
  if(k.wantsSecond)out.cards=[...out.cards,...call(trace,"search_providers",{...a,secondOpinion:true})].filter((c,i,arr)=>arr.findIndex(x=>x.id===c.id)===i);
  out.reply=out.cards.length
   ?L(lang,`No warning signs reported, but new chest pain should be evaluated within 24–48h by a cardiologist. If it worsens or any warning sign appears, go to the ER.`,
     `لا توجد علامات خطر مذكورة، لكن ألم الصدر الجديد يجب أن يقيّمه طبيب قلب خلال 24–48 ساعة. إن ازداد أو ظهرت علامة خطر فاذهب للطوارئ.`)
   :L(lang,"No matching cardiologist in our database. Please contact support or visit an ER if symptoms worsen.","لا يوجد طبيب مطابق في قاعدة بياناتنا. تواصل مع الدعم أو اذهب للطوارئ إن ساءت الأعراض.");
 }
 assertGrounded(out.cards,trace);
 return out;
}
