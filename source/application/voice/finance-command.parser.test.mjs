// finance-command.parser.test.mjs — Version 1.1

import test from "node:test";
import assert from "node:assert/strict";

import { parseFinanceVoiceCommand, isCreditProductLabel } from "./finance-command.parser.js";

test("classifies a car purchase as an asset and parses a spoken million amount", () => {
    const result = parseFinanceVoiceCommand("Я купил машину за полтора миллиона рублей");
    assert.equal(result.sectionId, "assets");
    assert.equal(result.label, "Машина");
    assert.equal(result.amount, 1_500_000);
});

test("classifies received salary as actual earnings", () => {
    const result = parseFinanceVoiceCommand("Получил зарплату 120 тысяч рублей");
    assert.equal(result.sectionId, "actual-earnings");
    assert.equal(result.amount, 120_000);
});

test("classifies debt language as financial burden", () => {
    const result = parseFinanceVoiceCommand("Я должен банку 500 тысяч рублей");
    assert.equal(result.sectionId, "financial-burden");
    assert.equal(result.amount, 500_000);
});

test("classifies rent payment as mandatory expenses", () => {
    const result = parseFinanceVoiceCommand("Заплатил за аренду 25 тысяч рублей");
    assert.equal(result.sectionId, "mandatory-expenses");
    assert.equal(result.amount, 25_000);
});

test("does not guess a category when the phrase has no category signal", () => {
    const result = parseFinanceVoiceCommand("Добавь 5000 рублей");
    assert.equal(result.sectionId, null);
    assert.equal(result.amount, 5_000);
});

test("recognizes a credit label as a credit product, not a generic debt", () => {
    const result = parseFinanceVoiceCommand("Кредит 5000");
    assert.equal(result.sectionId, "financial-burden");
    assert.equal(result.label, "Кредит");
    assert.equal(result.amount, 5_000);
    assert.equal(isCreditProductLabel(result.label), true);
});

test("does not classify a generic personal debt as a credit product", () => {
    assert.equal(isCreditProductLabel("Долг другу"), false);
    assert.equal(isCreditProductLabel("Должен банку"), false);
});
