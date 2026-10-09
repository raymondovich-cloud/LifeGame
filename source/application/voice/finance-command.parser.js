// finance-command.parser.js — Version 1.0
// Responsibility: deterministic, AI-free extraction of a financial label and amount from recognized Russian speech.

const MULTIPLIERS = Object.freeze([
    { pattern: /миллиард(?:а|ов)?/i, value: 1_000_000_000 },
    { pattern: /миллион(?:а|ов)?|млн/i, value: 1_000_000 },
    { pattern: /тысяч(?:а|и|у|ей)?|тыс/i, value: 1_000 }
]);

function parseAmount(text) {
    const normalized = text.toLocaleLowerCase("ru-RU").replace(/\u00a0/g, " ").replace(/,/g, ".");
    const match = normalized.match(/(\d{1,3}(?:[ \u00a0]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(миллиард(?:а|ов)?|миллион(?:а|ов)?|млн|тысяч(?:а|и|у|ей)?|тыс)?/i);
    if (!match) return null;
    const base = Number(match[1].replace(/[ \u00a0]/g, ""));
    if (!Number.isFinite(base) || base <= 0) return null;
    const suffix = match[2] || "";
    const multiplier = MULTIPLIERS.find((item) => item.pattern.test(suffix))?.value || 1;
    const amount = Math.round(base * multiplier * 100) / 100;
    return Number.isSafeInteger(Math.round(amount * 100)) ? amount : null;
}

function parseFinanceVoiceText(transcript) {
    if (typeof transcript !== "string" || !transcript.trim()) return null;
    const amount = parseAmount(transcript);
    if (amount === null) return null;
    const label = transcript
        .replace(/\d{1,3}(?:[ \u00a0]\d{3})+(?:[,.]\d+)?|\d+(?:[,.]\d+)?\s*(?:миллиард(?:а|ов)?|миллион(?:а|ов)?|млн|тысяч(?:а|и|у|ей)?|тыс)?/i, " ")
        .replace(/руб(?:ль|ля|лей)?|₽|р\./gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[,.;:—–-]+|[,.;:—–-]+$/g, "");
    return Object.freeze({ amount, label: label || "Голосовая запись" });
}

export { parseFinanceVoiceText };
