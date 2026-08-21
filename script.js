// ==========================
// Telegram
// ==========================

const tg = window.Telegram?.WebApp;

if (!tg) {
    throw new Error("Telegram WebApp недоступен");
}

tg.ready();
tg.expand();


// ==========================
// Telegram initData
// ==========================

const initData = tg.initData;

if (!initData) {
    throw new Error(
        "Telegram initData отсутствует. Откройте приложение через Telegram."
    );
}

const telegramId =
    tg.initDataUnsafe?.user?.id;

const telegramIdElement =
    document.getElementById("telegramId");

if (telegramIdElement) {
    telegramIdElement.textContent =
        telegramId || "Не определён";
}


// ==========================
// Canvas
// ==========================

const canvas =
    document.getElementById("signatureCanvas");

const ctx =
    canvas.getContext("2d");

const placeholder =
    document.getElementById("placeholder");

let drawing = false;
let hasSignature = false;


// ==========================
// Canvas resize
// ==========================

function resizeCanvas() {

    const rect =
        canvas.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        rect.width * dpr;

    canvas.height =
        rect.height * dpr;

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#17181a";
}

resizeCanvas();

window.addEventListener(
    "resize",
    resizeCanvas
);


// ==========================
// Canvas position
// ==========================

function getPosition(event) {

    const rect =
        canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}


// ==========================
// Drawing
// ==========================

canvas.addEventListener(
    "pointerdown",
    (event) => {

        drawing = true;
        hasSignature = true;

        placeholder.style.display =
            "none";

        canvas.setPointerCapture(
            event.pointerId
        );

        const {
            x,
            y
        } = getPosition(event);

        ctx.beginPath();

        ctx.moveTo(
            x,
            y
        );
    }
);


canvas.addEventListener(
    "pointermove",
    (event) => {

        if (!drawing) {
            return;
        }

        const {
            x,
            y
        } = getPosition(event);

        ctx.lineTo(
            x,
            y
        );

        ctx.stroke();
    }
);


function stopDrawing() {

    drawing = false;

    ctx.closePath();
}


canvas.addEventListener(
    "pointerup",
    stopDrawing
);

canvas.addEventListener(
    "pointercancel",
    stopDrawing
);

canvas.addEventListener(
    "pointerleave",
    stopDrawing
);


// ==========================
// Clear
// ==========================

const clearButton =
    document.getElementById("clearBtn");

clearButton.addEventListener(
    "click",
    clearCanvas
);


function clearCanvas() {

    const rect =
        canvas.getBoundingClientRect();

    ctx.clearRect(
        0,
        0,
        rect.width,
        rect.height
    );

    hasSignature = false;

    placeholder.style.display =
        "flex";
}


// ==========================
// Toast
// ==========================

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 2500);
}


// ==========================
// Save
// ==========================

const saveButton =
    document.getElementById("saveBtn");


saveButton.addEventListener(
    "click",
    async () => {

        if (!hasSignature) {

            showToast(
                "Сначала нарисуйте подпись"
            );

            return;
        }


        saveButton.classList.add(
            "loading"
        );

        saveButton.disabled = true;


        try {

            console.log(
                "=============================="
            );

            console.log(
                "SAVE SIGNATURE"
            );

            console.log(
                "=============================="
            );


            // ==========================
            // Telegram
            // ==========================

            console.log(
                "Telegram initData exists:",
                Boolean(tg.initData)
            );

            console.log(
                "Telegram user:",
                tg.initDataUnsafe?.user
            );

            console.log(
                "Telegram ID:",
                tg.initDataUnsafe?.user?.id
            );


            if (!tg.initData) {

                throw new Error(
                    "Telegram initData отсутствует"
                );
            }


            // ==========================
            // PNG
            // ==========================

            const blob =
                await new Promise(
                    resolve => {

                        canvas.toBlob(
                            resolve,
                            "image/png"
                        );

                    }
                );


            if (!blob) {

                throw new Error(
                    "Не удалось создать PNG"
                );
            }


            console.log(
                "Signature type:",
                blob.type
            );

            console.log(
                "Signature size:",
                blob.size,
                "bytes"
            );


            // ==========================
            // Проверка размера
            // ==========================

            if (
                blob.size >
                2 * 1024 * 1024
            ) {

                throw new Error(
                    "Файл подписи больше 2 MB"
                );
            }


            // ==========================
            // FormData
            // ==========================

            const formData =
                new FormData();


            formData.append(
                "initData",
                tg.initData
            );


            formData.append(
                "signature",
                blob,
                "signature.png"
            );


            console.log(
                "FormData created"
            );


            // ==========================
            // Supabase Edge Function
            // ==========================

            const functionUrl =
                "https://rlclzghrupvskdgirbzo.supabase.co/functions/v1/save-signature";


            console.log(
                "Sending request:"
            );

            console.log(
                functionUrl
            );


            const response =
                await fetch(
                    functionUrl,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            // ==========================
            // HTTP
            // ==========================

            console.log(
                "HTTP status:",
                response.status
            );

            console.log(
                "HTTP OK:",
                response.ok
            );


            // ==========================
            // Response
            // ==========================

            const responseText =
                await response.text();


            console.log(
                "Raw Supabase response:"
            );

            console.log(
                responseText
            );


            let result;

            try {

                result =
                    JSON.parse(
                        responseText
                    );

            } catch {

                throw new Error(
                    "Supabase вернул не JSON: " +
                    responseText
                );
            }


            console.log(
                "Parsed Supabase result:"
            );

            console.log(
                result
            );


            // ==========================
            // Error
            // ==========================

            if (!response.ok) {

                throw new Error(
                    result.error ||
                    `HTTP ошибка ${response.status}`
                );
            }


            if (
                result.success !== true
            ) {

                throw new Error(
                    result.error ||
                    "Supabase не подтвердил сохранение"
                );
            }


            // ==========================
            // Success
            // ==========================

            console.log(
                "=============================="
            );

            console.log(
                "SIGNATURE SAVED"
            );

            console.log(
                "Telegram ID:",
                result.telegram_id
            );

            console.log(
                "Signature URL:",
                result.signature_url
            );

            console.log(
                "=============================="
            );


            showToast(
                "Подпись сохранена"
            );


            // ==========================
            // Send result to Telegram
            // ==========================

            if (
                typeof tg.sendData ===
                "function"
            ) {

                tg.sendData(
                    JSON.stringify({
                        telegram_id:
                            result.telegram_id,

                        signature_url:
                            result.signature_url
                    })
                );

            }


            // ==========================
            // Close
            // ==========================

            setTimeout(() => {

                tg.close();

            }, 700);


        } catch (error) {

            console.error(
                "=============================="
            );

            console.error(
                "SAVE ERROR"
            );

            console.error(
                error
            );

            console.error(
                "=============================="
            );


            showToast(
                error?.message ||
                "Ошибка сохранения подписи"
            );


        } finally {

            saveButton.classList.remove(
                "loading"
            );

            saveButton.disabled =
                false;
        }
    }
);


// ==========================
// Cancel
// ==========================

const cancelButton =
    document.getElementById("cancelBtn");

cancelButton.addEventListener(
    "click",
    () => {

        tg.close();

    }
);