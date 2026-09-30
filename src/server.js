import http from "node:http";import {readFileSync} from "node:fs";
import {chat} from "./agent.js";
const page=readFileSync(new URL("../public/index.html",import.meta.url));
const hits=new Map();
const limited=ip=>{const now=Date.now(),h=(hits.get(ip)??[]).filter(t=>now-t<60000);h.push(now);hits.set(ip,h);return h.length>30;};
const sec={"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Content-Security-Policy":"default-src 'self' 'unsafe-inline'"};
const send=(res,c,b,t="application/json")=>{res.writeHead(c,{"Content-Type":t,...sec});res.end(t==="application/json"?JSON.stringify(b):b);};
export const server=http.createServer(async(req,res)=>{
 if(req.method==="GET"&&req.url==="/")return send(res,200,page,"text/html; charset=utf-8");
 if(req.method==="GET"&&req.url==="/health")return send(res,200,{ok:true});
 if(req.method==="POST"&&req.url==="/api/chat"){
  if(limited(req.socket.remoteAddress))return send(res,429,{error:"rate_limited"});
  let raw="";
  for await(const c of req){raw+=c;if(raw.length>10_000)return send(res,413,{error:"too_large"});}
  try{
   const {sessionId,message,lang}=JSON.parse(raw);
   if(typeof message!=="string"||!message.trim()||message.length>1000||typeof sessionId!=="string"||sessionId.length>64)
    return send(res,400,{error:"invalid_input"});
   const l=/[\u0600-\u06FF]/.test(message)?"ar":(lang==="ar"?"ar":"en");
   return send(res,200,await chat(sessionId,message.trim(),l)); // no message logging (PHI)
  }catch(e){console.error("chat_error",e.message);return send(res,500,{error:"internal",reply:"Something went wrong. If this is urgent call 123."});}
 }
 send(res,404,{error:"not_found"});
});
if(process.argv[1].endsWith("server.js"))server.listen(process.env.PORT||3000,()=>console.log("http://localhost:"+(process.env.PORT||3000)));
