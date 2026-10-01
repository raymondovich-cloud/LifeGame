// mandatory.expenses.js — Version 1.1

const MANDATORY_EXPENSES = Object.freeze({
    id: "mandatory-expenses",
    number: "04",
    name: "Mandatory Expenses",
    localName: "Обязательные траты"
});

function createMandatoryExpensesState() {
    return {
        entries: []
    };
}

export { MANDATORY_EXPENSES, createMandatoryExpensesState };
