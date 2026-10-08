// source/application/health/health.analytics.js — Version 1.0
// Responsibility: calculate block-level Health analytics from stored Health facts.

const SECTIONS = Object.freeze({
    recovery: { title:"Восстановление", description:"Динамика сна и субъективного восстановления.", source:"recovery", metrics:[
        {id:"sleepDurationHours",label:"Сон",unit:"ч",aggregation:"average"},
        {id:"subjectiveRecovery",label:"Восстановление",unit:"/10",aggregation:"average"}]},
    activity: { title:"Активность", description:"Динамика повседневного движения.", source:"activity", metrics:[
        {id:"stepsPerDay",label:"Шаги в день",unit:"шагов",aggregation:"average"},
        {id:"activeMinutesPerWeek",label:"Активность",unit:"мин/нед.",aggregation:"average"}]},
    training: { title:"Тренировки", description:"История тренировок и объём выполненной работы.", source:"activity", metrics:[
        {id:"workoutCount",label:"Тренировки",unit:"раз",aggregation:"countWorkouts"},
        {id:"workoutDuration",label:"Общий объём",unit:"мин.",aggregation:"sumWorkoutDuration"},
        {id:"trainingsPerWeek",label:"Тренировок в неделю",unit:"раз",aggregation:"trainingRate"}]},
    nutrition: { title:"Питание", description:"Динамика субъективного качества питания.", source:"lifestyle", metrics:[
        {id:"subjectiveQuality",label:"Качество питания",unit:"/10",aggregation:"average"}]},
    lifestyle: { title:"Образ жизни", description:"Динамика стресса, настроения и самочувствия.", source:"lifestyle", metrics:[
        {id:"stress",label:"Стресс",unit:"/10",aggregation:"average"},
        {id:"mood",label:"Настроение",unit:"/10",aggregation:"average"},
        {id:"subjectiveWellbeing",label:"Самочувствие",unit:"/10",aggregation:"average"}]},
    body: { title:"Состояние тела", description:"Аналитика появится после подключения телесных показателей.", source:"body", metrics:[] }
});

function createHealthAnalytics({healthApplication}) {
    if (!healthApplication || typeof healthApplication.listFacts !== "function") throw new Error("LifeGame Health Analytics: Health Application is required.");

    function getHealthAnalyticsRange(period, now=Date.now()) {
        const endDate = new Date(now);
        let startDate;
        if (period === "week") { startDate=new Date(now); startDate.setDate(startDate.getDate()-7); }
        else if (period === "month") { startDate=new Date(now); startDate.setMonth(startDate.getMonth()-1); }
        else if (period === "year") { startDate=new Date(now); startDate.setFullYear(startDate.getFullYear()-1); }
        else if (period === "all-time") startDate=new Date(0);
        else throw new Error("LifeGame Health Analytics: unknown period.");
        return {startDate:startDate.getTime(),endDate:endDate.getTime()};
    }

    function average(records, field) {
        const values=records.map((record)=>Number(record?.[field])).filter(Number.isFinite);
        return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
    }

    function calculateMetric(metric, records, startDate, endDate) {
        const workouts=records.filter((record)=>record?.type==="workout" || record?.workout===true);
        if (metric.aggregation==="countWorkouts") return workouts.length;
        if (metric.aggregation==="sumWorkoutDuration") {
            const values=workouts.map((record)=>Number(record?.durationMinutes)).filter(Number.isFinite);
            return values.length ? values.reduce((a,b)=>a+b,0) : null;
        }
        if (metric.aggregation==="trainingRate") {
            const days=Math.max(1,(endDate-startDate)/86400000);
            return workouts.length/(days/7);
        }
        return average(records,metric.id);
    }

    async function getHealthAnalytics(sectionId,{startDate,endDate}) {
        const section=SECTIONS[sectionId];
        if (!section) throw new Error("LifeGame Health Analytics: unknown section.");
        const startTimestamp=new Date(startDate).getTime();
        const endTimestamp=new Date(endDate).getTime();
        if (!Number.isFinite(startTimestamp)||!Number.isFinite(endTimestamp)||startTimestamp>endTimestamp) throw new Error("LifeGame Health Analytics: invalid date range.");

        const records=section.metrics.length ? await healthApplication.listFacts(section.source) : [];
        const rangedRecords=records.filter((record)=>{
            const timestamp=Number(record?.recordedAt);
            return Number.isFinite(timestamp)&&timestamp>=startTimestamp&&timestamp<=endTimestamp;
        });
        const metrics=Object.fromEntries(section.metrics.map((metric)=>[metric.id,{
            id:metric.id,label:metric.label,unit:metric.unit,
            value:calculateMetric(metric,rangedRecords,startTimestamp,endTimestamp)
        }]));
        return {sectionId,title:section.title,description:section.description,startDate:startTimestamp,endDate:endTimestamp,observations:rangedRecords.length,metrics};
    }
    return Object.freeze({getHealthAnalyticsRange,getHealthAnalytics});
}
export {SECTIONS,createHealthAnalytics};
