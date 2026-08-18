document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("webhooks-container");
    const btnAdd = document.getElementById("btn-add-webhook");

    // Add new webhook on button click
    btnAdd.addEventListener("click", () => {
        const id = 'wh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        container.appendChild(createWebhookItemDOM(id));
    });

    // State variables for badge customization
    let currentBadgeSize = "medium";
    let currentBadgePosition = "top-right";

    const badgeOpacitySlider = document.getElementById("badgeOpacity");
    const opacityLabel = document.getElementById("opacity-val-label");
    const previewBadge = document.getElementById("preview-badge");
    const badgeSubSettings = document.getElementById("badge-sub-settings");

    function updateBadgePreview() {
        if (!previewBadge) return;
        const opacity = badgeOpacitySlider ? parseFloat(badgeOpacitySlider.value) : 0.8;
        if (opacityLabel) opacityLabel.textContent = Math.round(opacity * 100) + "%";
        previewBadge.style.opacity = opacity;

        // Size mapping
        let sizePx = 30;
        let iconSizePx = 16;
        if (currentBadgeSize === "small") { sizePx = 24; iconSizePx = 13; }
        else if (currentBadgeSize === "large") { sizePx = 38; iconSizePx = 20; }

        previewBadge.style.width = sizePx + "px";
        previewBadge.style.height = sizePx + "px";

        const icon = document.getElementById("preview-badge-icon");
        if (icon) {
            icon.setAttribute("width", iconSizePx);
            icon.setAttribute("height", iconSizePx);
        }

        // Position classes
        previewBadge.className = `preview-badge preview-badge-${currentBadgePosition}`;

        // Toggle sub settings visibility based on badge mode
        const mode = getRadioValue("badgeMode");
        if (badgeSubSettings) {
            badgeSubSettings.style.display = mode === "never" ? "none" : "flex";
        }
    }

    if (badgeOpacitySlider) {
        badgeOpacitySlider.addEventListener("input", updateBadgePreview);
    }

    // Segmented button listeners
    document.querySelectorAll(".segment-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.dataset.type;
            const val = btn.dataset.val;
            const parent = btn.parentElement;

            parent.querySelectorAll(".segment-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            if (type === "badgeSize") {
                currentBadgeSize = val;
            } else if (type === "badgePosition") {
                currentBadgePosition = val;
            }
            updateBadgePreview();
        });
    });

    // Display extension version
    try {
        const manifest = browser.runtime.getManifest();
        const versionEl = document.getElementById("app-version");
        if (versionEl && manifest && manifest.version) {
            versionEl.textContent = `v${manifest.version}`;
        }
    } catch (e) {}

    // Load saved settings
    browser.storage.local.get({
        webhookUrl: "", // deprecated legacy single url
        webhooks: [],   // list of { id, name, url, basicAuthEnabled, basicAuthId, basicAuthPw }
        successAction: "popup",
        successUrl: "",
        failureAction: "popup",
        failureUrl: "",
        sendExifData: false,
        sendFileName: true,
        badgeMode: "always",
        badgeOpacity: 0.8,
        badgeSize: "medium",
        badgePosition: "top-right",
        minImageWidth: 50,
        minImageHeight: 50,
        ignoredExtensions: ""
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

        // Handle Filename checkbox state
        const filenameCheckbox = document.getElementById("sendFileName");
        const filenameCard = document.getElementById("filename-option-card");
        if (filenameCheckbox && filenameCard) {
            filenameCheckbox.checked = items.sendFileName;
            if (items.sendFileName) {
                filenameCard.classList.add("selected");
            } else {
                filenameCard.classList.remove("selected");
            }
        }

        // Badge settings
        currentBadgeSize = items.badgeSize || "medium";
        currentBadgePosition = items.badgePosition || "top-right";
        if (badgeOpacitySlider) {
            badgeOpacitySlider.value = items.badgeOpacity !== undefined ? items.badgeOpacity : 0.8;
        }

        // Image Filter settings
        const widthEl = document.getElementById("minImageWidth");
        if (widthEl) widthEl.value = items.minImageWidth !== undefined ? items.minImageWidth : 50;
        
        const heightEl = document.getElementById("minImageHeight");
        if (heightEl) heightEl.value = items.minImageHeight !== undefined ? items.minImageHeight : 50;

        const extEl = document.getElementById("ignoredExtensions");
        if (extEl) extEl.value = items.ignoredExtensions || "";

        // Update active classes on segmented buttons
        document.querySelectorAll(`.segment-btn[data-type="badgeSize"]`).forEach(b => {
            b.classList.toggle("active", b.dataset.val === currentBadgeSize);
        });
        document.querySelectorAll(`.segment-btn[data-type="badgePosition"]`).forEach(b => {
            b.classList.toggle("active", b.dataset.val === currentBadgePosition);
        });

        // Select the correct radio buttons
        setRadioValue("successAction", items.successAction);
        setRadioValue("failureAction", items.failureAction);
        setRadioValue("badgeMode", items.badgeMode || "always");

        updateCardSelection("success");
        updateCardSelection("failure");
        updateCardSelection("badge");
        updateBadgePreview();

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
            container.appendChild(createWebhookItemDOM(wh.id, wh.name, wh.url, wh.basicAuthEnabled, wh.basicAuthId, wh.basicAuthPw));
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
            const authCheckboxEl = item.querySelector(".webhook-auth-checkbox");
            const authIdInput = item.querySelector(".webhook-auth-id");
            const authPwInput = item.querySelector(".webhook-auth-pw");

            const name = nameInput ? nameInput.value.trim() : "";
            const url = urlInput ? urlInput.value.trim() : "";
            const basicAuthEnabled = authCheckboxEl ? authCheckboxEl.checked : false;
            const basicAuthId = authIdInput ? authIdInput.value.trim() : "";
            const basicAuthPw = authPwInput ? authPwInput.value.trim() : "";

            if (!name || !url) {
                isValid = false;
                if (nameInput && !name) nameInput.focus();
                else if (urlInput && !url) urlInput.focus();
                return;
            }
            webhooks.push({ id, name, url, basicAuthEnabled, basicAuthId, basicAuthPw });
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
        const sendFileName = document.getElementById("sendFileName") ? document.getElementById("sendFileName").checked : false;
        const badgeMode = getRadioValue("badgeMode") || "always";
        const badgeOpacity = badgeOpacitySlider ? parseFloat(badgeOpacitySlider.value) : 0.8;
        const badgeSize = currentBadgeSize || "medium";
        const badgePosition = currentBadgePosition || "top-right";

        const widthEl = document.getElementById("minImageWidth");
        const heightEl = document.getElementById("minImageHeight");
        const extEl = document.getElementById("ignoredExtensions");
        
        const minImageWidth = widthEl ? parseInt(widthEl.value, 10) || 0 : 50;
        const minImageHeight = heightEl ? parseInt(heightEl.value, 10) || 0 : 50;
        const ignoredExtensions = extEl ? extEl.value.trim() : "";

        browser.storage.local.set({
            webhooks,
            successAction,
            successUrl,
            failureAction,
            failureUrl,
            sendExifData,
            sendFileName,
            badgeMode,
            badgeOpacity,
            badgeSize,
            badgePosition,
            minImageWidth,
            minImageHeight,
            ignoredExtensions
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

            const group = card.dataset.group; // 'success' or 'failure' or 'badge'
            updateCardSelection(group);
            if (group === "badge") {
                updateBadgePreview();
            }
        });
    });

    // Checkbox cards selection logic
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

    const filenameCard = document.getElementById("filename-option-card");
    const filenameCheckbox = document.getElementById("sendFileName");
    if (filenameCard && filenameCheckbox) {
        filenameCheckbox.addEventListener("change", () => {
            if (filenameCheckbox.checked) {
                filenameCard.classList.add("selected");
            } else {
                filenameCard.classList.remove("selected");
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
function createWebhookItemDOM(id, name = "", url = "", basicAuthEnabled = false, basicAuthId = "", basicAuthPw = "") {
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

    // Basic Auth Section (per-webhook)
    const authSection = document.createElement("div");
    authSection.className = "webhook-auth-section" + (basicAuthEnabled ? " enabled" : "");

    const authToggle = document.createElement("label");
    authToggle.className = "webhook-auth-toggle";

    const authCheckboxEl = document.createElement("input");
    authCheckboxEl.type = "checkbox";
    authCheckboxEl.className = "webhook-auth-checkbox";
    authCheckboxEl.checked = basicAuthEnabled;

    const authCheckboxBox = document.createElement("div");
    authCheckboxBox.className = "webhook-auth-checkbox-box";

    const authToggleLabel = document.createElement("span");
    authToggleLabel.className = "webhook-auth-toggle-label";
    authToggleLabel.textContent = "각 웹훅 Basic Auth 인증 (HTTP Basic Authentication)";

    authCheckboxEl.addEventListener("change", () => {
        if (authCheckboxEl.checked) {
            authSection.classList.add("enabled");
            authFieldsDiv.classList.add("show");
        } else {
            authSection.classList.remove("enabled");
            authFieldsDiv.classList.remove("show");
        }
    });

    authToggle.appendChild(authCheckboxEl);
    authToggle.appendChild(authCheckboxBox);
    authToggle.appendChild(authToggleLabel);

    const authFieldsDiv = document.createElement("div");
    authFieldsDiv.className = "webhook-auth-fields" + (basicAuthEnabled ? " show" : "");

    // Auth ID field
    const authIdField = document.createElement("div");
    authIdField.className = "webhook-auth-field";
    const authIdLabel = document.createElement("label");
    authIdLabel.className = "webhook-auth-field-label";
    authIdLabel.textContent = "인증 ID (Username)";
    const authIdInput = document.createElement("input");
    authIdInput.type = "text";
    authIdInput.className = "webhook-auth-id";
    authIdInput.placeholder = "Basic Auth ID";
    authIdInput.value = basicAuthId;
    authIdInput.autocomplete = "username";
    authIdField.appendChild(authIdLabel);
    authIdField.appendChild(authIdInput);

    // Auth PW field
    const authPwField = document.createElement("div");
    authPwField.className = "webhook-auth-field";
    const authPwLabel = document.createElement("label");
    authPwLabel.className = "webhook-auth-field-label";
    authPwLabel.textContent = "인증 PW (Password)";
    const authPwInput = document.createElement("input");
    authPwInput.type = "password";
    authPwInput.className = "webhook-auth-pw";
    authPwInput.placeholder = "Basic Auth Password";
    authPwInput.value = basicAuthPw;
    authPwInput.autocomplete = "current-password";
    authPwField.appendChild(authPwLabel);
    authPwField.appendChild(authPwInput);

    authFieldsDiv.appendChild(authIdField);
    authFieldsDiv.appendChild(authPwField);
    authSection.appendChild(authToggle);
    authSection.appendChild(authFieldsDiv);

    item.appendChild(nameField);
    item.appendChild(urlField);
    item.appendChild(deleteBtn);
    item.appendChild(authSection);

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

    // Handle conditional URLs only for groups that have url inputs
    const urlWrapper = document.getElementById(group + "-url-wrapper");
    const urlInput = document.getElementById(group + "-url");

    if (urlWrapper && urlInput) {
        const selectedAction = getRadioValue(group + "Action");
        if (selectedAction === "open_url") {
            urlWrapper.classList.add("show");
            urlInput.required = true;
        } else {
            urlWrapper.classList.remove("show");
            urlInput.required = false;
        }
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
