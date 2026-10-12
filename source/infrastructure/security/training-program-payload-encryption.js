// source/infrastructure/security/training-program-payload-encryption.js — Version 1.0
// Responsibility: KMS-backed AES-256-GCM envelope encryption for private TrainingProgram payloads.
// SERVER-ONLY. Never import into browser, Telegram WebApp, or iOS client bundles.
const NONCE_BYTES=12,TAG_BYTES=16,KEY_BYTES=32,SCHEMA_VERSION="1";
function bytes(value,field){if(value instanceof Uint8Array)return new Uint8Array(value);if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));throw new TypeError("Training program encryption: "+field+" must be bytes.");}
function contextParts(context){
 if(!context||typeof context!=="object")throw new TypeError("Training program encryption: context is required.");
 const {userId,programId,startDate,status,revision}=context;
 if(typeof userId!=="string"||!userId.trim()||typeof programId!=="string"||!programId.trim())throw new TypeError("Training program encryption: owner and program identity are required.");
 if(typeof startDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(startDate))throw new TypeError("Training program encryption: startDate must be ISO YYYY-MM-DD.");
 if(!["active","paused","completed"].includes(status)||!Number.isSafeInteger(revision)||revision<1)throw new TypeError("Training program encryption: status or revision is invalid.");
 const normalized={userId:userId.trim().toLowerCase(),programId:programId.trim().toLowerCase(),startDate,status,revision};
 const data={app:"LifeGame",purpose:"training-program",schemaVersion:SCHEMA_VERSION,...normalized};
 return {additionalData:new TextEncoder().encode(JSON.stringify(data)),kmsEncryptionContext:Object.freeze({app:"LifeGame",purpose:"training-program",schema_version:SCHEMA_VERSION,user_id:normalized.userId,program_id:normalized.programId,start_date:normalized.startDate,status:normalized.status,revision:String(normalized.revision)})};
}
function createTrainingProgramPayloadEncryption({kms,keys,activeKeyVersion,cryptoApi=globalThis.crypto}={}){
 if(!kms||typeof kms.generateDataKey!=="function"||typeof kms.decryptDataKey!=="function")throw new TypeError("Training program encryption: KMS port is required.");
 if(!keys||typeof keys!=="object"||Array.isArray(keys)||!Object.keys(keys).length||typeof activeKeyVersion!=="string"||!Object.hasOwn(keys,activeKeyVersion)||typeof keys[activeKeyVersion]!=="string"||!keys[activeKeyVersion].trim())throw new TypeError("Training program encryption: active KMS key version is invalid.");
 if(!cryptoApi?.subtle||typeof cryptoApi.getRandomValues!=="function")throw new TypeError("Training program encryption: Web Crypto API is required.");
 async function encryptPayload(payload,context){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new TypeError("Training program encryption: payload must be an object.");
  const {additionalData,kmsEncryptionContext}=contextParts(context),version=activeKeyVersion;
  const generated=await kms.generateDataKey({keyId:keys[version],keySpec:"AES_256",encryptionContext:kmsEncryptionContext});
  const original=generated?.plaintextKey,key=bytes(original,"plaintext data key"),wrapped=bytes(generated?.encryptedDataKey,"encrypted data key");
  if(key.length!==KEY_BYTES||!wrapped.length){key.fill(0);if(original instanceof Uint8Array)original.fill(0);throw new Error("Training program encryption: KMS returned invalid key material.");}
  let plaintext,sealed;
  try{
   const nonce=cryptoApi.getRandomValues(new Uint8Array(NONCE_BYTES)),cryptoKey=await cryptoApi.subtle.importKey("raw",key,{name:"AES-GCM"},false,["encrypt"]);
   plaintext=new TextEncoder().encode(JSON.stringify(payload));
   sealed=new Uint8Array(await cryptoApi.subtle.encrypt({name:"AES-GCM",iv:nonce,additionalData,tagLength:TAG_BYTES*8},cryptoKey,plaintext));
   return Object.freeze({ciphertext:sealed.slice(0,-TAG_BYTES),nonce,tag:sealed.slice(-TAG_BYTES),keyEnvelope:wrapped,keyVersion:version});
  }finally{additionalData.fill(0);plaintext?.fill(0);sealed?.fill(0);key.fill(0);if(original instanceof Uint8Array)original.fill(0);}
 }
 async function decryptPayload(envelope,context){
  if(!envelope||typeof envelope!=="object"||Array.isArray(envelope))throw new TypeError("Training program encryption: envelope is required.");
  const version=envelope.keyVersion,keyArn=keys[version];
  if(typeof keyArn!=="string"||!keyArn){const e=new Error("Training program encryption: stored key version unavailable.");e.code="TRAINING_PAYLOAD_KEY_VERSION_UNAVAILABLE";throw e;}
  const nonce=bytes(envelope.nonce,"nonce"),tag=bytes(envelope.tag,"tag"),ciphertext=bytes(envelope.ciphertext,"ciphertext"),wrapped=bytes(envelope.keyEnvelope,"key envelope");
  if(nonce.length!==NONCE_BYTES||tag.length!==TAG_BYTES||!ciphertext.length||!wrapped.length)throw new TypeError("Training program encryption: malformed encrypted envelope.");
  const {additionalData,kmsEncryptionContext}=contextParts(context),decrypted=await kms.decryptDataKey({keyId:keyArn,encryptedDataKey:wrapped,encryptionContext:kmsEncryptionContext});
  const original=decrypted?.plaintextKey,key=bytes(original,"decrypted data key");
  if(key.length!==KEY_BYTES){key.fill(0);if(original instanceof Uint8Array)original.fill(0);throw new Error("Training program encryption: KMS returned invalid key material.");}
  const sealed=new Uint8Array(ciphertext.length+tag.length);sealed.set(ciphertext);sealed.set(tag,ciphertext.length);let plaintext;
  try{
   const cryptoKey=await cryptoApi.subtle.importKey("raw",key,{name:"AES-GCM"},false,["decrypt"]);
   plaintext=new Uint8Array(await cryptoApi.subtle.decrypt({name:"AES-GCM",iv:nonce,additionalData,tagLength:TAG_BYTES*8},cryptoKey,sealed));
   const parsed=JSON.parse(new TextDecoder().decode(plaintext));if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("invalid payload");
   return parsed;
  }catch{const e=new Error("Training program encryption: authentication or decoding failed.");e.code="TRAINING_PAYLOAD_DECRYPTION_FAILED";throw e;}
  finally{additionalData.fill(0);sealed.fill(0);plaintext?.fill(0);key.fill(0);if(original instanceof Uint8Array)original.fill(0);nonce.fill(0);tag.fill(0);ciphertext.fill(0);wrapped.fill(0);}
 }
 return Object.freeze({encryptPayload,decryptPayload});
}
export {createTrainingProgramPayloadEncryption};
