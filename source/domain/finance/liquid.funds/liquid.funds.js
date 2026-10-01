// liquid.funds.js — Version 1.1

const LIQUID_FUNDS = Object.freeze({
    id: "liquid-funds",
    number: "01",
    name: "Liquid Funds",
    localName: "Ликвидные средства"
});

function createLiquidFundsState() {
    return {
        entries: []
    };
}

export { LIQUID_FUNDS, createLiquidFundsState };
