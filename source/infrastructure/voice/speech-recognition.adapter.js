// speech-recognition.adapter.js — Version 1.1
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

    let resultReceived = false;
    let errorReported = false;

    recognition.onstart = () => {
        resultReceived = false;
        errorReported = false;
        handlers.onStart?.();
    };

    recognition.onresult = (event) => {
        const transcripts = [];
        const startIndex = Number.isInteger(event.resultIndex) ? event.resultIndex : 0;

        for (let index = startIndex; index < (event.results?.length || 0); index++) {
            const result = event.results[index];
            if (result?.isFinal === false) continue;
            const transcript = result?.[0]?.transcript?.trim();
            if (transcript) transcripts.push(transcript);
        }

        const transcript = transcripts.join(" ").trim();
        if (transcript) {
            resultReceived = true;
            handlers.onResult?.(transcript);
            return;
        }

        errorReported = true;
        handlers.onError?.("Safari завершил распознавание, но не передал текст. Попробуйте ещё раз и говорите сразу после появления «Слушаю…».");
    };

    recognition.onerror = (event) => {
        errorReported = true;
        const messages = {
            "not-allowed": "Нет доступа к микрофону. Разрешите доступ в настройках браузера.",
            "service-not-allowed": "Служба распознавания речи недоступна.",
            "no-speech": "Safari не услышал речь. Нажмите ещё раз и начните говорить после появления «Слушаю…».",
            "network": "Браузер сообщил об ошибке службы распознавания речи. Проверьте соединение и попробуйте ещё раз."
        };
        handlers.onError?.(messages[event.error] || "Не удалось распознать речь. Можно ввести данные вручную.");
    };

    recognition.onend = () => {
        if (!resultReceived && !errorReported) {
            errorReported = true;
            handlers.onError?.("Прослушивание завершилось без результата распознавания. Попробуйте ещё раз и говорите сразу после появления «Слушаю…».");
        }
        handlers.onEnd?.();
    };

    return Object.freeze({
        start() {
            resultReceived = false;
            errorReported = false;
            try {
                recognition.start();
            } catch (error) {
                errorReported = true;
                if (error?.name === "InvalidStateError") handlers.onError?.("Распознавание уже запущено.");
                else handlers.onError?.("Не удалось запустить микрофон. Попробуйте ещё раз.");
                handlers.onEnd?.();
            }
        }
    });
}

export { createSpeechRecognition };
