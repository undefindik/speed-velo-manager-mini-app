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

// Используем только для отображения.
// Для проверки сервер использует tg.initData.
const telegramId = tg.initDataUnsafe?.user?.id;

const telegramIdElement =
    document.getElementById("telegramId");

telegramIdElement.textContent =
    telegramId || "Не определён";


// ==========================
// Canvas
// ==========================

const canvas =
    document.getElementById("signatureCanvas");

const ctx = canvas.getContext("2d");

const placeholder =
    document.getElementById("placeholder");

let drawing = false;
let hasSignature = false;


function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#17181a";
}

resizeCanvas();

window.addEventListener("resize", () => {
    resizeCanvas();
});


function getPosition(event) {
    const rect =
        canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}


canvas.addEventListener(
    "pointerdown",
    (event) => {

        drawing = true;
        hasSignature = true;

        placeholder.style.display = "none";

        canvas.setPointerCapture(
            event.pointerId
        );

        const { x, y } =
            getPosition(event);

        ctx.beginPath();
        ctx.moveTo(x, y);
    }
);


canvas.addEventListener(
    "pointermove",
    (event) => {

        if (!drawing) return;

        const { x, y } =
            getPosition(event);

        ctx.lineTo(x, y);
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
// Очистить
// ==========================

document
    .getElementById("clearBtn")
    .addEventListener("click", () => {

        clearCanvas();
    });


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

    placeholder.style.display = "flex";
}


// ==========================
// Toast
// ==========================

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


// ==========================
// Сохранение
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

            // Получаем PNG
            const blob =
                await new Promise(resolve => {

                    canvas.toBlob(
                        resolve,
                        "image/png"
                    );

                });


            if (!blob) {

                throw new Error(
                    "Не удалось создать изображение"
                );
            }


            // ==========================
            // Отправляем в Supabase
            // Edge Function
            // ==========================

            const formData =
                new FormData();


            // ВАЖНО:
            // Здесь передаём настоящий
            // подписанный Telegram initData

            formData.append(
                "initData",
                tg.initData
            );


            formData.append(
                "signature",
                blob,
                "signature.png"
            );


            const response =
                await fetch(
                    "https://rlclzghrupvskdgirbzo.supabase.co/functions/v1/save-signature",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Ошибка сохранения"
                );
            }


            console.log(
                "Signature saved:",
                result
            );


            showToast(
                "Подпись сохранена"
            );


            // ==========================
            // Отправляем результат боту
            // ==========================

            tg.sendData(
                JSON.stringify({
                    telegram_id:
                        result.telegram_id,

                    signature_url:
                        result.signature_url
                })
            );


            setTimeout(() => {

                tg.close();

            }, 700);


        } catch (error) {

            console.error(
                "Save signature error:",
                error
            );


            showToast(
                error.message ||
                "Ошибка сохранения подписи"
            );


        } finally {

            saveButton.classList.remove(
                "loading"
            );

            saveButton.disabled = false;
        }
    }
);


// ==========================
// Отмена
// ==========================

document
    .getElementById("cancelBtn")
    .addEventListener(
        "click",
        () => {

            tg.close();

        }
    );