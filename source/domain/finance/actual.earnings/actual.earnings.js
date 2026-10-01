// actual.earnings.js — Version 1.1

const ACTUAL_EARNINGS = Object.freeze({
    id: "actual-earnings",
    number: "02",
    name: "Actual Earnings",
    localName: "Фактически заработано"
});

function createActualEarningsState() {
    return {
        entries: []
    };
}

export { ACTUAL_EARNINGS, createActualEarningsState };
