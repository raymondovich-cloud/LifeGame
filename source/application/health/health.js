// health.js — Version 1.2
// Responsibility: orchestrate Health Memory, Index and Diagnosis for Presentation.

import { calculateHealthIndex } from "../../index/health/health.index.js";
import { createHealthAggregator } from "./health.aggregator.js";

function validateHealthInput(input) {
    if (input === null || typeof input !== "object") {
        throw new Error("LifeGame Health: health input is required.");
    }

    return input;
}

function buildHealthDiagnosis(index) {
    if (!index || index.value === null) {
        return {
            status: "insufficient",
            primaryConstraint: null,
            message: "Недостаточно данных для полноценной оценки здоровья."
        };
    }

    const primary = index.constraints?.[0] || null;

    if (!primary) {
        return {
            status: "stable",
            primaryConstraint: null,
            message: "Выраженного ограничивающего фактора не обнаружено."
        };
    }

    const labels = {
        recovery: "восстановление",
        activity: "активность",
        training: "тренировки",
        nutrition: "питание",
        lifestyle: "образ жизни",
        body: "состояние тела"
    };

    const label = labels[primary.factor] || primary.factor;

    return {
        status: "attention",
        primaryConstraint: {
            factor: primary.factor,
            label,
            score: primary.score,
            constraint: Number(primary.constraint.toFixed(2))
        },
        message: "Главный ограничитель: " + label +
            ". Текущий вклад фактора — " + primary.score.toFixed(1) + "/100."
    };
}

function createHealthApplication({ memory = null } = {}) {
    const aggregator = memory ? createHealthAggregator(memory) : null;

    async function calculateFromMemory(options = {}) {
        if (!aggregator) {
            throw new Error("LifeGame Health: memory is required for calculation from stored facts.");
        }

        const input = await aggregator.aggregate(options);
        return calculate(input);
    }

    async function recordFact(category, fact) {
        if (!memory) {
            throw new Error("LifeGame Health: memory is required to store health facts.");
        }

        const normalizedCategory = String(category || "").trim();
        if (!["body", "activity", "recovery", "lifestyle"].includes(normalizedCategory)) {
            throw new Error("LifeGame Health: invalid health fact category.");
        }

        if (!fact || typeof fact !== "object" || Array.isArray(fact)) {
            throw new Error("LifeGame Health: health fact is required.");
        }

        return memory.saveFact(normalizedCategory, {
            ...fact,
            recordedAt: fact.recordedAt || Date.now()
        });
    }

    async function listFacts(category) {
        if (!memory) {
            throw new Error("LifeGame Health: memory is required to read health facts.");
        }

        return memory.listFacts(String(category || "").trim());
    }

    function calculate(input) {
        const healthInput = validateHealthInput(input);
        const index = calculateHealthIndex(healthInput);
        const diagnosis = buildHealthDiagnosis(index);

        return Object.freeze({
            index,
            diagnosis
        });
    }

    return Object.freeze({
        calculate,
        calculateFromMemory,
        recordFact,
        listFacts
    });
}

export {
    createHealthApplication,
    buildHealthDiagnosis
};
