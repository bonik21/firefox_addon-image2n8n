browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "show_toast") {
        showToastNotification(request.type, request.title, request.message);
    } else if (request.action === "convert_and_send") {
        const srcUrl = request.srcUrl;

        // 1. 파일명 추출 (실패 시 no_filename)
        let filename = "";
        if (!srcUrl) {
            filename = "no_filename.jpg";
        } else if (srcUrl.startsWith('data:')) {
            const mimeMatch = srcUrl.match(/^data:image\/([a-zA-Z0-9+-]+);base64,/);
            if (mimeMatch) {
                let ext = mimeMatch[1];
                if (ext === 'jpeg') ext = 'jpg';
                filename = `no_filename.${ext}`;
            } else {
                filename = "no_filename.jpg";
            }
        } else {
            try {
                filename = srcUrl.split('/').pop().split('?')[0];
                filename = decodeURIComponent(filename).trim();
            } catch (e) {
                filename = "";
            }
            if (!filename) {
                filename = "no_filename.jpg";
            } else if (!filename.includes('.')) {
                filename += '.jpg';
            }
        }

        // 2. 파일명 편집 및 전송 방식을 위한 팝업창(Modal) 표시
        showUploadPopup(srcUrl, filename, request.webhookId);
    }
});

// EXIF 메타데이터 추출 헬퍼
function extractExifMetadata(tags) {
    var title = "";
    var description = "";
    if (!tags) return { title: title, description: description };

    title = (
        (tags["Title"] && tags["Title"].description) ||
        (tags["title"] && tags["title"].description) ||
        (tags["ObjectName"] && tags["ObjectName"].description) ||
        (tags["DocumentName"] && tags["DocumentName"].description) ||
        ""
    ).toString().trim();

    description = (
        (tags["Description"] && tags["Description"].description) ||
        (tags["description"] && tags["description"].description) ||
        (tags["Caption-Abstract"] && tags["Caption-Abstract"].description) ||
        (tags["ImageDescription"] && tags["ImageDescription"].description) ||
        ""
    ).toString().trim();

    return { title: title, description: description };
}

// 파일명 편집 및 업로드 방식 선택 팝업창 표시 함수
function showUploadPopup(srcUrl, initialFilename, webhookId) {
    browser.storage.local.get({ sendExifData: false }).then(function(settings) {
        var isExifEnabled = settings.sendExifData;

        // 기존 팝업이 있다면 제거
        var existing = document.getElementById("image2n8n-popup-root");
        if (existing) existing.remove();

        var root = document.createElement("div");
        root.id = "image2n8n-popup-root";
        root.style.position = "fixed";
        root.style.top = "0";
        root.style.left = "0";
        root.style.width = "100vw";
        root.style.height = "100vh";
        root.style.zIndex = "2147483647";
        root.style.display = "flex";
        root.style.alignItems = "center";
        root.style.justifyContent = "center";
        root.style.background = "rgba(10, 11, 22, 0.65)";
        root.style.backdropFilter = "blur(10px)";
        root.style.webkitBackdropFilter = "blur(10px)";
        root.style.pointerEvents = "auto";

        var shadow = root.attachShadow({ mode: "open" });

        var style = document.createElement("style");
        style.textContent = [
            "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap');",
            ".modal-card {",
            "  font-family: 'Outfit', 'Noto Sans KR', sans-serif;",
            "  width: 440px; max-width: 90vw; max-height: 90vh; overflow-y: auto;",
            "  padding: 30px; border-radius: 24px;",
            "  background: rgba(20, 21, 38, 0.92);",
            "  border: 1px solid rgba(255,255,255,0.08);",
            "  box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);",
            "  color: #f3f4f6; display: flex; flex-direction: column; gap: 20px;",
            "  box-sizing: border-box; animation: modalScale 0.3s cubic-bezier(0.175,0.885,0.32,1.275) forwards;",
            "  scrollbar-width: thin;",
            "}",
            "@keyframes modalScale { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }",
            ".header { display:flex; justify-content:space-between; align-items:center; }",
            ".title { font-size:18px; font-weight:700; margin:0;",
            "  background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);",
            "  -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-0.5px; }",
            ".btn-close { background:transparent; border:none; color:#6b7280; cursor:pointer;",
            "  padding:6px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }",
            ".btn-close:hover { color:#f3f4f6; background:rgba(255,255,255,0.08); }",
            ".body { display:flex; flex-direction:column; gap:12px; }",
            ".field-group { display:flex; flex-direction:column; gap:6px; }",
            ".label { font-size:12px; font-weight:500; color:#9ca3af; }",
            ".input-text { width:100%; padding:12px 14px; background:rgba(10,11,18,0.5);",
            "  border:1px solid rgba(255,255,255,0.08); border-radius:12px; color:#fff;",
            "  font-family:inherit; font-size:14px; box-sizing:border-box; transition:all 0.3s; }",
            ".input-text:focus { outline:none; border-color:#6366f1;",
            "  box-shadow:0 0 0 3px rgba(99,102,241,0.15); background:rgba(10,11,18,0.7); }",
            ".input-text:disabled { opacity:0.45; cursor:not-allowed; }",
            "textarea.input-text { resize:vertical; min-height:64px; }",
            ".btn-group { display:flex; gap:12px; margin-top:10px; }",
            ".btn { flex:1; padding:12px 16px; border-radius:12px; font-family:inherit;",
            "  font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s;",
            "  display:flex; align-items:center; justify-content:center; gap:8px; box-sizing:border-box; }",
            ".btn-base64 { background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);",
            "  border:none; color:#fff; box-shadow:0 4px 15px rgba(99,102,241,0.2); }",
            ".btn-base64:hover:not(:disabled) { transform:translateY(-2px);",
            "  box-shadow:0 6px 20px rgba(99,102,241,0.3); filter:brightness(1.1); }",
            ".btn-url { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#f3f4f6; }",
            ".btn-url:hover:not(:disabled) { background:rgba(255,255,255,0.1);",
            "  border-color:rgba(255,255,255,0.2); transform:translateY(-2px); }",
            ".btn:disabled { opacity:0.5; cursor:not-allowed; transform:none !important; box-shadow:none !important; }",
            ".error-message { font-size:12px; color:#ef4444; display:none;",
            "  background:rgba(239,68,68,0.1); padding:10px; border-radius:8px;",
            "  border:1px solid rgba(239,68,68,0.2); line-height:1.4; }",
            ".error-message.show { display:block; }",
            ".image-preview { width:100%; height:120px; border-radius:12px; object-fit:contain;",
            "  background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.05); margin-bottom:8px; }",
            ".exif-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }",
            ".exif-label { font-size:11px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:0.5px; }",
            ".exif-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; transition:all 0.3s; }",
            ".exif-badge.loading { background:rgba(99,102,241,0.15); color:#a5b4fc; }",
            ".exif-badge.success { background:rgba(16,185,129,0.15); color:#34d399; }",
            ".exif-badge.failed  { background:rgba(239,68,68,0.15);  color:#f87171; }",
            ".exif-badge.manual  { background:rgba(245,158,11,0.15); color:#fbbf24; }",
            ".exif-divider { height:1px; background:rgba(99,102,241,0.15); margin:4px 0; }"
        ].join("\n");

        var createSVG = function(pathD, strokeWidth) {
            strokeWidth = strokeWidth || "2";
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", "16"); svg.setAttribute("height", "16");
            svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", strokeWidth); svg.setAttribute("viewBox", "0 0 24 24");
            var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
            path.setAttribute("d", pathD);
            svg.appendChild(path);
            return svg;
        };

        var card = document.createElement("div");
        card.className = "modal-card";

        var header = document.createElement("div");
        header.className = "header";

        var titleEl = document.createElement("h3");
        titleEl.className = "title";
        titleEl.textContent = "이미지 업로드 설정 (v1.5)";

        var closeBtn = document.createElement("button");
        closeBtn.className = "btn-close";
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.appendChild(createSVG("M6 18L18 6M6 6l12 12", "2.2"));
        closeBtn.addEventListener("click", function() { root.remove(); });

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        var body = document.createElement("div");
        body.className = "body";

        if (srcUrl && !srcUrl.startsWith("data:")) {
            var imgPreview = document.createElement("img");
            imgPreview.className = "image-preview";
            imgPreview.src = srcUrl;
            body.appendChild(imgPreview);
        }

        // 파일명
        var fieldGroup = document.createElement("div");
        fieldGroup.className = "field-group";
        var lbl = document.createElement("div");
        lbl.className = "label";
        lbl.textContent = "저장될 파일 이름";
        var input = document.createElement("input");
        input.type = "text"; input.className = "input-text";
        input.value = initialFilename; input.placeholder = "no_filename";
        fieldGroup.appendChild(lbl); fieldGroup.appendChild(input);
        body.appendChild(fieldGroup);

        // EXIF 섹션
        var titleInput = null;
        var descInput = null;
        var exifBadge = null;
        var cachedBlob = null;

        if (isExifEnabled) {
            var divider = document.createElement("div");
            divider.className = "exif-divider";
            body.appendChild(divider);

            var exifHeader = document.createElement("div");
            exifHeader.className = "exif-section-header";
            var exifLabel = document.createElement("span");
            exifLabel.className = "exif-label";
            exifLabel.textContent = "Exif 메타데이터";
            exifBadge = document.createElement("span");
            exifBadge.className = "exif-badge loading";
            exifBadge.textContent = "⏳ 분석 중...";
            exifHeader.appendChild(exifLabel);
            exifHeader.appendChild(exifBadge);
            body.appendChild(exifHeader);

            var tg = document.createElement("div"); tg.className = "field-group";
            var tl = document.createElement("div"); tl.className = "label"; tl.textContent = "제목 (Title)";
            titleInput = document.createElement("input");
            titleInput.type = "text"; titleInput.className = "input-text";
            titleInput.placeholder = "분석 중..."; titleInput.disabled = true;
            tg.appendChild(tl); tg.appendChild(titleInput); body.appendChild(tg);

            var dg = document.createElement("div"); dg.className = "field-group";
            var dl = document.createElement("div"); dl.className = "label"; dl.textContent = "설명 (Description)";
            descInput = document.createElement("textarea");
            descInput.className = "input-text";
            descInput.placeholder = "분석 중..."; descInput.disabled = true;
            dg.appendChild(dl); dg.appendChild(descInput); body.appendChild(dg);

            var doExif = function() {
                if (!srcUrl || srcUrl.startsWith("data:")) {
                    titleInput.disabled = false; descInput.disabled = false;
                    titleInput.placeholder = "제목을 입력하세요";
                    descInput.placeholder = "설명을 입력하세요";
                    exifBadge.className = "exif-badge manual";
                    exifBadge.textContent = "✎ 직접 입력";
                    return;
                }
                fetch(srcUrl)
                    .then(function(r) {
                        if (!r.ok) throw new Error("fetch " + r.status);
                        return r.blob();
                    })
                    .then(function(blob) {
                        cachedBlob = blob;
                        return new Promise(function(res, rej) {
                            var fr = new FileReader();
                            fr.onload = function() { res(fr.result); };
                            fr.onerror = function() { rej(fr.error); };
                            fr.readAsArrayBuffer(blob);
                        });
                    })
                    .then(function(buf) {
                        var tags = null;
                        try {
                            if (typeof ExifReader !== "undefined") {
                                tags = ExifReader.load(buf);
                            }
                        } catch(e) { console.warn("ExifReader:", e); }

                        titleInput.disabled = false; descInput.disabled = false;
                        titleInput.placeholder = "제목을 입력하세요";
                        descInput.placeholder = "설명을 입력하세요";

                        var meta = extractExifMetadata(tags);
                        if (meta.title || meta.description) {
                            titleInput.value = meta.title;
                            descInput.value = meta.description;
                            exifBadge.className = "exif-badge success";
                            exifBadge.textContent = "✓ Exif 추출 완료";
                        } else {
                            exifBadge.className = "exif-badge manual";
                            exifBadge.textContent = "✎ Exif 없음 — 직접 입력";
                        }
                    })
                    .catch(function(err) {
                        console.warn("EXIF 추출 실패:", err);
                        titleInput.disabled = false; descInput.disabled = false;
                        titleInput.placeholder = "제목을 입력하세요";
                        descInput.placeholder = "설명을 입력하세요";
                        exifBadge.className = "exif-badge failed";
                        exifBadge.textContent = "✗ 분석 실패 — 직접 입력";
                    });
            };
            doExif();
        }

        var errMsg = document.createElement("div");
        errMsg.className = "error-message";
        body.appendChild(errMsg);

        var btnGroup = document.createElement("div");
        btnGroup.className = "btn-group";
        var btnBase64 = document.createElement("button");
        btnBase64.className = "btn btn-base64";
        btnBase64.textContent = "Base64로 전송";
        var btnUrl = document.createElement("button");
        btnUrl.className = "btn btn-url";
        btnUrl.textContent = "URL로 전송";
        btnGroup.appendChild(btnBase64); btnGroup.appendChild(btnUrl);
        body.appendChild(btnGroup);

        card.appendChild(header); card.appendChild(body);
        shadow.appendChild(style); shadow.appendChild(card);
        (document.body || document.documentElement).appendChild(root);

        input.focus();
        var dotIndex = input.value.lastIndexOf(".");
        if (dotIndex > 0) { input.setSelectionRange(0, dotIndex); } else { input.select(); }

        var getMeta = function() {
            return {
                title: (isExifEnabled && titleInput) ? titleInput.value.trim() : "",
                description: (isExifEnabled && descInput) ? descInput.value.trim() : ""
            };
        };

        var disableButtons = function(d) {
            btnBase64.disabled = d; btnUrl.disabled = d; input.disabled = d;
            if (titleInput) titleInput.disabled = d;
            if (descInput) descInput.disabled = d;
        };

        btnBase64.addEventListener("click", function() {
            var fn = input.value.trim() || "no_filename";
            var meta = getMeta();
            disableButtons(true);
            btnBase64.textContent = "인코딩 중...";
            errMsg.classList.remove("show");

            var doSend = function(blob) {
                var reader = new FileReader();
                reader.onloadend = function() {
                    var b64 = reader.result.split(",")[1];
                    browser.runtime.sendMessage({
                        action: "upload_to_n8n",
                        data: b64,
                        filename: fn,
                        pageUrl: window.location.href,
                        webhookId: webhookId,
                        title: meta.title,
                        description: meta.description
                    });
                    root.remove();
                };
                reader.readAsDataURL(blob);
            };

            if (cachedBlob) {
                doSend(cachedBlob);
            } else {
                fetch(srcUrl).then(function(r) { return r.blob(); })
                    .then(function(blob) { doSend(blob); })
                    .catch(function(err) {
                        console.error("Base64 변환 에러:", err);
                        disableButtons(false);
                        btnBase64.textContent = "Base64로 전송";
                        errMsg.textContent = "CORS 정책 또는 보안 설정으로 인해 이미지 데이터를 가져오지 못했습니다. 아래의 [URL로 전송]을 클릭해 보세요.";
                        errMsg.classList.add("show");
                    });
            }
        });

        btnUrl.addEventListener("click", function() {
            var fn = input.value.trim() || "no_filename";
            var meta = getMeta();
            disableButtons(true);
            btnUrl.textContent = "전송 중...";
            browser.runtime.sendMessage({
                action: "upload_to_n8n",
                imageUrl: srcUrl,
                filename: fn,
                pageUrl: window.location.href,
                webhookId: webhookId,
                title: meta.title,
                description: meta.description
            });
            root.remove();
        });

        var escHandler = function(e) {
            if (e.key === "Escape") {
                root.remove();
                document.removeEventListener("keydown", escHandler);
            }
        };
        document.addEventListener("keydown", escHandler);
    });
}
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

        .message a {
            color: #6366f1;
            text-decoration: underline;
            transition: color 0.2s;
        }

        .message a:hover {
            color: #a855f7;
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

    // Helper to create SVGs programmatically (preventing innerHTML security issues during extension signing)
    const createSVG = (pathD, strokeWidth = "3") => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "14");
        svg.setAttribute("height", "14");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", strokeWidth);
        svg.setAttribute("viewBox", "0 0 24 24");
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("d", pathD);
        
        svg.appendChild(path);
        return svg;
    };

    let iconClass = 'icon-info';
    let progressColor = '#3b82f6';
    let pathD = "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"; // info path
    
    if (type === 'success') {
        iconClass = 'icon-success';
        progressColor = '#10b981';
        pathD = "M5 13l4 4L19 7";
    } else if (type === 'error') {
        iconClass = 'icon-error';
        progressColor = '#ef4444';
        pathD = "M6 18L18 6M6 6l12 12";
    }

    const duration = type === 'error' ? 8000 : 4500;

    const card = document.createElement("div");
    card.className = "toast-card";
    card.style.setProperty('--progress-color', progressColor);
    card.style.setProperty('--timeout', `${duration}ms`);

    // Icon Container
    const iconContainer = document.createElement("div");
    iconContainer.className = `icon-container ${iconClass}`;
    iconContainer.appendChild(createSVG(pathD, "3"));

    // Content Container
    const contentContainer = document.createElement("div");
    contentContainer.className = "content-container";

    const titleEl = document.createElement("h4");
    titleEl.className = "title";
    titleEl.textContent = title;

    // Helper to safely parse and render limited HTML tags (a, br) programmatically to avoid innerHTML reviews
    const setSafeHTML = (targetEl, htmlString) => {
        targetEl.textContent = "";
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, "text/html");
            
            const copyNodes = (source, target) => {
                source.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        target.appendChild(document.createTextNode(node.textContent));
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const tagName = node.tagName.toLowerCase();
                        if (tagName === "a") {
                            const anchor = document.createElement("a");
                            anchor.textContent = node.textContent;
                            
                            const href = node.getAttribute("href");
                            if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
                                anchor.setAttribute("href", href);
                            }
                            
                            const targetAttr = node.getAttribute("target");
                            anchor.setAttribute("target", targetAttr || "_blank");
                            
                            target.appendChild(anchor);
                        } else if (tagName === "br") {
                            target.appendChild(document.createElement("br"));
                        } else {
                            const span = document.createElement("span");
                            copyNodes(node, span);
                            target.appendChild(span);
                        }
                    }
                });
            };
            copyNodes(doc.body, targetEl);
        } catch (e) {
            targetEl.textContent = htmlString;
        }
    };

    const messageEl = document.createElement("div");
    messageEl.className = "message";
    setSafeHTML(messageEl, message);

    contentContainer.appendChild(titleEl);
    contentContainer.appendChild(messageEl);

    // Close Button
    const closeBtn = document.createElement("button");
    closeBtn.className = "btn-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.appendChild(createSVG("M6 18L18 6M6 6l12 12", "2.2"));

    // Progress Bar
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";

    // Assemble Card
    card.appendChild(iconContainer);
    card.appendChild(contentContainer);
    card.appendChild(closeBtn);
    card.appendChild(progressBar);

    shadow.appendChild(style);
    shadow.appendChild(card);
    container.appendChild(toast);

    // 애니메이션 실행
    setTimeout(() => card.classList.add("show"), 50);

    // 닫기 로직
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