browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "show_toast") {
        showToastNotification(request.type, request.title, request.message);
    } else if (request.action === "convert_and_send") {
        const srcUrl = request.srcUrl;

        // 현재 페이지에서 해당 src를 가진 이미지 요소를 찾거나 직접 fetch 시도
        fetch(srcUrl)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // reader.result는 "data:image/jpeg;base64,..." 형태입니다.
                    // 순수 base64 데이터만 추출하거나 통째로 보냅니다.
                    const base64Data = reader.result.split(',')[1];

                    // 파일명 추출 (실패 시 기본값)
                    let filename = srcUrl.split('/').pop().split('?')[0];
                    if (!filename.includes('.')) filename += '.jpg';

                    // background.js로 전송
                    browser.runtime.sendMessage({
                        action: "upload_to_n8n",
                        data: base64Data,
                        filename: filename,
                        pageUrl: window.location.href
                    });
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => {
                console.error("이미지 변환 실패 (CORS 또는 권한 문제):", err);
                showToastNotification(
                    "error", 
                    "이미지 획득 실패", 
                    "CORS 정책 혹은 보안 설정으로 인해 이미지 데이터를 가져올 수 없습니다."
                );
            });
    }
});

// 아름다운 Toast 알림 표시 함수 (Shadow DOM으로 독립)
function showToastNotification(type, title, message) {
    let container = document.getElementById("image2n8n-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "image2n8n-toast-container";
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = "2147483647";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        container.style.pointerEvents = "none";
        (document.body || document.documentElement).appendChild(container);
    }

    const toast = document.createElement("div");
    toast.style.pointerEvents = "auto";
    const shadow = toast.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
        .toast-card {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 320px;
            padding: 16px;
            border-radius: 12px;
            background: rgba(18, 18, 28, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #f3f4f6;
            display: flex;
            gap: 12px;
            position: relative;
            transform: translateX(360px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-sizing: border-box;
        }
        
        .toast-card.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .toast-card.hide {
            transform: translateX(360px);
            opacity: 0;
        }

        .icon-container {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .icon-success {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
        }

        .icon-error {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }

        .icon-info {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
        }

        .content-container {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 180px;
            overflow-y: auto;
            scrollbar-width: thin;
        }

        .content-container::-webkit-scrollbar {
            width: 4px;
        }
        .content-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        }

        .title {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
            color: #ffffff;
        }

        .message {
            font-size: 12px;
            line-height: 1.4;
            color: #9ca3af;
            word-break: break-all;
            white-space: pre-wrap;
        }

        .btn-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 2px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .btn-close:hover {
            color: #f3f4f6;
            background: rgba(255, 255, 255, 0.05);
        }

        .progress-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: var(--progress-color, #3b82f6);
            width: 100%;
            border-bottom-left-radius: 12px;
            transform-origin: left;
            animation: shrink var(--timeout, 4000ms) linear forwards;
        }

        @keyframes shrink {
            to { transform: scaleX(0); }
        }
    `;

    // SVG 아이콘들
    const successIcon = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`;
    const errorIcon = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    const infoIcon = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    const closeIcon = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>`;

    let activeIcon = infoIcon;
    let iconClass = 'icon-info';
    let progressColor = '#3b82f6';
    
    if (type === 'success') {
        activeIcon = successIcon;
        iconClass = 'icon-success';
        progressColor = '#10b981';
    } else if (type === 'error') {
        activeIcon = errorIcon;
        iconClass = 'icon-error';
        progressColor = '#ef4444';
    }

    const duration = type === 'error' ? 8000 : 4500;

    const card = document.createElement("div");
    card.className = "toast-card";
    card.style.setProperty('--progress-color', progressColor);
    card.style.setProperty('--timeout', `${duration}ms`);

    card.innerHTML = `
        <div class="icon-container ${iconClass}">
            ${activeIcon}
        </div>
        <div class="content-container">
            <h4 class="title">${title}</h4>
            <div class="message">${message}</div>
        </div>
        <button class="btn-close" aria-label="Close">
            ${closeIcon}
        </button>
        <div class="progress-bar"></div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(card);
    container.appendChild(toast);

    // 애니메이션 실행
    setTimeout(() => card.classList.add("show"), 50);

    // 닫기 로직
    const closeBtn = card.querySelector(".btn-close");
    let autoDismissTimeout;

    const dismiss = () => {
        card.classList.remove("show");
        card.classList.add("hide");
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 400);
    };

    closeBtn.addEventListener("click", dismiss);
    autoDismissTimeout = setTimeout(dismiss, duration);

    // 마우스 호버 시 멈춤 동작
    card.addEventListener("mouseenter", () => {
        clearTimeout(autoDismissTimeout);
        const progressBar = card.querySelector(".progress-bar");
        if (progressBar) progressBar.style.animationPlayState = "paused";
    });

    card.addEventListener("mouseleave", () => {
        const progressBar = card.querySelector(".progress-bar");
        if (progressBar) progressBar.style.animationPlayState = "running";
        autoDismissTimeout = setTimeout(dismiss, 2000);
    });
}