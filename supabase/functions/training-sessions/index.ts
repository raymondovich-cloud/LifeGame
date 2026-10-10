// supabase/functions/training-sessions/index.ts — Version 1.0
// Responsibility: compose Supabase Auth, AWS KMS, and the Training Sessions HTTP handler.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from "npm:@aws-sdk/client-kms@3.850.0";
import { createAwsKmsTrainingPayloadEncryption } from "../../../source/infrastructure/security/aws-kms-training-payload-encryption.js";
import { createTrainingSessionsHandler } from "./handler.js";

function env(name:string):string { const value=Deno.env.get(name)?.trim(); if(!value)throw new Error("Missing required server configuration: "+name); return value; }
const supabaseUrl=env("SUPABASE_URL");
const supabaseAnonKey=env("SUPABASE_ANON_KEY");
const region=env("AWS_REGION");
const accessKeyId=env("AWS_ACCESS_KEY_ID");
const secretAccessKey=env("AWS_SECRET_ACCESS_KEY");
const activeKeyVersion=env("TRAINING_KMS_ACTIVE_KEY_VERSION");
const keyMapText=env("TRAINING_KMS_KEY_MAP_JSON");
const allowedOrigins=env("TRAINING_ALLOWED_ORIGINS").split(",").map(v=>v.trim()).filter(Boolean);
let keys:Record<string,string>;
try{keys=JSON.parse(keyMapText);}catch{throw new Error("TRAINING_KMS_KEY_MAP_JSON must be valid JSON.");}
if(!keys||typeof keys!=="object"||Array.isArray(keys)||!Object.keys(keys).length)throw new Error("KMS key map must be a non-empty object.");
for(const [version,arn] of Object.entries(keys)){
 if(!/^[a-zA-Z0-9._-]{1,80}$/.test(version)||typeof arn!=="string"||!/^arn:aws:kms:[a-z0-9-]+:\d{12}:key\/[a-f0-9-]+$/i.test(arn))throw new Error("KMS key map contains an invalid entry.");
}
if(!Object.hasOwn(keys,activeKeyVersion))throw new Error("Active KMS key version is not configured.");
const kms=new KMSClient({region,credentials:{accessKeyId,secretAccessKey,...(Deno.env.get("AWS_SESSION_TOKEN")?{sessionToken:Deno.env.get("AWS_SESSION_TOKEN")}: {})}});
const encryption=createAwsKmsTrainingPayloadEncryption({
 kms:{
  async generateDataKey({keyId,keySpec,encryptionContext}){
   const result=await kms.send(new GenerateDataKeyCommand({KeyId:keyId,KeySpec:keySpec,EncryptionContext:encryptionContext}));
   return{plaintextKey:result.Plaintext,encryptedDataKey:result.CiphertextBlob};
  },
  async decryptDataKey({keyId,encryptedDataKey,encryptionContext}){
   const result=await kms.send(new DecryptCommand({KeyId:keyId,CiphertextBlob:encryptedDataKey,EncryptionContext:encryptionContext}));
   return{plaintextKey:result.Plaintext};
  }
 },
 keys,activeKeyVersion
});
Deno.serve(createTrainingSessionsHandler({
 createUserClient(authorization:string){
  return createClient(supabaseUrl,supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authorization}}});
 },
 encryption,allowedOrigins,
 logger({code}:{code:string}){console.error(JSON.stringify({event:"training_sessions_request_failed",code}));}
}));
