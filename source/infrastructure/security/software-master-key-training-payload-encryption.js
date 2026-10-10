// source/infrastructure/security/software-master-key-training-payload-encryption.js — Version 1.1
// Responsibility: free-tier development encryption using Web Crypto HKDF + AES-256-GCM.
// SERVER-ONLY. DEVELOPMENT/STAGING ONLY: master-key storage and rotation are not KMS-equivalent.
// Before production, replace this provider with an approved managed-key envelope-encryption provider.
const NONCE_BYTES=12,TAG_BYTES=16,SALT_BYTES=32,KEY_BYTES=32,SCHEMA_VERSION="1";
function asBytes(value,field){if(value instanceof Uint8Array)return new Uint8Array(value);if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));throw new TypeError("Training payload encryption: "+field+" must be bytes.");}
function validateContext(context){
 if(!context||typeof context!=="object")throw new TypeError("Training payload encryption: context is required.");
 const {userId,sessionId,sessionDate,status,revision}=context;
 if(typeof userId!=="string"||!userId.trim())throw new TypeError("Training payload encryption: userId is required.");
 if(typeof sessionId!=="string"||!sessionId.trim())throw new TypeError("Training payload encryption: sessionId is required.");
 if(typeof sessionDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate))throw new TypeError("Training payload encryption: sessionDate must be ISO YYYY-MM-DD.");
 if(!["planned","in_progress","completed"].includes(status))throw new TypeError("Training payload encryption: status is invalid.");
 if(!Number.isSafeInteger(revision)||revision<1)throw new TypeError("Training payload encryption: revision must be a positive safe integer.");
 return Object.freeze({userId:userId.trim().toLowerCase(),sessionId:sessionId.trim().toLowerCase(),sessionDate,status,revision});
}
function contextData(context){const c=validateContext(context);return new TextEncoder().encode(JSON.stringify({app:"LifeGame",purpose:"training-session",schemaVersion:SCHEMA_VERSION,userId:c.userId,sessionId:c.sessionId,sessionDate:c.sessionDate,status:c.status,revision:c.revision}));}
function createSoftwareMasterKeyTrainingPayloadEncryption({masterKey,keyVersion,cryptoApi=globalThis.crypto}={}){
 if(!cryptoApi?.subtle||typeof cryptoApi.getRandomValues!=="function")throw new TypeError("Training payload encryption: Web Crypto API is required.");
 const rootBytes=asBytes(masterKey,"master key");
 if(rootBytes.byteLength!==KEY_BYTES){rootBytes.fill(0);throw new TypeError("Training payload encryption: master key must be exactly 32 bytes.");}
 if(typeof keyVersion!=="string"||!/^[a-zA-Z0-9._-]{1,80}$/.test(keyVersion)){rootBytes.fill(0);throw new TypeError("Training payload encryption: key version is invalid.");}
 const rootKeyPromise=cryptoApi.subtle.importKey("raw",rootBytes,{name:"HKDF"},false,["deriveKey"]);rootBytes.fill(0);
 async function derive(salt,info,usage){return cryptoApi.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt,info},await rootKeyPromise,{name:"AES-GCM",length:256},false,[usage]);}
 async function encryptPayload(payload,context){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new TypeError("Training payload encryption: payload must be an object.");
  const additionalData=contextData(context),keyEnvelope=cryptoApi.getRandomValues(new Uint8Array(SALT_BYTES)),nonce=cryptoApi.getRandomValues(new Uint8Array(NONCE_BYTES));let plaintext,sealed;
  try{const key=await derive(keyEnvelope,additionalData,"encrypt");plaintext=new TextEncoder().encode(JSON.stringify(payload));sealed=new Uint8Array(await cryptoApi.subtle.encrypt({name:"AES-GCM",iv:nonce,additionalData,tagLength:TAG_BYTES*8},key,plaintext));return Object.freeze({ciphertext:sealed.slice(0,-TAG_BYTES),nonce,tag:sealed.slice(-TAG_BYTES),keyEnvelope,keyVersion});}
  finally{plaintext?.fill(0);sealed?.fill(0);additionalData.fill(0);}
 }
 async function decryptPayload(envelope,context){
  if(!envelope||typeof envelope!=="object"||Array.isArray(envelope))throw new TypeError("Training payload encryption: envelope is required.");
  if(envelope.keyVersion!==keyVersion){const error=new Error("Training payload encryption: stored key version is not configured.");error.code="TRAINING_PAYLOAD_KEY_VERSION_UNAVAILABLE";throw error;}
  const nonce=asBytes(envelope.nonce,"nonce"),tag=asBytes(envelope.tag,"authentication tag"),ciphertext=asBytes(envelope.ciphertext,"ciphertext"),keyEnvelope=asBytes(envelope.keyEnvelope,"key envelope");
  if(nonce.byteLength!==NONCE_BYTES||tag.byteLength!==TAG_BYTES||ciphertext.byteLength===0||keyEnvelope.byteLength!==SALT_BYTES)throw new TypeError("Training payload encryption: encrypted envelope is malformed.");
  const additionalData=contextData(context),sealed=new Uint8Array(ciphertext.byteLength+tag.byteLength);sealed.set(ciphertext);sealed.set(tag,ciphertext.byteLength);let plaintext;
  try{const key=await derive(keyEnvelope,additionalData,"decrypt");plaintext=new Uint8Array(await cryptoApi.subtle.decrypt({name:"AES-GCM",iv:nonce,additionalData,tagLength:TAG_BYTES*8},key,sealed));const parsed=JSON.parse(new TextDecoder().decode(plaintext));if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("invalid payload shape");return parsed;}
  catch{const error=new Error("Training payload encryption: payload authentication or decoding failed.");error.code="TRAINING_PAYLOAD_DECRYPTION_FAILED";throw error;}
  finally{additionalData.fill(0);sealed.fill(0);plaintext?.fill(0);nonce.fill(0);tag.fill(0);ciphertext.fill(0);keyEnvelope.fill(0);}
 }
 return Object.freeze({encryptPayload,decryptPayload});
}
export {createSoftwareMasterKeyTrainingPayloadEncryption};
