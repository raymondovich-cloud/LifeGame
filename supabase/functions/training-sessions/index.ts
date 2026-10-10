// supabase/functions/training-sessions/index.ts — Version 1.2
// Responsibility: compose Supabase Auth, the server-only Supabase database client, AWS KMS, and the Training Sessions HTTP handler.
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { createSoftwareMasterKeyTrainingPayloadEncryption } from "../../../source/infrastructure/security/software-master-key-training-payload-encryption.js";
import { createTrainingSessionsHandler } from "./handler.js";

function env(name:string):string { const value=Deno.env.get(name)?.trim(); if(!value)throw new Error("Missing required server configuration: "+name); return value; }
const supabaseUrl=env("SUPABASE_URL");
const supabaseAnonKey=env("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey=env("SUPABASE_SERVICE_ROLE_KEY");
const encodedMasterKey=env("TRAINING_ENCRYPTION_MASTER_KEY");
const activeKeyVersion=env("TRAINING_ENCRYPTION_KEY_VERSION");
const allowedOrigins=env("TRAINING_ALLOWED_ORIGINS").split(",").map(v=>v.trim()).filter(Boolean);
let masterKey:Uint8Array;
try{
 if(!/^[A-Za-z0-9+/]{43}=$/.test(encodedMasterKey))throw new Error("invalid base64");
 const decoded=atob(encodedMasterKey);masterKey=Uint8Array.from(decoded,char=>char.charCodeAt(0));
 if(masterKey.byteLength!==32)throw new Error("invalid length");
}catch{throw new Error("TRAINING_ENCRYPTION_MASTER_KEY must be base64-encoded 32-byte key material.");}
const encryption=createSoftwareMasterKeyTrainingPayloadEncryption({masterKey,keyVersion:activeKeyVersion});
masterKey.fill(0);
Deno.serve(createTrainingSessionsHandler({
 createUserClient(authorization:string){
  return createClient(supabaseUrl,supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authorization}}});
 },
 createRepositoryClient(){
  // Server-only elevated key; never expose this client or key to browser/Telegram/iOS code.
  return createClient(supabaseUrl,supabaseServiceRoleKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 },
 encryption,allowedOrigins,
 logger({code}:{code:string}){console.error(JSON.stringify({event:"training_sessions_request_failed",code}));}
}));
