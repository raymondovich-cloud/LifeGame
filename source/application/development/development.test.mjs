// source/application/development/development.test.mjs — Version 1.0
import test from"node:test";
import assert from"node:assert/strict";
import{createDevelopmentApplication,latestWithinWindow}from"./development.js";

test("development uses the newest fact inside the 28-day window",()=>{
 const now=Date.now();
 const result=latestWithinWindow({
  direction:[
   {recordedAt:now-2*24*60*60*1000,clarity:80},
   {recordedAt:now-35*24*60*60*1000,clarity:20}
  ]
 },now);
 assert.equal(result.direction.clarity,80);
});

test("development excludes future facts",()=>{
 const now=Date.now();
 const result=latestWithinWindow({
  direction:[{recordedAt:now+24*60*60*1000,clarity:99}]
 },now);
 assert.deepEqual(result.direction,{});
});

test("application records and calculates from scoped memory",async()=>{
 const saved=[];
 const memory={
  async listAllFacts(){return{direction:[{recordedAt:Date.now(),clarity:90,priority:90,review:90}]}},
  async listFacts(){return[]},
  async saveFact(category,fact){saved.push({category,fact});return fact}
 };
 const app=createDevelopmentApplication({memory});
 const result=await app.calculateFromMemory();
 assert.equal(result.index.value,90);
 await app.recordFact("goals",{progress:70});
 assert.equal(saved[0].category,"goals");
 assert.equal(saved[0].fact.progress,70);
});