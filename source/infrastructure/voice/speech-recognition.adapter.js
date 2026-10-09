// speech-recognition.adapter.js — Version 1.3
// Responsibility: wrap browser speech recognition; never persist or transmit audio from LifeGame code.

function createSpeechRecognition(handlers = {}) {
    if (typeof window === "undefined") return null;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (typeof Recognition !== "function") return null;

    let activeRecognition = null;

    function createRecognitionInstance() {
        const recognition = new Recognition();
        recognition.lang = "ru-RU";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        let resultReceived = false;
        let errorReported = false;
        let latestTranscript = "";

        recognition.onstart = () => {
            resultReceived = false;
            errorReported = false;
            latestTranscript = "";
            handlers.onStart?.();
        };

        recognition.onresult = (event) => {
            const transcripts = [];
            const startIndex = Number.isInteger(event.resultIndex) ? event.resultIndex : 0;

            for (let index = startIndex; index < (event.results?.length || 0); index++) {
                const result = event.results[index];
                const transcript = result?.[0]?.transcript?.trim();
                if (!transcript) continue;

                if (result?.isFinal === false) {
                    latestTranscript = transcript;
                    continue;
                }

                transcripts.push(transcript);
            }

            const transcript = transcripts.join(" ").trim();
            if (transcript) {
                resultReceived = true;
                latestTranscript = transcript;
                handlers.onResult?.(transcript);
            }
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
            // Some iOS WebKit sessions emit usable interim text but never mark it final.
            // Use the latest interim transcript only after the session ends, avoiding
            // partial form updates while the user is still speaking.
            if (!resultReceived && latestTranscript) {
                resultReceived = true;
                handlers.onResult?.(latestTranscript);
            }

            if (!resultReceived && !errorReported) {
                errorReported = true;
                handlers.onError?.("Safari завершил прослушивание без текста. Обновите страницу и попробуйте ещё раз.");
            }
            if (activeRecognition === recognition) activeRecognition = null;
            handlers.onEnd?.();
        };

        return recognition;
    }

    return Object.freeze({
        start() {
            if (activeRecognition) {
                handlers.onError?.("Распознавание уже запущено.");
                return;
            }

            // Create a fresh browser recognizer for each attempt. WebKit on some iOS
            // versions can leave a reused SpeechRecognition instance without results.
            const recognition = createRecognitionInstance();
            activeRecognition = recognition;

            try {
                recognition.start();
            } catch (error) {
                if (activeRecognition === recognition) activeRecognition = null;
                if (error?.name === "InvalidStateError") handlers.onError?.("Распознавание уже запущено.");
                else handlers.onError?.("Не удалось запустить микрофон. Попробуйте ещё раз.");
                handlers.onEnd?.();
            }
        }
    });
}

export { createSpeechRecognition };
