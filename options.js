document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("webhooks-container");
    const btnAdd = document.getElementById("btn-add-webhook");

    // Add new webhook on button click
    btnAdd.addEventListener("click", () => {
        const id = 'wh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        container.appendChild(createWebhookItemDOM(id));
    });

    // Load saved settings
    browser.storage.local.get({
        webhookUrl: "", // deprecated legacy single url
        webhooks: [],   // list of { id, name, url }
        successAction: "popup",
        successUrl: "",
        failureAction: "popup",
        failureUrl: "",
        sendExifData: false
    }).then(items => {
        document.getElementById("success-url").value = items.successUrl;
        document.getElementById("failure-url").value = items.failureUrl;

        // Handle Exif checkbox state
        const exifCheckbox = document.getElementById("sendExifData");
        const exifCard = document.getElementById("exif-option-card");
        if (exifCheckbox && exifCard) {
            exifCheckbox.checked = items.sendExifData;
            if (items.sendExifData) {
                exifCard.classList.add("selected");
            } else {
                exifCard.classList.remove("selected");
            }
        }

        // Select the correct radio buttons
        setRadioValue("successAction", items.successAction);
        setRadioValue("failureAction", items.failureAction);

        updateCardSelection("success");
        updateCardSelection("failure");

        // Load webhooks list
        let webhooks = items.webhooks;
        if (!webhooks || webhooks.length === 0) {
            // Check for legacy single webhookUrl and migrate
            if (items.webhookUrl) {
                webhooks = [{ id: "default", name: "이미지 업로드(to n8n)", url: items.webhookUrl }];
            } else {
                // Default placeholder
                webhooks = [{ id: "default", name: "이미지 업로드(to n8n)", url: "" }];
            }
        }

        container.textContent = ""; // Clear container safely
        webhooks.forEach(wh => {
            container.appendChild(createWebhookItemDOM(wh.id, wh.name, wh.url));
        });
    }).catch(err => {
        console.error("설정 로드 에러:", err);
    });

    // Form submit
    document.getElementById("settings-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const saveButton = document.getElementById("btn-save");
        saveButton.disabled = true;

        // Aggregate webhooks from DOM
        const webhookItems = container.querySelectorAll(".webhook-item");
        const webhooks = [];
        let isValid = true;

        webhookItems.forEach(item => {
            const id = item.dataset.id;
            const nameInput = item.querySelector(".webhook-name-input");
            const urlInput = item.querySelector(".webhook-url-input");
            
            const name = nameInput ? nameInput.value.trim() : "";
            const url = urlInput ? urlInput.value.trim() : "";

            if (!name || !url) {
                isValid = false;
                if (nameInput && !name) nameInput.focus();
                else if (urlInput && !url) urlInput.focus();
                return;
            }
            webhooks.push({ id, name, url });
        });

        if (!isValid) {
            showStatus("모든 기능 이름과 웹훅 URL을 입력해주세요.", "error");
            saveButton.disabled = false;
            return;
        }

        if (webhooks.length === 0) {
            showStatus("최소 하나의 웹훅 설정이 필요합니다.", "error");
            saveButton.disabled = false;
            return;
        }

        const successAction = getRadioValue("successAction");
        const successUrl = document.getElementById("success-url").value.trim();
        const failureAction = getRadioValue("failureAction");
        const failureUrl = document.getElementById("failure-url").value.trim();
        const sendExifData = document.getElementById("sendExifData") ? document.getElementById("sendExifData").checked : false;

        browser.storage.local.set({
            webhooks,
            successAction,
            successUrl,
            failureAction,
            failureUrl,
            sendExifData
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

    // Checkbox cards selection logic
    // label 요소이므로 브라우저가 자동으로 checkbox를 toggle함
    // change 이벤트로만 UI 상태를 반영
    const exifCard = document.getElementById("exif-option-card");
    const exifCheckbox = document.getElementById("sendExifData");
    if (exifCard && exifCheckbox) {
        exifCheckbox.addEventListener("change", () => {
            if (exifCheckbox.checked) {
                exifCard.classList.add("selected");
            } else {
                exifCard.classList.remove("selected");
            }
        });
    }
});

// Helper to create SVGs programmatically to avoid any innerHTML warnings
function createTrashSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("viewBox", "0 0 24 24");
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("d", "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16");
    
    svg.appendChild(path);
    return svg;
}

// Create webhook item DOM elements programmatically
function createWebhookItemDOM(id, name = "", url = "") {
    const item = document.createElement("div");
    item.className = "webhook-item";
    item.dataset.id = id;

    // Name field
    const nameField = document.createElement("div");
    nameField.className = "webhook-field";
    
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "기능 이름 (메뉴 표시 명칭)";
    
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "webhook-name-input";
    nameInput.placeholder = "예: 이미지 저장";
    nameInput.value = name;
    nameInput.required = true;
    
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameInput);

    // URL field
    const urlField = document.createElement("div");
    urlField.className = "webhook-field";
    
    const urlLabel = document.createElement("label");
    urlLabel.textContent = "n8n Webhook URL";
    
    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "webhook-url-input";
    urlInput.placeholder = "https://n8n.example.com/webhook/...";
    urlInput.value = url;
    urlInput.required = true;
    
    urlField.appendChild(urlLabel);
    urlField.appendChild(urlInput);

    // Delete Button
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-delete";
    deleteBtn.setAttribute("aria-label", "삭제");
    deleteBtn.appendChild(createTrashSVG());
    
    deleteBtn.addEventListener("click", () => {
        item.classList.add("removing");
        setTimeout(() => {
            item.remove();
        }, 300);
    });

    item.appendChild(nameField);
    item.appendChild(urlField);
    item.appendChild(deleteBtn);

    return item;
}

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

    // 2. 메시지 주입
    statusText.textContent = message;

    // 3. 클래스 부여 및 노출
    statusMsg.className = `status-msg show ${type}`;

    setTimeout(() => {
        statusMsg.classList.remove("show");
    }, 3000);
}
