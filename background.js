// n8n 웹훅 주소를 여기에 입력하세요
const N8N_WEBHOOK_URL = "https://n8n.bonik.net/webhook-test/ff_image2n8n";

// 우클릭 메뉴 생성
browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: "send-to-n8n",
        title: "이미지 업로드(to n8n)",
        contexts: ["image"]
    });
});

// 메뉴 클릭 시 실행
browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "send-to-n8n") {
        // 탭의 content.js에 우클릭된 이미지 주소를 보내 base64 변환을 요청
        browser.tabs.sendMessage(tab.id, {
            action: "convert_and_send",
            srcUrl: info.srcUrl
        });
    }
});

// content.js로부터 받은 base64 데이터를 n8n으로 POST 전송
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "upload_to_n8n") {
        fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                image_base64: message.data,
                filename: message.filename || "image_fx_.jpg"
            })
        })
            .then(response => {
                if (response.ok) {
                    console.log("n8n 전송 성공");
                } else {
                    console.error("n8n 전송 실패:", response.statusText);
                }
            })
            .catch(err => console.error("에러 발생:", err));
    }
});