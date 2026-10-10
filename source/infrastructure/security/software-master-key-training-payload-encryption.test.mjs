// source/infrastructure/security/software-master-key-training-payload-encryption.test.mjs — Version 1.1
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createSoftwareMasterKeyTrainingPayloadEncryption } from "./software-master-key-training-payload-encryption.js";
const KEY=new Uint8Array(32).fill(19);
const context={userId:"33333333-3333-4333-8333-333333333333",sessionId:"11111111-1111-4111-8111-111111111111",sessionDate:"2026-10-10",status:"planned",revision:1};
function setup(overrides={}){return createSoftwareMasterKeyTrainingPayloadEncryption({masterKey:KEY,keyVersion:"dev-v1",cryptoApi:webcrypto,...overrides});}
test("encrypts private payload using unique salt and AES-256-GCM, then decrypts it",async()=>{
 const encryption=setup(),payload={activityType:"strength",intensity:"moderate",durationMinutes:42,notes:"private note",exercises:[{id:"barbell_bench_press",name:"Жим лёжа",sets:[]}]};
 const first=await encryption.encryptPayload(payload,context),second=await encryption.encryptPayload(payload,context);
 assert.equal(first.nonce.byteLength,12);assert.equal(first.tag.byteLength,16);assert.equal(first.keyEnvelope.byteLength,32);
 assert.notDeepEqual(first.nonce,second.nonce);assert.notDeepEqual(first.keyEnvelope,second.keyEnvelope);assert.deepEqual(await encryption.decryptPayload(first,context),payload);
});
test("rejects modified ciphertext and authenticated metadata",async()=>{
 const encryption=setup(),envelope=await encryption.encryptPayload({notes:"private"},context),changed={...envelope,tag:new Uint8Array(envelope.tag)};changed.tag[0]^=0xff;
 await assert.rejects(encryption.decryptPayload(changed,context),error=>error.code==="TRAINING_PAYLOAD_DECRYPTION_FAILED");
 await assert.rejects(encryption.decryptPayload(envelope,{...context,status:"completed"}),error=>error.code==="TRAINING_PAYLOAD_DECRYPTION_FAILED");
});
test("rejects unknown key versions and malformed master keys",async()=>{
 const encryption=setup(),envelope=await encryption.encryptPayload({notes:"private"},context);
 await assert.rejects(encryption.decryptPayload({...envelope,keyVersion:"unknown"},context),error=>error.code==="TRAINING_PAYLOAD_KEY_VERSION_UNAVAILABLE");
 assert.throws(()=>setup({masterKey:new Uint8Array(16)}),/master key must be exactly 32 bytes/);
 assert.throws(()=>setup({keyVersion:"bad version"}),/key version is invalid/);
});
