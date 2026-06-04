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
    statusMsg.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            ${type === 'success' 
                ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>' 
                : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>'}
        </svg>
        ${message}
    `;
    statusMsg.className = `status-msg show ${type}`;
    
    setTimeout(() => {
        statusMsg.classList.remove("show");
    }, 3000);
}
