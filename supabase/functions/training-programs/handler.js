// supabase/functions/training-programs/handler.js — Version 1.0
// Responsibility: authenticated HTTP boundary for private training-program persistence.
import {createGetTrainingProgram} from "../../../source/application/training/get-training-program.js";
import {createSaveTrainingProgram} from "../../../source/application/training/save-training-program.js";
import {createSupabaseTrainingProgramRepository} from "../../../source/infrastructure/supabase/training-program.repository.js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,MAX_BODY_BYTES=262144;
function reply(status,body,origin,origins){const headers=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff","Vary":"Origin"});if(origin&&origins.has(origin)){headers.set("Access-Control-Allow-Origin",origin);headers.set("Access-Control-Allow-Methods","POST, OPTIONS");headers.set("Access-Control-Allow-Headers","authorization, apikey, content-type, x-client-info");headers.set("Access-Control-Max-Age","600");}return new Response(status===204?null:JSON.stringify(body),{status,headers});}
class InvalidRequest extends Error{}
function validate(body){if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(k=>!["action","program","expectedRevision"].includes(k)))throw new InvalidRequest();if(!["get","save"].includes(body.action))throw new InvalidRequest();if(body.action==="save"){if(!body.program||typeof body.program!=="object"||Array.isArray(body.program)||["id","userId","user_id","createdAt","updatedAt","revision"].some(k=>Object.hasOwn(body.program,k)))throw new InvalidRequest();if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)throw new InvalidRequest();}return body;}
function mapError(error){const code=String(error?.code||"");if(code==="TRAINING_PROGRAM_CONFLICT")return{status:409,code};if(code==="TRAINING_PROGRAM_NOT_FOUND")return{status:404,code};if(code==="TRAINING_PROGRAM_SCOPE_MISMATCH")return{status:403,code};if(code==="TRAINING_PAYLOAD_KEY_VERSION_UNAVAILABLE")return{status:503,code:"ENCRYPTION_KEY_UNAVAILABLE"};if(code==="TRAINING_PAYLOAD_DECRYPTION_FAILED")return{status:500,code:"PAYLOAD_INTEGRITY_FAILURE"};return{status:500,code:"INTERNAL_ERROR"};}
function createTrainingProgramsHandler({createUserClient,createRepositoryClient,encryption,allowedOrigins=[],repositoryFactory=createSupabaseTrainingProgramRepository,clock=()=>Date.now(),createId=()=>crypto.randomUUID(),logger=()=>{}}={}){
 if(typeof createUserClient!=="function"||typeof createRepositoryClient!=="function")throw new TypeError("Training program clients are required.");
 if(!encryption||typeof encryption.encryptPayload!=="function"||typeof encryption.decryptPayload!=="function")throw new TypeError("Training program encryption port is required.");
 const origins=new Set(allowedOrigins.map(v=>String(v).trim()).filter(Boolean));
 return async request=>{
  const origin=request.headers.get("origin");if(origin&&!origins.has(origin))return reply(403,{error:"ORIGIN_NOT_ALLOWED"},origin,origins);if(request.method==="OPTIONS")return reply(204,{},origin,origins);if(request.method!=="POST")return reply(405,{error:"METHOD_NOT_ALLOWED"},origin,origins);if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return reply(415,{error:"JSON_REQUIRED"},origin,origins);if(Number(request.headers.get("content-length")||0)>MAX_BODY_BYTES)return reply(413,{error:"REQUEST_TOO_LARGE"},origin,origins);
  const match=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get("authorization")||"");if(!match)return reply(401,{error:"UNAUTHENTICATED"},origin,origins);
  let body;try{const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return reply(413,{error:"REQUEST_TOO_LARGE"},origin,origins);body=validate(JSON.parse(raw));}catch(error){if(error instanceof InvalidRequest||error instanceof SyntaxError)return reply(400,{error:"INVALID_REQUEST"},origin,origins);return reply(400,{error:"INVALID_REQUEST"},origin,origins);}
  try{
   const authClient=createUserClient(request.headers.get("authorization"));const verified=await authClient.auth.getUser(match[1]);const user=verified?.data?.user;if(verified?.error||typeof user?.id!=="string"||!UUID.test(user.id))return reply(401,{error:"UNAUTHENTICATED"},origin,origins);
   const userContext=Object.freeze({userId:user.id.toLowerCase()}),client=createRepositoryClient(),repository=repositoryFactory({client,userContext,encryption});let data;
   if(body.action==="get"){data=await createGetTrainingProgram({repository}).execute({userContext});}
   else data=await createSaveTrainingProgram({repository,clock,createId}).execute({userContext,program:body.program,expectedRevision:body.expectedRevision});
   return reply(200,{data},origin,origins);
  }catch(error){const mapped=mapError(error);try{logger({code:mapped.code});}catch{}return reply(mapped.status,{error:mapped.code},origin,origins);}
 };
}
export {MAX_BODY_BYTES,createTrainingProgramsHandler};
