// source/index/interaction/interaction.engine.test.mjs — Version 1.2
import test from"node:test";
import assert from"node:assert/strict";
import{createLifeSystemInteraction}from"./interaction.engine.js";

test("component indexes remain immutable",()=>{
 const r=createLifeSystemInteraction(
  {value:82,constraints:[{factor:"liquidity",score:45,constraint:11}]},
  {value:61,constraints:[{factor:"recovery",score:35,constraint:16}]},
  {value:84,constraints:[{factor:"goals",score:44,constraint:17}]}
 );
 assert.deepEqual(r.inputs,{finance:82,health:61,development:84});
 assert.equal(r.guardrails.componentIndexesAreImmutable,true);
 assert.equal(r.guardrails.causalClaimsAllowed,false);
 assert.equal(r.strongestConstraint.domain,"Development");
 assert.equal(r.state,"structural_constraint");
});

test("large spread is a system-level signal",()=>{
 const r=createLifeSystemInteraction({value:92},{value:54},{value:86});
 assert.equal(r.state,"system_imbalance");
 assert.equal(r.spread,38);
 assert.ok(r.states.includes("system_imbalance"));
 assert.ok(r.states.includes("cross_domain_asymmetry"));
});

test("asymmetry below system threshold is still visible",()=>{
 const r=createLifeSystemInteraction({value:82},{value:70},{value:61});
 assert.equal(r.state,"cross_domain_asymmetry");
 assert.equal(r.spread,21);
});

test("incomplete indexes never invent a system state",()=>{
 const r=createLifeSystemInteraction({value:82},{value:null},{value:80});
 assert.equal(r.state,"insufficient");
 assert.equal(r.explanation,"Недостаточно данных для анализа всей системы.");
});