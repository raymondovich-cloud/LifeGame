// source/presentation/health/section.analytics.js — Version 1.4
// Responsibility: render block-level Health analytics.

const PERIODS=Object.freeze([["week","Неделя"],["month","Месяц"],["year","Год"],["custom","Период"]]);

function formatValue(value,unit) {
    if(value===null||value===undefined||!Number.isFinite(Number(value))) return "—";
    const number=Number(value);
    return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:number%1===0?0:1}).format(number)+(unit?" "+unit:"");
}
function formatDate(timestamp) {
    if(!timestamp) return "—";
    return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(timestamp));
}
function renderHealthAnalyticsScreen(root,healthAnalytics,section,onBack) {
    root.replaceChildren();
    const sectionTitle = section?.label || section?.title || "Health";
    const sectionDescription = section?.description || "";
    const sectionKey = section?.key || section?.id;

    if (!sectionKey) {
        throw new Error("LifeGame Health Analytics: section key is required.");
    }

    const page=document.createElement("section");
    page.className="health-analytics-screen";
    page.setAttribute("aria-label","Аналитика "+sectionTitle);

    const back=document.createElement("button");
    back.type="button"; back.className="health-analytics-back"; back.textContent="← "+sectionTitle;
    back.addEventListener("click",()=>{if(typeof onBack==="function") onBack();});

    const frame=document.createElement("div"); frame.className="health-analytics-frame";
    const header=document.createElement("header"); header.className="health-analytics-header";
    const eyebrow=document.createElement("span"); eyebrow.className="statistics-meta"; eyebrow.textContent="HEALTH · "+sectionTitle.toUpperCase();
    const title=document.createElement("h2"); title.className="health-analytics-title"; title.textContent="Аналитика";
    const description=document.createElement("p"); description.className="health-analytics-description"; description.textContent=sectionDescription;
    header.append(eyebrow,title,description);

    const periods=document.createElement("div"); periods.className="health-analytics-periods";
    const content=document.createElement("div"); content.className="health-analytics-content";

    const renderError=(error)=>{
        content.replaceChildren();
        const empty=document.createElement("p");
        empty.className="health-analytics-empty";
        empty.textContent=error?.message||"Не удалось загрузить аналитику.";
        content.appendChild(empty);
    };

    const render=async(period,customRange=null)=>{
        periods.querySelectorAll("button").forEach((button)=>button.classList.toggle("is-active",button.dataset.period===period));
        content.replaceChildren();
        const loading=document.createElement("p");
        loading.className="health-analytics-empty";
        loading.textContent="Загрузка аналитики…";
        content.appendChild(loading);

        try {
            const range=customRange||healthAnalytics.getHealthAnalyticsRange(period);
            const analytics=await healthAnalytics.getHealthAnalytics(sectionKey,range);
            if (!analytics || typeof analytics !== "object") {
                throw new Error("LifeGame Health Analytics: analytics result is invalid.");
            }
            content.replaceChildren();

            const overview=document.createElement("section"); overview.className="health-analytics-overview";
        const overviewLabel=document.createElement("span"); overviewLabel.className="statistics-meta"; overviewLabel.textContent="ДАННЫЕ ЗА ПЕРИОД";
        const overviewValue=document.createElement("strong"); overviewValue.className="health-analytics-overview-value";
        overviewValue.textContent=analytics.observations+" "+(analytics.observations===1?"наблюдение":"наблюдений");
        const overviewDate=document.createElement("span"); overviewDate.className="health-analytics-date";
        overviewDate.textContent=formatDate(analytics.startDate)+" — "+formatDate(analytics.endDate);
        overview.append(overviewLabel,overviewValue,overviewDate); content.appendChild(overview);

        const metrics=document.createElement("section"); metrics.className="health-analytics-metrics";
        Object.values(analytics.metrics).forEach((metric)=>{
            const row=document.createElement("div"); row.className="health-analytics-metric";
            const label=document.createElement("span"); label.textContent=metric.label;
            const value=document.createElement("strong"); value.textContent=formatValue(metric.value,metric.unit);
            row.append(label,value); metrics.appendChild(row);
        });
        if(!Object.keys(analytics.metrics).length) {
            const empty=document.createElement("p"); empty.className="health-analytics-empty";
            empty.textContent="Показатели для этой аналитики будут подключены после завершения Body.";
            metrics.appendChild(empty);
        }
            content.appendChild(metrics);

            if (analytics.observations === 0) {
                const empty=document.createElement("p");
                empty.className="health-analytics-empty";
                empty.textContent="За выбранный период данных пока нет.";
                content.appendChild(empty);
            }
        } catch (error) {
            renderError(error);
        }
    };

    PERIODS.forEach(([id,label])=>{
        const button=document.createElement("button"); button.type="button"; button.className="health-analytics-period";
        button.dataset.period=id; button.textContent=label;
        button.addEventListener("click",async()=>{
            if(id!=="custom"){await render(id);return;}
            content.replaceChildren();
            const custom=document.createElement("div"); custom.className="health-analytics-custom";
            custom.innerHTML='<label>От<input type="date" data-start></label><label>До<input type="date" data-end></label><button type="button" class="button-control" data-apply>Показать</button>';
            content.appendChild(custom);
            custom.querySelector("[data-apply]").addEventListener("click",async()=>{
                const start=custom.querySelector("[data-start]").value,end=custom.querySelector("[data-end]").value;
                if(!start||!end)return;
                const startDate=new Date(start+"T00:00:00"),endDate=new Date(end+"T23:59:59.999");
                if(endDate<startDate||endDate-startDate>183*86400000)return;
                await render("custom",{startDate:startDate.getTime(),endDate:endDate.getTime()});
            });
        });
        periods.appendChild(button);
    });

    frame.append(header,periods,content); page.append(back,frame); root.appendChild(page);
    // Render the shell synchronously first; data loading must never prevent
    // the analytics interface from appearing.
    try {
        void render("month");
    } catch (error) {
        renderError(error);
    }
}
export {renderHealthAnalyticsScreen};
