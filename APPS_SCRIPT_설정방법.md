# Google Apps Script 공유 저장 URL 만들기

1. Google Sheet `펠리체 운영 매뉴얼 정보 저장`을 엽니다.
2. 상단 메뉴에서 `확장 프로그램` > `Apps Script`를 누릅니다.
3. 열린 Apps Script 화면의 `Code.gs` 내용을 전부 지웁니다.
4. 이 폴더의 `google-apps-script-backend.gs` 내용을 전부 복사해서 붙여넣습니다.
5. 저장합니다.
6. 오른쪽 위 `배포` > `새 배포`를 누릅니다.
7. 유형 선택에서 `웹 앱`을 선택합니다.
8. 실행 권한은 `나`로 둡니다.
9. 액세스 권한은 `모든 사용자` 또는 `링크가 있는 모든 사용자`로 둡니다.
10. `배포`를 누르고 권한 승인을 완료합니다.
11. 생성된 `웹 앱 URL`을 복사합니다. URL은 보통 `https://script.google.com/macros/s/.../exec` 형태입니다.
12. `config.js` 파일의 따옴표 안에 그 URL을 넣습니다.

예:
```js
window.FELICE_SHARED_ENDPOINT = "https://script.google.com/macros/s/배포ID/exec";
```

13. GitHub에는 아래 파일을 올립니다.

```text
index.html
app.css
app.js
config.js
google-apps-script-backend.gs
felice-logo-green.jpg
README.md
```

주의: 서비스 계정 JSON, .env, .env.local은 올리지 않습니다.
