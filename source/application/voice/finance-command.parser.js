// finance-command.parser.js — Version 1.3
// Responsibility: deterministic, AI-free extraction of a financial label and amount from recognized Russian speech.

const SCALE_WORDS = Object.freeze([
    { pattern: /миллиард(?:а|ов)?|миллиарде|миллиардом/i, value: 1_000_000_000 },
    { pattern: /миллион(?:а|ов)?|миллионе|миллионом|млн/i, value: 1_000_000 },
    { pattern: /тысяч(?:а|и|у|ей)?|тысяче|тысячей|тыс/i, value: 1_000 }
]);

const NUMBER_WORD_VALUES = Object.freeze({
    "ноль": 0, "нуль": 0,
    "один": 1, "одна": 1, "одно": 1, "одну": 1, "одного": 1, "одной": 1, "одном": 1, "одним": 1,
    "два": 2, "две": 2, "двух": 2, "двум": 2, "двумя": 2,
    "три": 3, "трёх": 3, "трех": 3, "тремя": 3,
    "четыре": 4, "четырёх": 4, "четырех": 4, "четырьмя": 4,
    "пять": 5, "пяти": 5, "пятью": 5,
    "шесть": 6, "шести": 6, "шестью": 6,
    "семь": 7, "семи": 7, "семью": 7,
    "восемь": 8, "восьми": 8, "восемью": 8,
    "девять": 9, "девяти": 9, "девятью": 9,
    "десять": 10, "десяти": 10,
    "одиннадцать": 11, "двенадцать": 12, "тринадцать": 13, "четырнадцать": 14,
    "пятнадцать": 15, "шестнадцать": 16, "семнадцать": 17, "восемнадцать": 18, "девятнадцать": 19,
    "двадцать": 20, "двадцати": 20, "тридцать": 30, "тридцати": 30,
    "сорок": 40, "сорока": 40, "пятьдесят": 50, "пятидесяти": 50,
    "шестьдесят": 60, "шестидесяти": 60, "семьдесят": 70, "семидесяти": 70,
    "восемьдесят": 80, "восьмидесяти": 80, "девяносто": 90, "девяноста": 90,
    "сто": 100, "ста": 100, "двести": 200, "трёхсот": 300, "трехсот": 300,
    "четыреста": 400, "четырёхсот": 400, "четырехсот": 400,
    "пятьсот": 500, "шестьсот": 600, "семьсот": 700, "восемьсот": 800, "девятьсот": 900,
    "полтора": 1.5, "полторы": 1.5, "полутора": 1.5
});

const NUMBER_WORD_PATTERN = Object.keys(NUMBER_WORD_VALUES)
    .sort((left, right) => right.length - left.length)
    .join("|");
const SCALE_PATTERN = "миллиард(?:а|ов)?|миллиарде|миллиардом|миллион(?:а|ов)?|миллионе|миллионом|млн|тысяч(?:а|и|у|ей)?|тысяче|тысячей|тыс";
const SPOKEN_AMOUNT_PATTERN = new RegExp(
    "(?:(?:" + NUMBER_WORD_PATTERN + ")(?:\\s+(?:(?:и)\\s+)?(?:" + NUMBER_WORD_PATTERN + ")){0,5}\\s+)?(?:" + SCALE_PATTERN + ")",
    "giu"
);

function parseNumberWords(words) {
    const tokens = words.toLocaleLowerCase("ru-RU").match(/[а-яё]+/giu) || [];
    if (!tokens.length) return 1;
    let total = 0;
    for (const token of tokens) {
        const value = NUMBER_WORD_VALUES[token];
        if (value === undefined) return null;
        total += value;
    }
    return total;
}

function parseAmountMatch(text) {
    const normalized = text.toLocaleLowerCase("ru-RU").replace(/\u00a0/g, " ").replace(/,/g, ".");
    const numericPattern = /(\d{1,3}(?:[ .\u00a0]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(миллиард(?:а|ов)?|миллионе|миллионом|миллион(?:а|ов)?|млн|тысяч(?:а|и|у|ей)?|тысяче|тысячей|тыс)?/i;
    const numeric = numericPattern.exec(normalized);

    if (numeric) {
        const base = Number(numeric[1].replace(/[ .\u00a0]/g, ""));
        const scale = SCALE_WORDS.find((item) => item.pattern.test(numeric[2] || ""));
        const amount = Math.round(base * (scale?.value || 1) * 100) / 100;
        if (Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(Math.round(amount * 100))) {
            return { amount, start: numeric.index, end: numeric.index + numeric[0].length };
        }
    }

    const spokenMatches = [];
    SPOKEN_AMOUNT_PATTERN.lastIndex = 0;
    let match;
    while ((match = SPOKEN_AMOUNT_PATTERN.exec(normalized)) !== null) {
        const fullText = match[0];
        const scale = SCALE_WORDS.find((item) => item.pattern.test(fullText));
        const scaleIndex = fullText.search(new RegExp(SCALE_PATTERN, "i"));
        const numberWords = scaleIndex >= 0 ? fullText.slice(0, scaleIndex).trim() : "";
        const base = parseNumberWords(numberWords);
        if (!scale || base === null || base <= 0) continue;
        spokenMatches.push({
            amount: Math.round(base * scale.value * 100) / 100,
            start: match.index,
            end: match.index + fullText.length
        });
        if (!fullText.length) SPOKEN_AMOUNT_PATTERN.lastIndex++;
    }

    if (!spokenMatches.length) return null;

    // Combine adjacent scale expressions such as "один миллион пятьсот тысяч".
    let combined = { ...spokenMatches[0] };
    for (let index = 1; index < spokenMatches.length; index++) {
        const next = spokenMatches[index];
        const gap = normalized.slice(combined.end, next.start);
        if (!/^\s+$/.test(gap)) break;
        combined.amount += next.amount;
        combined.end = next.end;
    }
    combined.amount = Math.round(combined.amount * 100) / 100;
    return Number.isSafeInteger(Math.round(combined.amount * 100)) ? combined : null;
}

function parseFinanceVoiceText(transcript) {
    if (typeof transcript !== "string" || !transcript.trim()) return null;
    const match = parseAmountMatch(transcript);
    if (!match) return null;

    let label = transcript.slice(0, match.start) + " " + transcript.slice(match.end);
    label = label
        .replace(/руб(?:ль|ля|лей)?|рубл(?:ь|я|ей)|₽|р\./giu, " ")
        .replace(/\b(?:российских|российский|российские)\b/giu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[,.;:—–-]+|[,.;:—–-]+$/g, "");

    label = label
        .replace(/^(?:я\s+)?(?:купил(?:а|и)?|приобр[её]л(?:а|и)?|покупаю|потратил(?:а|и)?|заплатил(?:а|и)?|добавь|добавить|вн[её]с(?:ла|ли)?|получил(?:а|и)?)\s+/iu, "")
        .replace(/\s+(?:за|на|около|примерно|стоимостью|ценой)$/iu, "")
        .replace(/^(?:за|на|около|примерно)\s+/iu, "")
        .trim();

    const commonLabels = Object.freeze({
        "машину": "Машина",
        "квартиру": "Квартира",
        "машины": "Машина",
        "квартиры": "Квартира"
    });
    const labelKey = label.toLocaleLowerCase("ru-RU");
    label = commonLabels[labelKey] || label;
    if (label) label = label.charAt(0).toLocaleUpperCase("ru-RU") + label.slice(1);

    return Object.freeze({ amount: match.amount, label: label || "Голосовая запись" });
}


function classifyFinanceVoiceCategory(transcript) {
    const text = String(transcript || "").toLocaleLowerCase("ru-RU");

    // Cyrillic-specific character classes are used because JavaScript's \\b and \\w
    // word-boundary semantics are ASCII-oriented and do not classify Russian words reliably.
    if (/(?:долг[а-яё]*|долж(?:ен|на|ны|но)(?![а-яё])|задолж[а-яё]*|кредит[а-яё]*|ипотек[а-яё]*|за[её]м[а-яё]*|одолжил[а-яё]*|плат[её]ж\s+по\s+кредиту)/iu.test(text)) {
        return "financial-burden";
    }

    if (/(?:зарплат[а-яё]*|аванс[а-яё]*|преми[а-яё]*|доход[а-яё]*|заработал[а-яё]*|выручк[а-яё]*|гонорар[а-яё]*|пенси[а-яё]*|стипенд[а-яё]*|дивиденд[а-яё]*|получил[аи]?\s+(?:деньги|оплату))/iu.test(text)) {
        return "actual-earnings";
    }

    if (/(?:аренд[а-яё]*|коммунал[а-яё]*|сч[её]т\s+за|оплатил[а-яё]*|заплатил[а-яё]*|потратил[а-яё]*|расход[а-яё]*|купил[аи]?\s+продукт[а-яё]*|бензин(?![а-яё])|топлив[а-яё]*|лекарств[а-яё]*|интернет(?![а-яё])|подписк[а-яё]*|страховк[а-яё]*|налог[а-яё]*)/iu.test(text)) {
        return "mandatory-expenses";
    }

    if (/(?:купил[а-яё]*|приобр[её]л[а-яё]*|покупаю(?![а-яё])|актив[а-яё]*|машин[а-яё]*|автомобил[а-яё]*|квартир[а-яё]*|недвижим[а-яё]*|дом(?![а-яё])|наличн[а-яё]*|банковск[а-яё]*\s+сч[её]т|вклад[а-яё]*|облигац[а-яё]*|инвестиц[а-яё]*)/iu.test(text)) {
        return "assets";
    }

    return null;
}

function isCreditProductLabel(label) {
    const text = String(label || "").toLocaleLowerCase("ru-RU").trim();
    return /(?:кредит[а-яё]*|ипотек[а-яё]*|рассрочк[а-яё]*|кредитн[а-яё]*\s+карт[а-яё]*)/iu.test(text);
}

function parseFinanceVoiceCommand(transcript) {
    const parsed = parseFinanceVoiceText(transcript);
    if (!parsed) return null;
    return Object.freeze({
        ...parsed,
        sectionId: classifyFinanceVoiceCategory(transcript)
    });
}

export { parseFinanceVoiceText, classifyFinanceVoiceCategory, parseFinanceVoiceCommand, isCreditProductLabel };
