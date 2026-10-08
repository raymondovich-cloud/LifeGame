// source/index/development/development.factors.js — Version 1.0
const FACTOR_WEIGHTS=Object.freeze({direction:.20,goals:.30,growth:.25,execution:.15,balance:.10});
const METRIC_WEIGHTS=Object.freeze({
direction:Object.freeze({clarity:.45,priority:.30,review:.25}),
goals:Object.freeze({quality:.20,progress:.40,deadlineHealth:.20,prioritization:.20}),
growth:Object.freeze({learningConsistency:.25,skillProgress:.30,application:.30,reflection:.15}),
execution:Object.freeze({actionConsistency:.40,plannedVsCompleted:.30,momentum:.30}),
balance:Object.freeze({goalLoad:.40,focusConcentration:.30,paceStability:.30})
});
function metric(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null}
function weightedFactor(values={},weights){const a=Object.entries(weights).map(([key,weight])=>({key,weight,value:metric(values?.[key])})).filter(x=>x.value!==null);if(!a.length)return{score:null,coverage:0,metrics:{}};const w=a.reduce((s,x)=>s+x.weight,0);return{score:Number((a.reduce((s,x)=>s+x.value*x.weight,0)/w).toFixed(2)),coverage:w,metrics:Object.fromEntries(a.map(x=>[x.key,x.value]))}}
function calculateDevelopmentFactors(input={}){return{direction:weightedFactor(input.direction,METRIC_WEIGHTS.direction),goals:weightedFactor(input.goals,METRIC_WEIGHTS.goals),growth:weightedFactor(input.growth,METRIC_WEIGHTS.growth),execution:weightedFactor(input.execution,METRIC_WEIGHTS.execution),balance:weightedFactor(input.balance,METRIC_WEIGHTS.balance)}}
export{FACTOR_WEIGHTS,METRIC_WEIGHTS,calculateDevelopmentFactors};