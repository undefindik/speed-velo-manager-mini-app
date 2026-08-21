const SUPABASE_URL = "https://rlclzghrupvskdgirbzo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsY2x6Z2hydXB2c2tkZ2lyYnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MjIyMjcsImV4cCI6MjA5NzE5ODIyN30.ILZw1pxtGgGp2iShw23DeKhZ4JufqnPVa-n7Xu8Sjqs";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================
// Telegram
// ==========================

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


// ==========================
// Telegram ID
// ==========================

const params = new URLSearchParams(window.location.search);

let telegramId = params.get("telegram_id");

// Если ID не передали в URL,
// пробуем получить его из Telegram WebApp
if (!telegramId && tg?.initDataUnsafe?.user?.id) {
    telegramId = String(tg.initDataUnsafe.user.id);
}

const telegramIdElement = document.getElementById("telegramId");

telegramIdElement.textContent = telegramId || "Не определён";


// ==========================
// Canvas
// ==========================

const canvas = document.getElementById("signatureCanvas");
const ctx = canvas.getContext("2d");

const placeholder = document.getElementById("placeholder");

let drawing = false;
let hasSignature = false;


function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#17181a";
}

resizeCanvas();

window.addEventListener("resize", () => {
    // Если нужна поддержка resize без потери подписи,
    // здесь лучше сохранять изображение перед изменением canvas.
    resizeCanvas();
});


function getPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}


canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    hasSignature = true;

    placeholder.style.display = "none";

    canvas.setPointerCapture(event.pointerId);

    const { x, y } = getPosition(event);

    ctx.beginPath();
    ctx.moveTo(x, y);
});


canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;

    const { x, y } = getPosition(event);

    ctx.lineTo(x, y);
    ctx.stroke();
});


function stopDrawing() {
    drawing = false;
    ctx.closePath();
}

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);


// ==========================
// Очистить
// ==========================

document.getElementById("clearBtn").addEventListener("click", () => {
    clearCanvas();
});


function clearCanvas() {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    hasSignature = false;

    placeholder.style.display = "flex";
}


// ==========================
// Toast
// ==========================

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// ==========================
// Сохранение
// ==========================

const saveButton = document.getElementById("saveBtn");

saveButton.addEventListener("click", async () => {

    if (!telegramId) {
        showToast("Telegram ID не найден");
        return;
    }

    if (!hasSignature) {
        showToast("Сначала нарисуйте подпись");
        return;
    }

    saveButton.classList.add("loading");
    saveButton.disabled = true;

    try {

        // Получаем PNG
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, "image/png");
        });

        if (!blob) {
            throw new Error("Не удалось создать изображение");
        }


        // Уникальное имя файла
        const fileName =
            `${telegramId}/${Date.now()}.png`;


        // Загружаем подпись в Storage
        const { error: uploadError } =
            await supabaseClient.storage
                .from("signatures")
                .upload(fileName, blob, {
                    contentType: "image/png",
                    upsert: true
                });


        if (uploadError) {
            throw uploadError;
        }


        // Получаем публичную ссылку
        const {
            data: publicUrlData
        } = supabaseClient.storage
            .from("signatures")
            .getPublicUrl(fileName);


        const signatureUrl =
            publicUrlData.publicUrl;


        // Записываем данные в таблицу
        const { error: dbError } =
            await supabaseClient
                .from("signatures")
                .upsert({
                    telegram_id: telegramId,
                    signature_url: signatureUrl,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: "telegram_id"
                });


        if (dbError) {
            throw dbError;
        }


        showToast("Подпись сохранена");

        // Можно отправить результат Telegram-боту
        if (tg) {
            tg.sendData(JSON.stringify({
                telegram_id: telegramId,
                signature_url: signatureUrl
            }));

            setTimeout(() => {
                tg.close();
            }, 700);
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Ошибка сохранения подписи"
        );

    } finally {

        saveButton.classList.remove("loading");
        saveButton.disabled = false;
    }
});


// ==========================
// Отмена
// ==========================

document.getElementById("cancelBtn")
    .addEventListener("click", () => {

        if (tg) {
            tg.close();
        } else {
            window.history.back();
        }

    });