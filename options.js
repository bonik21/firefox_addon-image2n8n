document.addEventListener("DOMContentLoaded", () => {
    // Load saved settings
    browser.storage.local.get({
        webhookUrl: "",
        successAction: "popup",
        successUrl: "",
        failureAction: "popup",
        failureUrl: ""
    }).then(items => {
        document.getElementById("webhook-url").value = items.webhookUrl;
        document.getElementById("success-url").value = items.successUrl;
        document.getElementById("failure-url").value = items.failureUrl;

        // Select the correct radio buttons
        setRadioValue("successAction", items.successAction);
        setRadioValue("failureAction", items.failureAction);

        updateCardSelection("success");
        updateCardSelection("failure");
    }).catch(err => {
        console.error("설정 로드 에러:", err);
    });

    // Form submit
    document.getElementById("settings-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const saveButton = document.getElementById("btn-save");
        saveButton.disabled = true;

        const webhookUrl = document.getElementById("webhook-url").value.trim();
        const successAction = getRadioValue("successAction");
        const successUrl = document.getElementById("success-url").value.trim();
        const failureAction = getRadioValue("failureAction");
        const failureUrl = document.getElementById("failure-url").value.trim();

        browser.storage.local.set({
            webhookUrl,
            successAction,
            successUrl,
            failureAction,
            failureUrl
        }).then(() => {
            showStatus("설정이 성공적으로 저장되었습니다.", "success");
            saveButton.disabled = false;
        }).catch(err => {
            showStatus("설정 저장 중 오류가 발생했습니다: " + err, "error");
            saveButton.disabled = false;
        });
    });

    // Option cards selection logic
    const optionCards = document.querySelectorAll(".option-card");
    optionCards.forEach(card => {
        card.addEventListener("click", () => {
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;

            const group = card.dataset.group; // 'success' or 'failure'
            updateCardSelection(group);
        });
    });
});

function getRadioValue(name) {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : "";
}

function setRadioValue(name, value) {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
}

function updateCardSelection(group) {
    const cards = document.querySelectorAll(`.option-card[data-group="${group}"]`);
    cards.forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio.checked) {
            card.classList.add("selected");
        } else {
            card.classList.remove("selected");
        }
    });

    // Handle conditional URLs
    const selectedAction = getRadioValue(group + "Action");
    const urlWrapper = document.getElementById(group + "-url-wrapper");
    const urlInput = document.getElementById(group + "-url");

    if (selectedAction === "open_url") {
        urlWrapper.classList.add("show");
        urlInput.required = true;
    } else {
        urlWrapper.classList.remove("show");
        urlInput.required = false;
    }
}

function showStatus(message, type) {
    const statusMsg = document.getElementById("status-msg");
    const iconSuccess = document.getElementById("icon-success");
    const iconError = document.getElementById("icon-error");
    const statusText = document.getElementById("status-text");

    // 1. 타입에 따라 아이콘 노출 제어
    if (type === 'success') {
        iconSuccess.style.display = "inline-block";
        iconError.style.display = "none";
    } else {
        iconSuccess.style.display = "none";
        iconError.style.display = "inline-block";
    }

    // 2. 메시지는 innerHTML 대신 안전한 textContent로 주입 (★핵심)
    statusText.textContent = message;

    // 3. 클래스 부여 및 노출
    statusMsg.className = `status-msg show ${type}`;

    setTimeout(() => {
        statusMsg.classList.remove("show");
    }, 3000);
}
