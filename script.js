// ======================================================
// TELEGRAM
// ======================================================

const tg = window.Telegram?.WebApp;

if (!tg) {
    throw new Error("Telegram WebApp недоступен");
}

tg.ready();
tg.expand();

// ======================================================
// SESSION ID
// ======================================================

const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');

console.log('Session ID:', sessionId);

if (!sessionId) {
    console.warn('Session ID не найден в URL');
}

// ======================================================
// TELEGRAM INIT DATA
// ======================================================

const initData = tg.initData;

if (!initData) {
    throw new Error("Telegram initData отсутствует. Откройте приложение через Telegram.");
}

// ======================================================
// TELEGRAM USER
// ======================================================

const telegramId = tg.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;

const telegramIdElement = document.getElementById("telegramId");

if (telegramIdElement) {
    telegramIdElement.textContent = telegramId || "Не определён";
}

// ======================================================
// CANVAS
// ======================================================

const canvas = document.getElementById("signatureCanvas");

if (!canvas) {
    throw new Error("Canvas #signatureCanvas не найден");
}

const ctx = canvas.getContext("2d");
const placeholder = document.getElementById("placeholder");

let drawing = false;
let hasSignature = false;

// ======================================================
// CANVAS SETUP
// ======================================================

function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#17181a";
}

setupCanvas();

// ======================================================
// RESIZE
// ======================================================

let resizeTimer = null;

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (!drawing) {
            setupCanvas();
        }
    }, 200);
});

// ======================================================
// GET POSITION
// ======================================================

function getPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

// ======================================================
// START DRAWING
// ======================================================

canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    drawing = true;
    hasSignature = true;

    if (placeholder) {
        placeholder.style.display = "none";
    }

    try {
        canvas.setPointerCapture(event.pointerId);
    } catch (error) {
        console.warn("Pointer capture error:", error);
    }

    const { x, y } = getPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
});

// ======================================================
// DRAWING
// ======================================================

canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    event.preventDefault();

    const { x, y } = getPosition(event);
    ctx.lineTo(x, y);
    ctx.stroke();
});

// ======================================================
// STOP DRAWING
// ======================================================

function stopDrawing(event) {
    if (!drawing) return;
    event.preventDefault();
    drawing = false;
    ctx.closePath();

    try {
        canvas.releasePointerCapture(event.pointerId);
    } catch (error) {}
}

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

// ======================================================
// CLEAR SIGNATURE
// ======================================================

const clearButton = document.getElementById("clearBtn");

if (clearButton) {
    clearButton.addEventListener("click", clearCanvas);
}

function clearCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasSignature = false;

    if (placeholder) {
        placeholder.style.display = "flex";
    }
}

// ======================================================
// TOAST
// ======================================================

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// ======================================================
// SUCCESS MODAL
// ======================================================

const successModal = document.getElementById("successModal");
const successCloseBtn = document.getElementById("successCloseBtn");

function showSuccessModal() {
    if (!successModal) {
        console.warn("successModal не найден");
        return;
    }
    successModal.classList.add("show");
}

if (successCloseBtn) {
    successCloseBtn.addEventListener("click", () => {
        tg.close();
    });
}

// ======================================================
// SAVE BUTTON
// ======================================================

const saveButton = document.getElementById("saveBtn");
const saveText = document.getElementById("saveText");
const loader = document.getElementById("loader");

if (saveButton) {
    saveButton.addEventListener("click", saveSignature);
}

// ======================================================
// SAVE SIGNATURE
// ======================================================

async function saveSignature() {
    if (!telegramId) {
        showToast("Telegram ID не найден");
        return;
    }

    if (!hasSignature) {
        showToast("Сначала нарисуйте подпись");
        return;
    }

    saveButton.disabled = true;
    saveButton.classList.add("loading");

    if (saveText) {
        saveText.textContent = "Сохранение...";
    }

    if (loader) {
        loader.style.display = "inline-block";
    }

    try {
        console.log("================================");
        console.log("SAVE SIGNATURE");
        console.log("================================");
        console.log("Telegram ID:", telegramId);
        console.log("Session ID:", sessionId);

        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, "image/png", 1);
        });

        if (!blob) {
            throw new Error("Не удалось создать PNG");
        }

        console.log("PNG создан");
        console.log("Размер:", blob.size, "bytes");

        const formData = new FormData();
        formData.append("initData", initData);
        formData.append("signature", blob, "signature.png");

        if (sessionId) {
            formData.append("sessionId", sessionId);
        }

        const functionUrl = "https://rlclzghrupvskdgirbzo.supabase.co/functions/v1/save-signature";

        console.log("Отправляем запрос...");
        console.log("URL:", functionUrl);

        const response = await fetch(functionUrl, {
            method: "POST",
            body: formData
        });

        console.log("HTTP status:", response.status);

        let result;

        try {
            result = await response.json();
        } catch (error) {
            console.error("Response JSON error:", error);
            throw new Error("Supabase вернул некорректный ответ");
        }

        console.log("Supabase response:", result);

        if (!response.ok) {
            throw new Error(result?.error || `Ошибка сервера: ${response.status}`);
        }

        if (!result.success) {
            throw new Error(result?.error || "Не удалось сохранить подпись");
        }

        console.log("================================");
        console.log("SIGNATURE SAVED SUCCESSFULLY");
        console.log("Telegram ID:", result.telegram_id);
        console.log("Signature ID:", result.signature_id);
        console.log("Signature URL:", result.signature_url);
        console.log("================================");

        showSuccessModal();

    } catch (error) {
        console.error("================================");
        console.error("SAVE SIGNATURE ERROR");
        console.error(error);
        console.error("================================");

        showToast(error?.message || "Ошибка сохранения подписи");

    } finally {
        saveButton.disabled = false;
        saveButton.classList.remove("loading");

        if (saveText) {
            saveText.textContent = "Сохранить";
        }

        if (loader) {
            loader.style.display = "none";
        }
    }
}

// ======================================================
// CANCEL
// ======================================================

const cancelButton = document.getElementById("cancelBtn");

if (cancelButton) {
    cancelButton.addEventListener("click", () => {
        tg.close();
    });
}