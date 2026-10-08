// source/application/development/development.js — Version 1.1
import{calculateDevelopmentIndex}from"../../index/development/development.index.js";

const CATEGORIES=Object.freeze(["direction","goals","growth","execution","balance"]);
const LABELS=Object.freeze({direction:"Направление",goals:"Цели",growth:"Рост",execution:"Реализация",balance:"Устойчивость"});
const PERIOD_DAYS=28;
const PERIOD_MS=PERIOD_DAYS*24*60*60*1000;

function timestamp(value){const n=Number(value);return Number.isFinite(n)?n:null}

function latestWithinWindow(all={},now=Date.now()){
 const cutoff=now-PERIOD_MS;
 return Object.fromEntries(CATEGORIES.map(category=>{
  const facts=Array.isArray(all[category])?all[category]:[];
  const fact=facts.find(item=>{
   const at=timestamp(item?.recordedAt);
   return at!==null&&at>=cutoff&&at<=now;
  });
  return[category,fact?{...fact}:{}];
 }));
}

function buildDiagnosis(index){
 if(!index||index.value===null)return{status:"insufficient",primaryConstraint:null,message:"Недостаточно данных для полноценной оценки развития за последние 28 дней."};
 const p=index.constraints?.[0];
 if(!p)return{status:"stable",primaryConstraint:null,message:"Выраженного структурного ограничителя в системе развития не обнаружено."};
 const label=LABELS[p.factor]||p.factor;
 const severity=p.score<50?"critical":p.score<60?"weak":"attention";
 return{
  status:severity,
  primaryConstraint:{factor:p.factor,label,score:p.score,constraint:Number(p.constraint.toFixed(2))},
  message:"Главный ограничитель — "+label.toLowerCase()+". Текущая оценка фактора: "+Number(p.score).toFixed(1)+"/100."
 };
}

function createDevelopmentApplication({memory}={}){
 if(!memory)throw new Error("LifeGame Development: memory is required.");

 async function calculateFromMemory(now=Date.now()){
  const facts=await memory.listAllFacts();
  return calculate(latestWithinWindow(facts,now));
 }

 async function recordFact(category,fact){
  const key=String(category||"").trim();
  if(!CATEGORIES.includes(key))throw new Error("LifeGame Development: invalid category.");
  if(!fact||typeof fact!=="object"||Array.isArray(fact))throw new Error("LifeGame Development: fact is required.");
  const recordedAt=timestamp(fact.recordedAt)??Date.now();
  if(recordedAt>Date.now()+60000)throw new Error("LifeGame Development: recordedAt cannot be in the future.");
  return memory.saveFact(key,{...fact,recordedAt});
 }

 function calculate(input){
  const index=calculateDevelopmentIndex(input);
  return Object.freeze({
   index,
   diagnosis:buildDiagnosis(index),
   period:Object.freeze({days:PERIOD_DAYS,startedAt:Date.now()-PERIOD_MS})
  });
 }

 return Object.freeze({
  calculate,
  calculateFromMemory,
  recordFact,
  listFacts:memory.listFacts.bind(memory),
  listAllFacts:memory.listAllFacts.bind(memory)
 });
}

export{PERIOD_DAYS,createDevelopmentApplication,buildDiagnosis,latestWithinWindow};