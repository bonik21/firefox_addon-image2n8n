browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "convert_and_send") {
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
                        filename: filename
                    });
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => {
                console.error("이미지 변환 실패 (CORS 또는 권한 문제):", err);
                // 대체 방법: 이미지 URL만이라도 전송하고 싶다면 여기에 예외 처리 가능
            });
    }
});