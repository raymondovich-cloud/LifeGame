// financial.cushion.js — Version 1.1

const FINANCIAL_CUSHION = Object.freeze({
    id: "financial-cushion",
    number: "05",
    name: "Financial Cushion",
    localName: "Финансовая подушка"
});

function createFinancialCushionState() {
    return {
        entries: []
    };
}

export { FINANCIAL_CUSHION, createFinancialCushionState };
