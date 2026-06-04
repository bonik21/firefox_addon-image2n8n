# image2n8n - Firefox Extension

웹페이지에서 우클릭한 이미지를 Base64 데이터로 인코딩하여 지정한 **n8n Webhook URL**로 즉시 전송해주는 Firefox 부가 기능(Add-on)입니다. 

개인용 하드코딩 웹훅 설정 방식에서 탈피하여, 사용자가 직접 웹훅 URL 및 업로드 전송 성공/실패 시의 브라우저 동작을 다양하게 정의할 수 있는 **배포용 확장 기능**입니다.

---

## 주요 기능

1. **간편한 우클릭 업로드**
   - 웹서핑 도중 마음에 드는 이미지 위에서 마우스 우클릭 후 `이미지 업로드(to n8n)` 메뉴를 클릭하면 자동으로 n8n 워크플로우로 전송됩니다.
2. **세련된 글래스모피즘 설정 UI**
   - 다크 모드 기반의 고품격 글래스모피즘(Glassmorphism) 설정 대시보드를 제공합니다.
   - n8n Webhook URL 입력 및 성공/실패 액션을 직관적으로 제어할 수 있습니다.
3. **독립된 Shadow DOM Toast 알림**
   - 웹페이지의 기존 스타일 시트(CSS)와 충돌하지 않도록 **Shadow DOM** 내부에 격리된 프리미엄 스타일의 토스트 메시지를 화면 우측 상단에 띄워줍니다.
   - 진행 중, 업로드 완료, 에러 메시지를 시각적으로 편리하게 확인할 수 있습니다.
4. **상세 정보 전송**
   - 이미지 데이터뿐만 아니라 이미지가 위치한 본문 웹페이지 주소(`page_url`)와 원본 파일명(`filename`)을 Payload에 포함하여 전송하므로, n8n 워크플로우에서 출처 분석이나 스크랩 자동화 시 매우 유용합니다.

---

## 설치 및 실행 방법 (Firefox 개발자 모드)

### 1. 임시 부가 기능으로 로드하기
1. Firefox 브라우저 주소창에 `about:debugging`을 입력하여 디버깅 페이지로 이동합니다.
2. 좌측 메뉴에서 **"이 Firefox" (This Firefox)**를 클릭합니다.
3. 임시 부가 기능 섹션 아래에 있는 **"임시 부가 기능 로드..." (Load Temporary Add-on...)** 버튼을 클릭합니다.
4. 프로젝트 폴더의 [manifest.json](manifest.json) 파일을 선택하여 로드합니다.

### 2. 옵션 및 웹훅 설정하기
1. 로드된 `image2n8n` 카드에서 **"설정" (Options)** 버튼을 클릭하여 설정 탭을 엽니다.
2. 본인의 n8n 인스턴스에서 생성한 Webhook 주소(POST)를 `n8n Webhook URL`에 입력합니다.
3. **업로드 성공 시 작업** 및 **업로드 실패 시 작업**을 선택합니다:
   - **팝업 메시지 표시**: 화면에 아름다운 토스트 성공/실패 창을 띄웁니다.
   - **요청의 응답 표시**: n8n 웹훅이 반환한 응답 바디나 에러 로그를 토스트창에 출력합니다.
   - **특정 URL 열기**: 작업 완료 또는 에러 발생 시 지정한 주소의 탭을 새 창에서 엽니다 (n8n 실행 히스토리 대시보드나 가이드 페이지 등록용).
   - **아무것도 하지 않음**: 알림 없이 조용히 백그라운드에서 처리합니다.
4. `설정 저장하기`를 클릭하면 모든 구성이 즉시 반영됩니다.

---

## 전송 데이터 구조 (Payload)

부가 기능은 n8n Webhook URL에 `POST` 메서드로 아래와 같은 JSON 페이로드를 전달합니다.

```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...", // 순수 Base64 인코딩 데이터 (data:image/... 프리픽스 제외)
  "filename": "sunset_photo.jpg",               // 추출된 이미지의 원본 파일 이름
  "page_url": "https://example.com/blog/123"    // 이미지가 위치해 있던 웹페이지 주소
}
```

---

## 프로젝트 구조

- [manifest.json](manifest.json): Extension Manifest V3 설정 파일 및 메타데이터 정보.
- [background.js](background.js): 우클릭 콘텍스트 메뉴 생성, 브라우저 스토리지 확인, n8n 웹훅 POST 호출 및 결과 처리 액션 제어.
- [content.js](content.js): 활성 탭 이미지 Blob 인출, base64 변환 처리, Shadow DOM 기반의 토스트 UI 렌더링.
- [options.html](options.html) / [options.js](options.js): 글래스모피즘 설정 대시보드 UI 및 옵션 저장/로드 핸들러.

---

## 라이선스
MIT License. 자유롭게 커스텀하여 사용해 보세요!