// source/index/interaction/interaction.engine.js — Version 1.1
const THRESHOLD=20;
const CONSTRAINT_SCORE_THRESHOLD=50;

function numeric(value){
 const n=Number(value);
 return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
}

function pair(a,b,names){
 const x=numeric(a),y=numeric(b);
 if(x===null||y===null)return{pair:names,state:"insufficient",difference:null,message:"Недостаточно данных для сравнения."};
 const difference=Math.abs(x-y);
 if(difference<THRESHOLD)return{pair:names,state:"aligned",difference:Number(difference.toFixed(1)),message:"Показатели находятся в согласованном диапазоне."};
 const firstIsHigher=x>y;
 return{
  pair:names,
  state:firstIsHigher?"asymmetric_high_first":"asymmetric_high_second",
  difference:Number(difference.toFixed(1)),
  message:(firstIsHigher?names[0]:names[1])+" выше "+(firstIsHigher?names[1]:names[0])+" на "+Number(difference.toFixed(1))+" пунктов. Это сигнал для анализа, а не доказательство причинности."
 };
}

function constraint(index,domain){
 const item=index?.constraints?.[0];
 return item?{domain,factor:item.factor,score:Number(item.score),constraint:Number(item.constraint)}:null;
}

function createLifeSystemInteraction(financeIndex,healthIndex,developmentIndex){
 const values={finance:numeric(financeIndex?.value),health:numeric(healthIndex?.value),development:numeric(developmentIndex?.value)};
 const pairs=[
  pair(values.finance,values.development,["Finance","Development"]),
  pair(values.finance,values.health,["Finance","Health"]),
  pair(values.development,values.health,["Development","Health"])
 ];
 const constraints=[
  constraint(financeIndex,"Finance"),
  constraint(healthIndex,"Health"),
  constraint(developmentIndex,"Development")
 ].filter(Boolean).sort((a,b)=>b.constraint-a.constraint);
 const available=Object.values(values).filter(value=>value!==null);
 const spread=available.length>1?Math.max(...available)-Math.min(...available):null;
 const complete=available.length===3;
 const hasAsymmetry=pairs.some(item=>item.state.startsWith("asymmetric"));
 const strongestConstraint=constraints[0]||null;
 let state="insufficient";
 if(complete&&strongestConstraint?.score<CONSTRAINT_SCORE_THRESHOLD)state="structural_constraint";
 else if(complete&&spread>=THRESHOLD)state="system_imbalance";
 else if(complete&&hasAsymmetry)state="cross_domain_asymmetry";
 else if(complete)state=spread<THRESHOLD?"stable":"no_material_conflict";

 const messages={
  insufficient:"Недостаточно данных для анализа всей системы.",
  structural_constraint:"Один из доменов содержит выраженный внутренний ограничитель. Сначала анализируется его собственная структура.",
  system_imbalance:"Между индексами есть существенный разрыв. Это системный сигнал, но не причинно-следственный вывод.",
  cross_domain_asymmetry:"Домены находятся в разных диапазонах. Life System фиксирует асимметрию без утверждения причины.",
  stable:"Индексы находятся в относительно согласованном диапазоне.",
  no_material_conflict:"Материального конфликта между доменами не обнаружено."
 };

 return Object.freeze({
  version:"1.1",
  threshold:THRESHOLD,
  inputs:values,
  pairs,
  state,
  states:Object.freeze([state]),
  explanation:messages[state],
  systemMean:available.length?Number((available.reduce((sum,value)=>sum+value,0)/available.length).toFixed(1)):null,
  spread:spread===null?null:Number(spread.toFixed(1)),
  strongestConstraint,
  constraints,
  guardrails:{componentIndexesAreImmutable:true,causalClaimsAllowed:false,lifeQualityCalculationIncluded:false}
 });
}

export{THRESHOLD,createLifeSystemInteraction};