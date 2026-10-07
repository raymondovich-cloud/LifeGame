// credit.product.js — Version 1.0

const MAX_SIMULATION_MONTHS = 1200;

function calculateCreditProduct(debt, payment, annualInterestRate, options = {}) {
    const normalizedDebt = Number(debt);
    const normalizedPayment = Number(payment);
    const normalizedAnnualRate = Number(annualInterestRate);
    const maxMonths = Number.isInteger(options.maxMonths) && options.maxMonths > 0
        ? options.maxMonths
        : MAX_SIMULATION_MONTHS;

    if (!Number.isFinite(normalizedDebt) || normalizedDebt <= 0) {
        throw new Error("Credit Product: долг должен быть больше нуля.");
    }

    if (!Number.isFinite(normalizedPayment) || normalizedPayment <= 0) {
        throw new Error("Credit Product: регулярный платеж должен быть больше нуля.");
    }

    if (!Number.isFinite(normalizedAnnualRate) || normalizedAnnualRate < 0) {
        throw new Error("Credit Product: процентная ставка не может быть отрицательной.");
    }

    const monthlyRate = normalizedAnnualRate / 100 / 12;
    let balance = normalizedDebt;
    let totalInterest = 0;
    let totalPaid = 0;
    let monthsToPayoff = 0;
    let firstMonthInterest = 0;

    while (balance > 0 && monthsToPayoff < maxMonths) {
        const interest = balance * monthlyRate;

        if (monthsToPayoff === 0) {
            firstMonthInterest = interest;
        }

        const scheduledPayment = normalizedPayment;
        const actualPayment = Math.min(scheduledPayment, balance + interest);

        balance = Math.max(0, balance + interest - actualPayment);
        totalInterest += interest;
        totalPaid += actualPayment;
        monthsToPayoff += 1;

        if (actualPayment <= interest && balance > 0) {
            return Object.freeze({
                debt: normalizedDebt,
                payment: normalizedPayment,
                annualInterestRate: normalizedAnnualRate,
                monthlyRate,
                firstMonthInterest,
                totalInterest: null,
                totalPaid: null,
                monthsToPayoff: null,
                payoffPossible: false,
                remainingBalance: balance
            });
        }
    }

    const payoffPossible = balance <= 0;

    return Object.freeze({
        debt: normalizedDebt,
        payment: normalizedPayment,
        annualInterestRate: normalizedAnnualRate,
        monthlyRate,
        firstMonthInterest,
        totalInterest: payoffPossible ? totalInterest : null,
        totalPaid: payoffPossible ? totalPaid : null,
        monthsToPayoff: payoffPossible ? monthsToPayoff : null,
        payoffPossible,
        remainingBalance: balance
    });
}

export { calculateCreditProduct, MAX_SIMULATION_MONTHS };
