// dynamic context menus helper
function updateContextMenus() {
    browser.contextMenus.removeAll().then(() => {
        browser.storage.local.get({
            webhookUrl: "", // legacy single url support
            webhooks: []    // list of { id, name, url }
        }).then(items => {
            let webhooks = items.webhooks;
            if (!webhooks || webhooks.length === 0) {
                // If there's a legacy URL, migrate it temporarily in menus
                if (items.webhookUrl) {
                    webhooks = [{ id: "default", name: "이미지 업로드(to n8n)", url: items.webhookUrl }];
                }
            }

            if (webhooks.length === 0) {
                // No webhooks configured! Add a helper setup menu
                browser.contextMenus.create({
                    id: "setup-image2n8n",
                    title: "n8n 웹훅 설정하기",
                    contexts: ["image"]
                });
            } else {
                webhooks.forEach((wh, index) => {
                    browser.contextMenus.create({
                        id: `send-to-n8n-${wh.id}`,
                        title: wh.name || `n8n 전송 ${index + 1}`,
                        contexts: ["image"]
                    });
                });
            }
        }).catch(err => {
            console.error("메뉴 구성 중 스토리지 로드 에러:", err);
        });
    });
}

// Run menu generation on installation/update
browser.runtime.onInstalled.addListener(() => {
    updateContextMenus();
});

// Run menu generation on startup (when browser starts)
browser.runtime.onStartup.addListener(() => {
    updateContextMenus();
});

// Run immediately when service worker/background script is loaded
updateContextMenus();

// Listen for storage changes to sync context menus instantly
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && (changes.webhooks || changes.webhookUrl)) {
        updateContextMenus();
    }
});

// 메뉴 클릭 시 실행
browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "setup-image2n8n") {
        browser.runtime.openOptionsPage();
        return;
    }

    if (info.menuItemId.startsWith("send-to-n8n-")) {
        const webhookId = info.menuItemId.replace("send-to-n8n-", "");

        // Webhook URL이 설정되어 있는지 확인
        browser.storage.local.get({
            webhookUrl: "", // legacy
            webhooks: []
        }).then(settings => {
            let webhooks = settings.webhooks;
            if ((!webhooks || webhooks.length === 0) && settings.webhookUrl && webhookId === "default") {
                webhooks = [{ id: "default", name: "이미지 업로드(to n8n)", url: settings.webhookUrl }];
            }

            const targetWebhook = webhooks.find(wh => wh.id === webhookId);
            if (!targetWebhook || !targetWebhook.url) {
                browser.runtime.openOptionsPage();
                sendToast(tab.id, "error", "설정 필요", "웹훅 URL 설정이 올바르지 않습니다.");
                return;
            }

            // 탭의 content.js에 우클릭된 이미지 주소를 보내 base64 변환을 요청
            browser.tabs.sendMessage(tab.id, {
                action: "convert_and_send",
                srcUrl: info.srcUrl,
                webhookId: webhookId
            }).catch(err => {
                console.error("Content script로 메시지 전송 실패:", err);
            });
        });
    }
});

// content.js로부터 받은 base64 데이터를 n8n으로 POST 전송
browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "upload_to_n8n") {
        const tabId = sender.tab ? sender.tab.id : null;
        const webhookId = message.webhookId;

        browser.storage.local.get({
            webhookUrl: "", // legacy
            webhooks: [],
            successAction: "popup",
            successUrl: "",
            failureAction: "popup",
            failureUrl: ""
        }).then(settings => {
            let webhooks = settings.webhooks;
            if (!webhooks || webhooks.length === 0) {
                if (settings.webhookUrl) {
                    webhooks = [{ id: "default", name: "이미지 업로드(to n8n)", url: settings.webhookUrl }];
                }
            }

            // Find target webhook
            let targetWebhook = null;
            if (webhookId) {
                targetWebhook = webhooks.find(wh => wh.id === webhookId);
            } else if (webhooks.length > 0) {
                targetWebhook = webhooks[0];
            }

            if (!targetWebhook || !targetWebhook.url) {
                browser.runtime.openOptionsPage();
                sendToast(tabId, "error", "설정 필요", "사용 가능한 n8n Webhook URL 설정이 없습니다.");
                return;
            }

            // 업로드 중 임을 알리는 Toast 표시
            sendToast(tabId, "info", "업로드 중...", `[${targetWebhook.name}] 이미지를 전송하는 중입니다.`);

            fetch(targetWebhook.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    image_base64: message.data,
                    filename: message.filename || "image_fx_.jpg",
                    page_url: message.pageUrl
                })
            })
            .then(async response => {
                if (response.ok) {
                    console.log("n8n 전송 성공");
                    const responseText = await response.text();

                    // 성공 시 동작 처리
                    if (settings.successAction === "popup") {
                        sendToast(tabId, "success", "업로드 성공", `[${targetWebhook.name}] 이미지가 성공적으로 전송되었습니다.`);
                    } else if (settings.successAction === "response") {
                        sendToast(tabId, "success", "업로드 완료 (응답)", responseText || "응답 내용이 없습니다.");
                    } else if (settings.successAction === "open_url") {
                        browser.tabs.create({ url: settings.successUrl });
                        sendToast(tabId, "success", "업로드 성공", `[${targetWebhook.name}] 업로드 성공으로 링크를 엽니다.`);
                    }
                } else {
                    const errorText = await response.text();
                    console.error("n8n 전송 실패:", response.status, response.statusText, errorText);
                    handleFailure(tabId, settings, `HTTP ${response.status} Error`, errorText || response.statusText);
                }
            })
            .catch(err => {
                console.error("에러 발생:", err);
                handleFailure(tabId, settings, "네트워크 오류", err.message);
            });
        });
    }
});

// Toast 메시지 전송 헬퍼 함수
function sendToast(tabId, type, title, message) {
    if (!tabId) return;
    browser.tabs.sendMessage(tabId, {
        action: "show_toast",
        type: type,
        title: title,
        message: message
    }).catch(err => {
        // 탭이 닫히거나 스크립트 미실행 시 에러 무시
        console.warn("Toast 전송 무시됨:", err.message);
    });
}

// 실패 시 동작 처리 헬퍼 함수
function handleFailure(tabId, settings, summary, detail) {
    if (settings.failureAction === "popup") {
        sendToast(tabId, "error", "업로드 실패", `오류: ${summary}`);
    } else if (settings.failureAction === "response") {
        sendToast(tabId, "error", "업로드 에러 (응답)", `${summary}\n상세: ${detail}`);
    } else if (settings.failureAction === "open_url") {
        browser.tabs.create({ url: settings.failureUrl });
        sendToast(tabId, "error", "업로드 실패", "에러 발생으로 페이지로 이동합니다.");
    }
}