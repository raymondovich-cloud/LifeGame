// source/infrastructure/supabase/training-program.repository.js — Version 1.0
// Responsibility: persist encrypted training programs through a server-only, owner-scoped Supabase client.
// SERVER-ONLY: never import into client bundles; requires verified user context and a dedicated encryption port.
import {createTrainingProgram} from "../../domain/training/training-program.js";
import {createTrainingProgramPersistenceResult} from "../../application/training/training-program-persistence-result.js";
const TABLE="training_programs";
const COLUMNS="id,user_id,start_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_key_envelope,payload_key_version,created_at,updated_at";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function toBytea(value,field){if(!(value instanceof Uint8Array)&&!(value instanceof ArrayBuffer))throw new TypeError("Training program repository: "+field+" must be bytes.");const b=value instanceof Uint8Array?value:new Uint8Array(value);if(!b.length)throw new TypeError("Training program repository: "+field+" cannot be empty.");return "\\x"+Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");}
function fromBytea(value,field){if(typeof value!=="string"||!/^\\x(?:[0-9a-f]{2})+$/i.test(value))throw new TypeError("Training program repository: invalid "+field+".");const hex=value.slice(2),out=new Uint8Array(hex.length/2);for(let i=0;i<hex.length;i+=2)out[i/2]=parseInt(hex.slice(i,i+2),16);return out;}
function revision(value){const n=typeof value==="string"?Number(value):value;if(!Number.isSafeInteger(n)||n<1)throw new TypeError("Training program repository: invalid revision.");return n;}
function timestamp(value,field){const n=new Date(value).getTime();if(!Number.isFinite(n))throw new TypeError("Training program repository: invalid "+field+".");return n;}
function createSupabaseTrainingProgramRepository({client,userContext,encryption}={}){
 if(!client||typeof client.from!=="function")throw new TypeError("Training program repository: server-only Supabase client required.");
 if(typeof userContext?.userId!=="string"||!UUID.test(userContext.userId))throw new TypeError("Training program repository: verified user context required.");
 if(!encryption||typeof encryption.encryptPayload!=="function"||typeof encryption.decryptPayload!=="function")throw new TypeError("Training program repository: dedicated encryption port required.");
 const owner=userContext.userId.toLowerCase();
 function assertOwner(userId){if(typeof userId!=="string"||userId.toLowerCase()!==owner){const e=new Error("Training program repository: owner scope mismatch.");e.code="TRAINING_PROGRAM_SCOPE_MISMATCH";throw e;}}
 function context(row,rev){return{userId:row.user_id,programId:row.id,startDate:row.start_date,status:row.status,revision:rev};}
 async function encrypted(program,rev){
  const env=await encryption.encryptPayload({name:program.name,totalWeeks:program.totalWeeks,workouts:program.workouts}, {userId:owner,programId:program.id,startDate:program.startDate,status:program.status,revision:rev});
  if(!env||typeof env.keyVersion!=="string"||!env.keyVersion.trim())throw new TypeError("Training program repository: encryption key version missing.");
  return{payload_ciphertext:toBytea(env.ciphertext,"ciphertext"),payload_nonce:toBytea(env.nonce,"nonce"),payload_tag:toBytea(env.tag,"tag"),payload_key_envelope:toBytea(env.keyEnvelope,"key envelope"),payload_key_version:env.keyVersion};
 }
 async function mapRow(row){
  if(!row||row.user_id!==owner||!UUID.test(row.id))throw new TypeError("Training program repository: row identity or owner mismatch.");
  const rev=revision(row.revision),payload=await encryption.decryptPayload({ciphertext:fromBytea(row.payload_ciphertext,"ciphertext"),nonce:fromBytea(row.payload_nonce,"nonce"),tag:fromBytea(row.payload_tag,"tag"),keyEnvelope:fromBytea(row.payload_key_envelope,"key envelope"),keyVersion:row.payload_key_version},context(row,rev));
  const program=createTrainingProgram({id:row.id,name:payload.name,startDate:row.start_date,totalWeeks:payload.totalWeeks,status:row.status,workouts:payload.workouts,createdAt:timestamp(row.created_at,"created_at"),updatedAt:timestamp(row.updated_at,"updated_at")});
  return createTrainingProgramPersistenceResult({program,revision:rev},row.id);
 }
 async function findForUser(userId){assertOwner(userId);const {data,error}=await client.from(TABLE).select(COLUMNS).eq("user_id",owner).maybeSingle();if(error)throw error;return data?mapRow(data):null;}
 async function insertForUser(userId,input){assertOwner(userId);const program=createTrainingProgram(input);const row={id:program.id,user_id:owner,start_date:program.startDate,status:program.status,revision:1,...await encrypted(program,1)};const {data,error}=await client.from(TABLE).insert(row).select(COLUMNS).maybeSingle();if(error)throw error;if(!data)throw new Error("Training program repository: insert returned no row.");return mapRow(data);}
 async function updateForUser(userId,input,expectedRevision){
  assertOwner(userId);const program=createTrainingProgram(input);const expected=revision(expectedRevision);
  if(program.id==null)throw new TypeError("Training program repository: program ID is required.");
  const fields={start_date:program.startDate,status:program.status,revision:expected+1,...await encrypted(program,expected+1)};
  const {data,error}=await client.from(TABLE).update(fields).eq("user_id",owner).eq("id",program.id).eq("revision",expected).select(COLUMNS).maybeSingle();
  if(error)throw error;if(!data)return null;return mapRow(data);
 }
 return Object.freeze({findForUser,insertForUser,updateForUser});
}
export {createSupabaseTrainingProgramRepository};
