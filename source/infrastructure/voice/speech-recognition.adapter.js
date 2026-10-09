// speech-recognition.adapter.js — Version 1.0
// Responsibility: wrap browser speech recognition; never persist or transmit audio from LifeGame code.

function createSpeechRecognition(handlers = {}) {
    if (typeof window === "undefined") return null;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof Recognition !== "function") return null;

    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => handlers.onStart?.();
    recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) handlers.onResult?.(transcript);
        else handlers.onError?.("Не удалось распознать речь. Попробуйте ещё раз.");
    };
    recognition.onerror = (event) => {
        const messages = {
            "not-allowed": "Нет доступа к микрофону. Разрешите доступ в настройках браузера.",
            "service-not-allowed": "Служба распознавания речи недоступна.",
            "no-speech": "Речь не обнаружена. Попробуйте произнести фразу ещё раз.",
            "network": "Браузер сообщил об ошибке службы распознавания речи."
        };
        handlers.onError?.(messages[event.error] || "Не удалось распознать речь. Можно ввести данные вручную.");
    };
    recognition.onend = () => handlers.onEnd?.();

    return Object.freeze({
        start() {
            try { recognition.start(); }
            catch (error) {
                if (error?.name === "InvalidStateError") handlers.onError?.("Распознавание уже запущено.");
                else handlers.onError?.("Не удалось запустить микрофон. Попробуйте ещё раз.");
            }
        }
    });
}

export { createSpeechRecognition };
