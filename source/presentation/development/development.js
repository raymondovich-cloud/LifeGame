// source/presentation/development/development.js — Version 1.7

import { createInfoTooltip } from "../shared/info.tooltip.js";
import { animateCountUp } from "../shared/count-up.animation.js";
import { animateBarWidth } from "../shared/bar.animation.js";

const FACTORS=Object.freeze([
 {key:"direction",label:"Направление",description:"Ясность курса и актуальность приоритетов.",metrics:[["clarity","Ясность"],["priority","Приоритет"],["review","Актуальность"]]},
 {key:"goals",label:"Цели",description:"Качество целей, прогресс и состояние сроков.",metrics:[["quality","Качество целей"],["progress","Прогресс"],["deadlineHealth","Состояние сроков"],["prioritization","Приоритизация"]]},
 {key:"growth",label:"Рост",description:"Обучение, развитие навыка и практическое применение.",metrics:[["learningConsistency","Регулярность обучения"],["skillProgress","Прогресс навыка"],["application","Применение"],["reflection","Рефлексия"]]},
 {key:"execution",label:"Реализация",description:"Переход от намерения к устойчивому действию.",metrics:[["actionConsistency","Регулярность действий"],["plannedVsCompleted","План / факт"],["momentum","Momentum"]]},
 {key:"balance",label:"Устойчивость",description:"Нагрузка целей, концентрация и стабильность темпа.",metrics:[["goalLoad","Нагрузка целей"],["focusConcentration","Концентрация"],["paceStability","Стабильность темпа"]]}
]);

const PAIR_LABELS={"Finance/Development":"Finance ↔ Development","Finance/Health":"Finance ↔ Health","Development/Health":"Development ↔ Health"};

function el(tag,className,value=null){const node=document.createElement(tag);if(className)node.className=className;if(value!==null)node.textContent=value;return node;}
function score(value){return Number.isFinite(Number(value))?Number(value).toFixed(1):"—";}

function renderFactor(factor,data){
 const item=el("div","development-factor");
 const head=el("div","development-factor__head");
 const track=el("div","development-factor__track");
 const fill=el("span","development-factor__fill");
 const value=Number(data?.score);
 animateBarWidth(fill,Number.isFinite(value)?Math.max(0,Math.min(100,value)):0);
 head.append(el("span","development-factor__label",factor.label),el("strong","development-factor__score",Number.isFinite(value)?score(value)+"/100":"—"));
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
 summary.append(el("span","development-system-summary__state",interaction?.state?.replaceAll("_"," ").toUpperCase()||"INSUFFICIENT"),el("strong","development-system-summary__spread",interaction?.spread===null||interaction?.spread===undefined?"—":interaction.spread+" pts"),el("p","development-system-summary__explanation",interaction?.explanation||"Недостаточно данных."));
 section.appendChild(summary);
 const pairs=el("div","development-interaction-pairs");
 (interaction?.pairs||[]).forEach(item=>{
  const row=el("div","development-interaction-pair");
  const name=PAIR_LABELS[item.pair?.join("/")||""]||item.pair?.join(" ↔ ")||"Домен";
  const state=item.state==="aligned"?"ALIGNED":item.state==="insufficient"?"INSUFFICIENT":"ASYMMETRY";
  row.append(el("span","development-interaction-pair__name",name),el("span","development-interaction-pair__difference",item.difference===null?"—":item.difference+" pts"),el("span","development-interaction-pair__state",state),el("p","development-interaction-pair__message",item.message));
  pairs.appendChild(row);
 });
 section.append(el("span","finance-section-meta","INDEX INTERACTIONS"),pairs);
 if(interaction?.strongestConstraint){
  const constraint=interaction.strongestConstraint;
  const block=el("div","development-system-constraint");
  block.append(el("strong","",constraint.domain+" · "+constraint.factor),el("p","",score(constraint.score)+"/100 · constraint "+score(constraint.constraint)));
  section.append(el("span","finance-section-meta","STRONGEST CONSTRAINT"),block);
 }
 return section;
}

function createDataScreen(application,container,onBack){
 container.replaceChildren();
 const page=el("section","finance-workspace finance-data-screen development-data-screen");
 page.setAttribute("aria-label","Development data");
 const intro=el("header","finance-workspace-header");
 intro.append(el("span","finance-section-meta","DEVELOPMENT"),el("h2","","Данные развития"),el("p","","Фиксируйте текущее состояние пяти областей. Система использует последние данные за 28 дней."));
 const back=document.createElement("button");
 back.type="button";back.className="finance-text-action";back.textContent="← Development";back.addEventListener("click",onBack);
 const backNavigation=el("div","finance-data-back");backNavigation.appendChild(back);
 page.append(backNavigation,intro);
 const list=el("div","accordion-list finance-data-accordion development-data-accordion");
 FACTORS.forEach((factor,index)=>{
  const article=document.createElement("article");article.className="accordion-item finance-subblock development-data-subblock";article.dataset.subblock=factor.key;
  const trigger=document.createElement("button");trigger.type="button";trigger.className="accordion-trigger";trigger.setAttribute("aria-expanded","false");trigger.innerHTML='<span class="accordion-index">'+String(index+1).padStart(2,"0")+'</span><span class="accordion-title-group"><span class="accordion-title">'+factor.label+'</span><span class="accordion-description">'+factor.description+'</span></span>';
  const header=el("div","accordion-header");header.append(trigger,createInfoTooltip({label:"Информация: "+factor.label,text:factor.description}));
  const content=el("div","accordion-content");content.hidden=true;
  const state=el("div","development-data-state");const form=el("div","development-data-form");const inputs=new Map();const records=el("div","development-data-records");
  function renderState(facts){
   records.replaceChildren();const latest=facts?.[0];
   if(!latest){state.textContent="Данных пока нет";return;}
   state.textContent="Последняя запись · "+new Date(Number(latest.recordedAt)).toLocaleDateString("ru-RU");
   const row=el("div","development-data-record");
   const values=factor.metrics.map(([key,label])=>latest[key]===undefined?null:[label,latest[key]]).filter(Boolean);
   row.append(...values.map(([label,value])=>el("span","",label+": "+value)));
   const actions=el("div","development-data-record-actions");
   const edit=document.createElement("button");edit.type="button";edit.className="finance-text-action";edit.textContent="Изменить";
   edit.addEventListener("click",()=>{for(const[key]of factor.metrics){if(inputs.has(key))inputs.get(key).value=latest[key]??"";}form.dataset.editingId=latest.id;form.scrollIntoView({behavior:"smooth",block:"nearest"});});
   const remove=document.createElement("button");remove.type="button";remove.className="finance-text-action";remove.textContent="Удалить";
   remove.addEventListener("click",async()=>{if(!application.deleteFact)return;remove.disabled=true;try{await application.deleteFact(factor.key,latest.id);renderRecords();clearForm();}catch(error){state.textContent=error?.message||"Не удалось удалить запись."}finally{remove.disabled=false;}});
   actions.append(edit,remove);row.appendChild(actions);records.appendChild(row);
  }
  async function renderRecords(){try{renderState(await application.listFacts(factor.key));}catch(error){state.textContent=error?.message||"Не удалось загрузить данные."}}
  function clearForm(){for(const input of inputs.values())input.value="";delete form.dataset.editingId;}
  factor.metrics.forEach(([key,label])=>{
   const field=el("label","development-data-field");field.appendChild(el("span","development-data-field__label",label));
   const input=document.createElement("input");input.type="number";input.min="0";input.max="100";input.step="1";input.inputMode="numeric";input.className="input-control";input.placeholder="0–100";
   inputs.set(key,input);field.appendChild(input);form.appendChild(field);
  });
  const controls=el("div","development-data-form-actions");
  const save=document.createElement("button");save.type="button";save.className="button-control";save.textContent="Сохранить";
  const cancel=document.createElement("button");cancel.type="button";cancel.className="finance-text-action";cancel.textContent="Очистить";
  const message=el("p","development-data-status");
  cancel.addEventListener("click",clearForm);
  save.addEventListener("click",async()=>{
   save.disabled=true;message.textContent="Сохраняем…";
   try{
    const payload={};
    for(const[key,input]of inputs){if(input.value.trim()!==""){const value=Number(input.value);if(!Number.isFinite(value)||value<0||value>100)throw new Error("Каждый показатель должен быть от 0 до 100.");payload[key]=value;}}
    if(!Object.keys(payload).length)throw new Error("Добавьте хотя бы один показатель.");
    const editingId=form.dataset.editingId;if(editingId)await application.updateFact(factor.key,editingId,payload);else await application.recordFact(factor.key,payload);
    clearForm();message.textContent=editingId?"Изменения сохранены.":"Данные добавлены.";await renderRecords();
   }catch(error){message.textContent=error?.message||"Не удалось сохранить данные."}finally{save.disabled=false;}
  });
  const formTitle=el("span","finance-section-meta","НОВАЯ ЗАПИСЬ");controls.append(save,cancel);form.append(formTitle,controls,message);content.append(state,records,form);article.append(header,content);
  trigger.addEventListener("click",async()=>{const open=trigger.getAttribute("aria-expanded")!=="true";trigger.setAttribute("aria-expanded",String(open));article.classList.toggle("is-open",open);content.hidden=!open;if(open)await renderRecords();});
  list.appendChild(article);
 });
 page.appendChild(list);container.appendChild(page);
}

function createDevelopmentHealthBlock(result){
 const section=el("section","finance-health");
 section.setAttribute("aria-label","Development health");
 const header=el("div","finance-health-header");
 header.append(el("span","finance-section-meta","DEVELOPMENT HEALTH"));
 const diagnostics=document.createElement("button");
 diagnostics.type="button";diagnostics.className="finance-text-action";diagnostics.textContent="Показать диагностику →";
 const panel=el("div","finance-health-diagnostics");panel.hidden=true;
 diagnostics.addEventListener("click",()=>{const open=panel.hidden;panel.hidden=!open;diagnostics.textContent=open?"Скрыть диагностику ↑":"Показать диагностику →";});
 header.appendChild(diagnostics);
 const valueRow=el("div","finance-health-value-row");
 const value=el("span","finance-health-value",result.index.value===null?"—":"0.0");
 valueRow.append(value,el("span","finance-health-suffix","/100"));
 const category=el("span","finance-health-category",result.index.category?.label||"Недостаточно данных");
 const description=el("p","finance-health-description","Сводная оценка направления, целей, роста, реализации и устойчивости за последние 28 дней.");
 const factors=result.index.factors||{};
 FACTORS.forEach(factor=>{
  const data=factors[factor.key];if(!data)return;
  const row=el("div","finance-diagnostic-row");
  row.append(el("span","",factor.label),el("span","",Number.isFinite(Number(data.score))?score(data.score)+"/100":"—"));
  panel.appendChild(row);
 });
 section.append(header,valueRow,category,description,panel);
 return {section,value};
}

function createDevelopmentDynamicsBlock(result){
 const section=el("section","finance-capital");
 section.setAttribute("aria-label","Development dynamics");
 const heading=el("div","finance-block-heading");heading.append(el("span","finance-section-meta","DEVELOPMENT"));
 const value=result.index.value===null?"—":"0.0/100";
 const amount=el("div","finance-capital-value",value);
 const caption=el("p","finance-capital-caption","Текущий уровень развития");
 const chart=el("div","finance-capital-chart");chart.setAttribute("aria-label","Пять факторов развития");
 const title=el("span","finance-capital-chart-title","Состояние пяти факторов");
 const bars=el("div","finance-capital-chart-bars");
 FACTORS.forEach(factor=>{
  const factorData=result.index.factors?.[factor.key];const valueNumber=Number(factorData?.score);
  const column=el("div","finance-capital-chart-column");
  const track=el("span","finance-capital-chart-track");const bar=el("span","finance-capital-chart-bar");
  if(Number.isFinite(valueNumber)){bar.style.height=Math.max(10,valueNumber)+"%";bar.classList.add(valueNumber>=75?"is-positive":valueNumber<60?"is-negative":"");}
  track.appendChild(bar);
  const metric=el("strong","finance-capital-chart-value",Number.isFinite(valueNumber)?score(valueNumber):"—");
  const label=el("span","finance-capital-chart-label",factor.label);
  const footer=el("div","finance-capital-chart-footer");footer.append(metric,label);
  column.append(track,footer);bars.appendChild(column);
 });
 chart.append(title,bars);section.append(heading,amount,caption,chart);return {section,value:amount,score:result.index.value};
}

function createDevelopmentDiagnosisBlock(result){
 const section=el("section","finance-capital");
 section.setAttribute("aria-label","Development diagnosis");
 const primary=result.diagnosis?.primaryConstraint;
 section.append(el("div","finance-block-heading"),el("span","finance-section-meta","DIAGNOSIS"),el("h3","finance-capital-value",primary?primary.label:"Состояние системы"),el("p","finance-capital-caption",result.diagnosis?.message||"Недостаточно данных."));
 const meta=el("div","finance-capital-split");const item=el("div","finance-capital-split-item");
 item.append(el("span","",primary?"ОЦЕНКА ОГРАНИЧИТЕЛЯ":"СТАТУС"),el("strong","",primary?score(primary.score)+"/100":"Данные формируются"));meta.appendChild(item);section.appendChild(meta);return section;
}

async function renderDevelopment(container,application,lifeSystemApplication=null,options={}){
 if(!application)throw new Error("LifeGame Development: application is required.");
 container.replaceChildren();
 const page=el("section","finance-workspace development-workspace");
 const showPresentationHeader=options.showPresentationHeader!==false;
 const intro=el("header","finance-workspace-header");
 intro.append(el("span","finance-section-meta","DEVELOPMENT"),el("h2","","Система развития"),el("p","","Одна система для направления, целей, роста, действий и устойчивого темпа."));
 if(showPresentationHeader)page.appendChild(intro);
 const result=await application.calculateFromMemory();
 const developmentHealth=createDevelopmentHealthBlock(result);
 const developmentDynamics=createDevelopmentDynamicsBlock(result);
 page.appendChild(developmentHealth.section);
 page.appendChild(developmentDynamics.section);
 page.appendChild(createDevelopmentDiagnosisBlock(result));
 const data=el("section","finance-data-entry");
 const copy=el("div","finance-data-entry-copy");
 copy.append(el("strong","","Управление данными развития"),el("p","","Добавление, редактирование и удаление показателей по пяти направлениям."));
 const action=document.createElement("button");action.type="button";action.className="finance-text-action";action.textContent="Открыть →";
 action.addEventListener("click",()=>createDataScreen(application,container,()=>renderDevelopment(container,application,lifeSystemApplication)));
 data.append(copy,action);page.appendChild(data);
 if(lifeSystemApplication){const system=await lifeSystemApplication.analyze();page.appendChild(createSystemContext(system));}
 container.appendChild(page);
 if(result.index.value!==null&&result.index.value!==undefined&&Number.isFinite(Number(result.index.value))){
  animateCountUp(developmentHealth.value,Number(result.index.value),{duration:1800,decimalPlaces:1});
  animateCountUp(developmentDynamics.value,Number(result.index.value),{
   duration:1800,
   decimalPlaces:1,
   formatter:value=>Number(value).toFixed(1)+"/100"
  });
 }
}

export{renderDevelopment};