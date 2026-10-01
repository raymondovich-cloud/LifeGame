// financial.burden.js — Version 1.1

const FINANCIAL_BURDEN = Object.freeze({
    id: "financial-burden",
    number: "03",
    name: "Financial Burden",
    localName: "Финансовая нагрузка"
});

function createFinancialBurdenState() {
    return {
        entries: []
    };
}

export { FINANCIAL_BURDEN, createFinancialBurdenState };
