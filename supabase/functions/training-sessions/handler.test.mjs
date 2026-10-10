// supabase/functions/training-sessions/handler.test.mjs — Version 1.2
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingSessionsHandler, MAX_BODY_BYTES } from "./handler.js";

const USER="10000000-0000-4000-8000-000000000001";
const ID="20000000-0000-4000-8000-000000000001";
const encryption={async encryptPayload(v){return v;},async decryptPayload(v){return v;}};
const session={id:ID,date:"2026-10-10",activityType:"cardio",status:"planned",intensity:"moderate",durationMinutes:20,notes:"",exercises:[],createdAt:100,updatedAt:100};
function setup(repository={}){
 const calls=[];
 const client={auth:{async getUser(token){calls.push(["auth",token]);return{data:{user:{id:USER}},error:null};}}};
 const repositoryClient={from(){return{};}};
 const handler=createTrainingSessionsHandler({
  createUserClient(auth){calls.push(["client",auth]);return client;},
  createRepositoryClient(){calls.push(["repository-client"]);return repositoryClient;},encryption,allowedOrigins:["https://lifegame.site"],
  clock:()=>200,createId:()=>ID,
  repositoryFactory({client:c,userContext,encryption:e}){calls.push(["scope",userContext.userId,c===repositoryClient,c===client,e===encryption]);return repository;},
  logger({code}){calls.push(["log",code]);}
 });
 return{handler,calls};
}
function req(body,{method="POST",origin="https://lifegame.site",authorization="Bearer test-token",type="application/json"}={}){
 return new Request("https://example.test/functions/v1/training-sessions",{method,headers:{...(origin?{Origin:origin}:{}),...(authorization?{Authorization:authorization}:{}),"Content-Type":type},...(body===undefined?{}:{body:typeof body==="string"?body:JSON.stringify(body)})});
}
test("requires a bearer token before creating a client",async()=>{
 const{handler,calls}=setup();const res=await handler(req({action:"get",sessionId:ID},{authorization:""}));
 assert.equal(res.status,401);assert.deepEqual(calls,[]);
});
test("rejects unapproved origins",async()=>{
 const{handler,calls}=setup();const res=await handler(req({action:"get",sessionId:ID},{origin:"https://evil.example"}));
 assert.equal(res.status,403);assert.deepEqual(calls,[]);
});
test("restricts method and content type",async()=>{
 const{handler}=setup();assert.equal((await handler(req(undefined,{method:"GET"}))).status,405);
 assert.equal((await handler(req("{}",{type:"text/plain"}))).status,415);
});
test("answers CORS preflight without a response body",async()=>{
 const{handler}=setup();const res=await handler(req(undefined,{method:"OPTIONS"}));assert.equal(res.status,204);assert.equal(await res.text(),"");assert.equal(res.headers.get("Access-Control-Allow-Origin"),"https://lifegame.site");
});
test("caps request body size",async()=>{
 const{handler}=setup();assert.equal((await handler(req("x".repeat(MAX_BODY_BYTES+1)))).status,413);
});
test("verifies user and scopes read to the authenticated identity",async()=>{
 const{handler,calls}=setup({async findForUser(userId,id){assert.equal(userId,USER);assert.equal(id,ID);return{session,revision:1};}});
 const res=await handler(req({action:"get",sessionId:ID}));assert.equal(res.status,200);
 assert.deepEqual((await res.json()).data,{session,revision:1});
 assert.deepEqual(calls.slice(0,4),[["client","Bearer test-token"],["auth","test-token"],["repository-client"],["scope",USER,true,false,true]]);
});
test("creates only planned sessions with server-controlled identity and timestamps",async()=>{
 let saved;const{handler}=setup({async insertForUser(userId,input){saved={userId,input};return{session:{...input},revision:1};}});
 const res=await handler(req({action:"create",session:{date:session.date,activityType:"cardio",status:"planned",intensity:"moderate",durationMinutes:20,notes:"",exercises:[]}}));
 assert.equal(res.status,200);assert.equal(saved.userId,USER);assert.equal(saved.input.id,ID);assert.equal(saved.input.createdAt,200);assert.equal(saved.input.updatedAt,200);
 assert.equal((await handler(req({action:"create",session:{...session,status:"completed"}}))).status,400);
});
test("returns conflict for stale revision and hides internal error messages",async()=>{
 const{handler}=setup({async findForUser(){return{session,revision:1};},async updateForUser(){return null;}});
 const res=await handler(req({action:"start",sessionId:ID,expectedRevision:1}));
 assert.equal(res.status,409);assert.deepEqual(await res.json(),{error:"TRAINING_SESSION_CONFLICT"});
});
test("rejects malformed JSON as a client error",async()=>{
 const{handler}=setup();const res=await handler(req("{"));assert.equal(res.status,400);assert.deepEqual(await res.json(),{error:"INVALID_REQUEST"});
});
test("treats infrastructure TypeErrors as internal failures, not invalid requests",async()=>{
 const{handler}=setup({async findForUser(){throw new TypeError("KMS provider failure");}});const res=await handler(req({action:"get",sessionId:ID}));assert.equal(res.status,500);assert.deepEqual(await res.json(),{error:"INTERNAL_ERROR"});
});
test("does not expose internal exception messages",async()=>{
 const{handler}=setup({async findForUser(){throw new Error("private payload");}});
 const res=await handler(req({action:"get",sessionId:ID}));assert.equal(res.status,500);
 assert.deepEqual(await res.json(),{error:"INTERNAL_ERROR"});
});

test("does not create a privileged repository client before verifying the user",async()=>{
 const calls=[];
 const client={auth:{async getUser(){calls.push("auth");return{data:{user:null},error:new Error("invalid token")};}}};
 const handler=createTrainingSessionsHandler({
  createUserClient(){calls.push("user-client");return client;},
  createRepositoryClient(){calls.push("privileged-client");return{};},
  encryption,allowedOrigins:["https://lifegame.site"],logger(){}
 });
 const res=await handler(req({action:"get",sessionId:ID}));
 assert.equal(res.status,401);
 assert.deepEqual(calls,["user-client","auth"]);
});
