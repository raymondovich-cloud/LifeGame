// source/presentation/development/development.js — Version 1.1
const FACTORS=Object.freeze([
 {key:"direction",label:"Направление",description:"Ясность курса и актуальность приоритетов.",metrics:[["clarity","Ясность"],["priority","Приоритет"],["review","Актуальность"]]},
 {key:"goals",label:"Цели",description:"Качество целей, прогресс и состояние сроков.",metrics:[["quality","Качество целей"],["progress","Прогресс"],["deadlineHealth","Состояние сроков"],["prioritization","Приоритизация"]]},
 {key:"growth",label:"Рост",description:"Обучение, развитие навыка и практическое применение.",metrics:[["learningConsistency","Регулярность обучения"],["skillProgress","Прогресс навыка"],["application","Применение"],["reflection","Рефлексия"]]},
 {key:"execution",label:"Реализация",description:"Переход от намерения к устойчивому действию.",metrics:[["actionConsistency","Регулярность действий"],["plannedVsCompleted","План / факт"],["momentum","Momentum"]]},
 {key:"balance",label:"Устойчивость",description:"Нагрузка целей, концентрация и стабильность темпа.",metrics:[["goalLoad","Нагрузка целей"],["focusConcentration","Концентрация"],["paceStability","Стабильность темпа"]]}
]);

const PAIR_LABELS={
 "Finance/Development":"Finance ↔ Development",
 "Finance/Health":"Finance ↔ Health",
 "Development/Health":"Development ↔ Health"
};

function el(tag,className,value=null){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(value!==null)node.textContent=value;
 return node;
}

function score(value){
 return Number.isFinite(Number(value))?Number(value).toFixed(1):"—";
}

function renderFactor(factor,data){
 const item=el("div","development-factor");
 const head=el("div","development-factor__head");
 const track=el("div","development-factor__track");
 const fill=el("span","development-factor__fill");
 const value=Number(data?.score);
 fill.style.width=Number.isFinite(value)?Math.max(0,Math.min(100,value))+"%":"0%";
 head.append(
  el("span","development-factor__label",factor.label),
  el("strong","development-factor__score",Number.isFinite(value)?score(value)+"/100":"—")
 );
 track.appendChild(fill);
 item.append(head,track,el("p","development-factor__description",factor.description));
 return item;
}

function createSystemContext(result){
 const interaction=result?.interaction;
 const section=el("section","development-system-context");
 section.append(el("span","finance-section-meta","LIFE SYSTEM"));
 const grid=el("div","development-system-context__grid");

 [["Finance",result?.finance?.value],["Health",result?.health?.value],["Development",result?.development?.value]].forEach(([label,value])=>{
  const item=el("div","development-system-context__item");
  item.append(el("span","",label),el("strong","",Number.isFinite(Number(value))?score(value):"—"));
  grid.appendChild(item);
 });

 section.appendChild(grid);

 const summary=el("div","development-system-summary");
 summary.append(
  el("span","development-system-summary__state",interaction?.state?.replaceAll("_"," ").toUpperCase()||"INSUFFICIENT"),
  el("strong","development-system-summary__spread",interaction?.spread===null||interaction?.spread===undefined?"—":interaction.spread+" pts"),
  el("p","development-system-summary__explanation",interaction?.explanation||"Недостаточно данных.")
 );
 section.appendChild(summary);

 const pairs=el("div","development-interaction-pairs");
 (interaction?.pairs||[]).forEach(item=>{
  const row=el("div","development-interaction-pair");
  const name=PAIR_LABELS[item.pair?.join("/")||""]||item.pair?.join(" ↔ ")||"Домен";
  const state=item.state==="aligned"?"ALIGNED":item.state==="insufficient"?"INSUFFICIENT":"ASYMMETRY";
  row.append(
   el("span","development-interaction-pair__name",name),
   el("span","development-interaction-pair__difference",item.difference===null?"—":item.difference+" pts"),
   el("span","development-interaction-pair__state",state)
  );
  row.appendChild(el("p","development-interaction-pair__message",item.message));
  pairs.appendChild(row);
 });
 section.append(el("span","finance-section-meta","INDEX INTERACTIONS"),pairs);

 if(interaction?.strongestConstraint){
  const constraint=interaction.strongestConstraint;
  section.append(
   el("div","development-system-constraint"),
   el("span","finance-section-meta","STRONGEST CONSTRAINT")
  );
  const last=section.lastElementChild;
  const block=el("div","development-system-constraint");
  block.append(
   el("strong","",constraint.domain+" · "+constraint.factor),
   el("p","",score(constraint.score)+"/100 · constraint "+score(constraint.constraint))
  );
  section.appendChild(block);
 }
 return section;
}

function createDataScreen(application,container,onBack){
 container.replaceChildren();
 const page=el("section","finance-workspace development-data-screen");
 const back=document.createElement("button");
 back.type="button";back.className="finance-text-action";back.textContent="← Development";back.addEventListener("click",onBack);
 const header=el("header","finance-workspace-header");
 header.append(
  el("span","finance-section-meta","DEVELOPMENT DATA"),
  el("h2","","Данные развития"),
  el("p","","Пять независимых областей. Каждая запись сохраняется с датой и участвует в 28-дневном контуре.")
 );
 const groups=el("div","development-data-groups");

 FACTORS.forEach((factor,index)=>{
  const details=document.createElement("details");
  details.className="development-data-group";
  if(index===0)details.open=true;

  const summary=document.createElement("summary");
  summary.className="development-data-group__summary";
  summary.append(
   el("span","accordion-index",String(index+1).padStart(2,"0")),
   el("span","development-data-group__copy",factor.label)
  );
  details.appendChild(summary);

  const body=el("div","development-data-group__body");
  body.appendChild(el("p","development-data-group__description",factor.description));
  const grid=el("div","development-data-group__grid");
  const inputs=new Map();

  const currentFacts=application.listFacts?application.listFacts(factor.key):Promise.resolve([]);
  Promise.resolve(currentFacts).then(facts=>{
   const latest=facts?.[0]||{};
   for(const [key] of factor.metrics){
    const input=inputs.get(key);
    if(input&&Number.isFinite(Number(latest[key])))input.value=String(latest[key]);
   }
  });

  factor.metrics.forEach(([key,label])=>{
   const labelNode=el("label","development-data-field");
   labelNode.appendChild(el("span","development-data-field__label",label));
   const input=document.createElement("input");
   input.type="number";input.min="0";input.max="100";input.step="1";input.inputMode="numeric";
   input.className="input-control";input.placeholder="0–100";inputs.set(key,input);
   labelNode.appendChild(input);grid.appendChild(labelNode);
  });

  const save=document.createElement("button");
  save.type="button";save.className="button-control";save.textContent="Сохранить";
  const status=el("p","development-data-status");

  save.addEventListener("click",async()=>{
   save.disabled=true;status.textContent="Сохраняем…";
   try{
    const payload={};
    for(const [key,input] of inputs){
     if(input.value.trim()!==""){
      const value=Number(input.value);
      if(!Number.isFinite(value)||value<0||value>100)throw new Error("Каждый показатель должен быть от 0 до 100.");
      payload[key]=value;
     }
    }
    if(!Object.keys(payload).length)throw new Error("Добавьте хотя бы один показатель.");
    await application.recordFact(factor.key,payload);
    status.textContent="Сохранено. Индекс обновится после следующего расчёта.";
   }catch(error){
    status.textContent=error?.message||"Не удалось сохранить данные.";
   }finally{save.disabled=false;}
  });

  body.append(grid,save,status);
  details.appendChild(body);
  groups.appendChild(details);
 });

 page.append(back,header,groups);
 container.appendChild(page);
}

async function renderDevelopment(container,application,lifeSystemApplication=null){
 if(!application)throw new Error("LifeGame Development: application is required.");
 container.replaceChildren();

 const page=el("section","finance-workspace development-workspace");
 const intro=el("header","finance-workspace-header");
 intro.append(
  el("span","finance-section-meta","DEVELOPMENT"),
  el("h2","","Система развития"),
  el("p","","Один контур для направления, целей, роста, действий и устойчивого темпа.")
 );

 const hero=el("section","development-index");
 hero.append(el("span","finance-section-meta","DEVELOPMENT HEALTH"));
 const value=el("div","development-index__value","—");
 const status=el("div","development-index__status","Недостаточно данных");
 hero.append(value,status,el("p","development-index__description","Индекс строится из пяти факторов и актуальных данных за последние 28 дней."));
 
 const factors=el("section","development-factors");
 factors.append(el("span","finance-section-meta","SYSTEM FACTORS"));
 const list=el("div","development-factors__list");factors.appendChild(list);

 const diagnosis=el("section","development-diagnostics");
 diagnosis.append(el("span","finance-section-meta","DIAGNOSIS"));

 const data=el("section","finance-data-entry");
 const copy=el("div","finance-data-entry-copy");
 copy.append(
  el("strong","","Управление данными развития"),
  el("p","","Направление, цели, рост, реализация и устойчивость. Данные остаются независимыми от Finance и Health.")
 );
 const action=document.createElement("button");
 action.type="button";action.className="finance-text-action";action.textContent="Открыть данные →";
 action.addEventListener("click",()=>createDataScreen(application,container,()=>renderDevelopment(container,application,lifeSystemApplication)));
 data.append(copy,action);

 page.append(intro,hero,factors,diagnosis,data);
 container.appendChild(page);

 const result=await application.calculateFromMemory();
 const system=lifeSystemApplication?await lifeSystemApplication.analyze():null;

 value.textContent=result.index.value===null?"—":score(result.index.value);
 status.textContent=result.index.category?.label||"Недостаточно данных";

 FACTORS.forEach(factor=>list.appendChild(renderFactor(factor,result.index.factors?.[factor.key])));

 const primary=result.diagnosis?.primaryConstraint;
 diagnosis.append(
  el("h3","",primary?"Главный ограничитель":"Состояние системы"),
  el("p","",result.diagnosis?.message||"Недостаточно данных."),
  el("div","development-diagnostics__meta",primary?primary.label+" · "+score(primary.score)+"/100":"Данные ещё формируются")
 );

 if(system)page.appendChild(createSystemContext(system));
}

export{renderDevelopment};