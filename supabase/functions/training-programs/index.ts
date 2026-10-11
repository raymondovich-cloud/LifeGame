// supabase/functions/training-programs/index.ts — Version 1.0
// Responsibility: compose Supabase Auth, server-only DB client and isolated TrainingProgram encryption.
// DEVELOPMENT/STAGING ONLY: HKDF master-key derivation is not a managed KMS. Replace with the approved KMS adapter before production.
import {createClient} from "npm:@supabase/supabase-js@2.117.1";
import {createTrainingProgramPayloadEncryption} from "../../../source/infrastructure/security/training-program-payload-encryption.js";
import {createTrainingProgramsHandler} from "./handler.js";
function env(name:string):string{const value=Deno.env.get(name)?.trim();if(!value)throw new Error("Missing required server configuration: "+name);return value;}
const supabaseUrl=env("SUPABASE_URL"),supabaseAnonKey=env("SUPABASE_ANON_KEY"),serviceRole=env("SUPABASE_SERVICE_ROLE_KEY");
const activeKeyVersion=env("TRAINING_PROGRAM_ENCRYPTION_KEY_VERSION"),allowedOrigins=env("TRAINING_ALLOWED_ORIGINS").split(",").map(v=>v.trim()).filter(Boolean);
const encodedKey=env("TRAINING_PROGRAM_ENCRYPTION_MASTER_KEY");let masterKey:Uint8Array;
try{if(!/^[A-Za-z0-9+/]{43}=$/.test(encodedKey))throw new Error();const decoded=atob(encodedKey);masterKey=Uint8Array.from(decoded,c=>c.charCodeAt(0));if(masterKey.length!==32)throw new Error();}catch{throw new Error("TRAINING_PROGRAM_ENCRYPTION_MASTER_KEY must be base64-encoded 32-byte key material.");}
const rootKeyPromise=crypto.subtle.importKey("raw",masterKey,{name:"HKDF"},false,["deriveKey"]);
const cryptoPort={async generateDataKey({keyId,keySpec,encryptionContext}:{keyId:string,keySpec:string,encryptionContext:Record<string,string>}){if(keySpec!=="AES_256"||keyId!==activeKeyVersion)throw new Error("Unsupported development key configuration.");const salt=crypto.getRandomValues(new Uint8Array(32));const key=await rootKeyPromise;const info=new TextEncoder().encode(JSON.stringify(encryptionContext));const dataKey=await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt,info},key,256);return{plaintextKey:new Uint8Array(dataKey),encryptedDataKey:salt};},async decryptDataKey({keyId,encryptedDataKey,encryptionContext}:{keyId:string,encryptedDataKey:Uint8Array,encryptionContext:Record<string,string>}){if(keyId!==activeKeyVersion)throw new Error("Unknown development key version.");const key=await rootKeyPromise;const info=new TextEncoder().encode(JSON.stringify(encryptionContext));const dataKey=await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:encryptedDataKey,info},key,256);return{plaintextKey:new Uint8Array(dataKey)};}};
const encryption=createTrainingProgramPayloadEncryption({kms:cryptoPort,keys:{[activeKeyVersion]:activeKeyVersion},activeKeyVersion});masterKey.fill(0);
Deno.serve(createTrainingProgramsHandler({
 createUserClient(authorization:string){return createClient(supabaseUrl,supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:authorization}}});},
 createRepositoryClient(){return createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});},
 encryption,allowedOrigins,logger({code}:{code:string}){console.error(JSON.stringify({event:"training_programs_request_failed",code}));}
}));
