// supabase/functions/training-sessions/handler.js — Version 1.0
// Responsibility: authenticated HTTP boundary for the private training-session API.
import { createSaveTrainingSession } from "../../../source/application/training/save-training-session.js";
import { createManageTrainingSession } from "../../../source/application/training/manage-training-session.js";
import { createSupabaseTrainingSessionRepository } from "../../../source/infrastructure/supabase/training-session.repository.js";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES=262144;
const ACTIONS=new Set(["get","create","start","complete","revise"]);
function reply(status,body,origin,origins){
 const headers=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff","Vary":"Origin"});
 if(origin&&origins.has(origin)){headers.set("Access-Control-Allow-Origin",origin);headers.set("Access-Control-Allow-Methods","POST, OPTIONS");headers.set("Access-Control-Allow-Headers","authorization, apikey, content-type, x-client-info");headers.set("Access-Control-Max-Age","600");}
 return new Response(status===204?null:JSON.stringify(body),{status,headers});
}
function mapError(error){
 const code=String(error?.code||"");
 if(code==="TRAINING_SESSION_NOT_FOUND")return{status:404,code};
 if(code==="TRAINING_SESSION_CONFLICT")return{status:409,code};
 if(code==="TRAINING_SESSION_SCOPE_MISMATCH")return{status:403,code};
 if(error instanceof TypeError||error instanceof SyntaxError)return{status:400,code:"INVALID_REQUEST"};
 if(code==="TRAINING_PAYLOAD_KEY_VERSION_UNAVAILABLE")return{status:503,code:"ENCRYPTION_KEY_UNAVAILABLE"};
 if(code==="TRAINING_PAYLOAD_DECRYPTION_FAILED")return{status:500,code:"PAYLOAD_INTEGRITY_FAILURE"};
 return{status:500,code:"INTERNAL_ERROR"};
}
function sessionId(value){if(typeof value!=="string"||!UUID.test(value.trim()))throw new TypeError("Invalid session id.");return value.trim().toLowerCase();}
function validate(body){
 if(!body||typeof body!=="object"||Array.isArray(body))throw new TypeError("JSON object required.");
 if(Object.keys(body).some(k=>!["action","sessionId","expectedRevision","session","changes"].includes(k)))throw new TypeError("Unknown field.");
 if(!ACTIONS.has(body.action))throw new TypeError("Unsupported action.");
 if(["get","start","complete","revise"].includes(body.action))sessionId(body.sessionId);
 if(["start","complete","revise"].includes(body.action)&&(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<1))throw new TypeError("Invalid revision.");
 if(body.action==="create"){
  if(!body.session||typeof body.session!=="object"||Array.isArray(body.session)||body.session.status!=="planned")throw new TypeError("A planned session is required.");
  if(["id","userId","user_id","createdAt","updatedAt","revision"].some(k=>Object.hasOwn(body.session,k)))throw new TypeError("Persistence metadata is server controlled.");
 }
 if(body.action==="revise"&&(!body.changes||typeof body.changes!=="object"||Array.isArray(body.changes)))throw new TypeError("Changes are required.");
 return body;
}
function output(value){return value==null?null:value.session&&Number.isSafeInteger(value.revision)?{session:value.session,revision:value.revision}:value;}
function createTrainingSessionsHandler({createUserClient,encryption,allowedOrigins=[],repositoryFactory=createSupabaseTrainingSessionRepository,clock=()=>Date.now(),createId=()=>crypto.randomUUID(),logger=()=>{}}={}){
 if(typeof createUserClient!=="function")throw new TypeError("createUserClient is required.");
 if(!encryption||typeof encryption.encryptPayload!=="function"||typeof encryption.decryptPayload!=="function")throw new TypeError("Encryption port is required.");
 const origins=new Set(allowedOrigins.map(v=>String(v).trim()).filter(Boolean));
 return async request=>{
  const origin=request.headers.get("origin");
  if(origin&&!origins.has(origin))return reply(403,{error:"ORIGIN_NOT_ALLOWED"},origin,origins);
  if(request.method==="OPTIONS")return reply(204,{},origin,origins);
  if(request.method!=="POST")return reply(405,{error:"METHOD_NOT_ALLOWED"},origin,origins);
  if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return reply(415,{error:"JSON_REQUIRED"},origin,origins);
  if(Number(request.headers.get("content-length")||0)>MAX_BODY_BYTES)return reply(413,{error:"REQUEST_TOO_LARGE"},origin,origins);
  const auth=request.headers.get("authorization")||"",match=/^Bearer\s+([^\s]+)$/i.exec(auth);
  if(!match)return reply(401,{error:"UNAUTHENTICATED"},origin,origins);
  try{
   const raw=await request.text();
   if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return reply(413,{error:"REQUEST_TOO_LARGE"},origin,origins);
   const body=validate(JSON.parse(raw));
   const client=createUserClient(auth);
   const verified=await client.auth.getUser(match[1]);
   const user=verified?.data?.user;
   if(verified?.error||typeof user?.id!=="string"||!UUID.test(user.id))return reply(401,{error:"UNAUTHENTICATED"},origin,origins);
   const userContext=Object.freeze({userId:user.id.toLowerCase()});
   const repository=repositoryFactory({client,userContext,encryption});
   let result;
   if(body.action==="get"){
    result=await repository.findForUser(userContext.userId,sessionId(body.sessionId));
    if(result==null)return reply(404,{error:"TRAINING_SESSION_NOT_FOUND"},origin,origins);
   }else if(body.action==="create"){
    result=await createSaveTrainingSession({repository,clock,createId}).execute({userContext,session:body.session});
   }else{
    const manager=createManageTrainingSession({repository,clock});
    const args={userContext,sessionId:sessionId(body.sessionId),expectedRevision:body.expectedRevision};
    if(body.action==="start")result=await manager.start(args);
    else if(body.action==="complete")result=await manager.complete(args);
    else result=await manager.revise({...args,changes:body.changes});
   }
   return reply(200,{data:output(result)},origin,origins);
  }catch(error){
   const mapped=mapError(error);
   try{logger({code:mapped.code});}catch{}
   return reply(mapped.status,{error:mapped.code},origin,origins);
  }
 };
}
export {MAX_BODY_BYTES,createTrainingSessionsHandler};
