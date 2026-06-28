# FELICE COMPANY 운영 매뉴얼

FELICE COMPANY의 업무 기준, 진행 순서, 기록 위치, 보고 방법을 정리하는 정적 운영 매뉴얼 허브입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run lint
npm run build
```

## GitHub 업로드

1. 이 폴더를 GitHub 저장소로 올립니다.
2. `content/*.json`, `public/felice-logo-green.jpg`, `src/*` 파일이 포함되어 있는지 확인합니다.
3. 실제 고객명, 전화번호, 계약 금액, 비공개 Google 문서 링크는 저장소에 넣지 않습니다.

## Vercel 연결

1. Vercel에서 GitHub 저장소를 Import 합니다.
2. Framework Preset은 `Vite`를 선택합니다.
3. Build Command는 `npm run build`, Output Directory는 `dist`를 사용합니다.

## 콘텐츠 수정

- 초기 업무는 `content/tasks-seed.json`에서 관리합니다.
- 초기 체크리스트는 `content/checklists-seed.json`에서 관리합니다.
- 초기 매뉴얼은 `content/manual-seed.json`에서 관리합니다.
- 배포 후 사용자가 화면에서 수정한 내용은 브라우저 `localStorage`에 저장됩니다.

## localStorage

사용 키:

- `felice.manual.tasks`
- `felice.manual.checklists`
- `felice.manual.sections`
- `felice.manual.settings`
- `felice.manual.lastBackupAt`

localStorage는 PC와 모바일 간 자동 동기화되지 않습니다. 기기를 바꾸기 전에는 사이트의 JSON 내보내기 기능으로 백업하고, 새 기기에서 JSON 불러오기로 복원해야 합니다.

## JSON 백업·복원

사이트의 `백업` 화면에서 현재 업무, 체크리스트, 매뉴얼 수정 상태를 JSON으로 내보낼 수 있습니다. 불러오기 전에는 앱 이름과 필수 배열 구조를 검사하며, 잘못된 JSON은 적용하지 않습니다.

## PDF 저장

브라우저의 인쇄 기능을 사용해 PDF로 저장합니다. 인쇄 화면에서는 내비게이션, 검색창, 추가·수정·삭제 버튼, 모바일 하단 메뉴가 숨겨집니다.

## 공개 사이트 주의사항

이 사이트는 정적 배포와 localStorage 기반 개인 사용을 전제로 합니다. 서버, 데이터베이스, 로그인, 접근 권한 제어가 없습니다. 공개 주소에 실제 고객명, 전화번호, 계약 금액, 계약서 원문, 비밀번호, 비공개 Google 문서 링크, 세무·결재 민감자료를 넣으면 안 됩니다.

## 여러 사용자 공유 저장

이 사이트는 기본적으로 브라우저 localStorage를 사용하지만, `관리` 화면에 Google Apps Script 웹앱 URL을 입력하면 업무 수정·삭제·완료 처리와 체크리스트 체크 상태를 공통 저장소에 저장합니다.

설정 순서:

1. Google Sheets를 하나 만듭니다.
2. 확장 프로그램 > Apps Script를 열고 `google-apps-script-backend.gs` 내용을 붙여넣습니다.
3. Apps Script를 웹앱으로 배포합니다.
4. 실행 권한은 본인, 접근 권한은 사이트 사용자 정책에 맞게 설정합니다.
5. 배포된 웹앱 URL을 사이트의 `관리 > Google 공유 저장`에 입력합니다.
6. `현재 상태 올리기`를 한 번 눌러 초기 데이터를 공유 저장소로 보냅니다.

같은 웹앱 URL을 설정한 사용자는 같은 업무·체크리스트 상태를 불러오며, 화면은 약 20초마다 공유 저장소를 다시 확인합니다.
## Vercel + Google Sheets 공유 저장 구성

이 버전은 Vercel 배포 시 `/api/state` 서버 API가 Google Sheets에 데이터를 저장합니다. 브라우저에는 비밀키가 들어가지 않습니다.

1. Google Cloud Console에서 해당 프로젝트의 Google Sheets API를 활성화합니다.
2. Google Sheet `17EbiDOnmkQaCcI8XKArBqwWPgJ2M2wltoDWFzo2725Q`를 서비스 계정 이메일 `feliceco@gen-lang-client-0854288932.iam.gserviceaccount.com`에 편집자로 공유합니다.
3. Vercel 프로젝트 Settings > Environment Variables에 아래 값을 추가합니다.
   - `GOOGLE_SHEET_ID`: 저장할 Google Sheet ID
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: 서비스 계정 JSON의 `client_email`
   - `GOOGLE_PRIVATE_KEY`: 서비스 계정 JSON의 `private_key` 전체 값
4. GitHub에 올릴 때 JSON 키 파일과 `.env` 파일은 올리지 않습니다. `.env.example`만 참고용으로 둡니다.
5. 배포된 사이트에서는 자동으로 `/api/state`를 사용합니다. 같은 링크를 가진 사용자가 추가, 삭제, 수정, 완료 처리한 내용은 Google Sheets에 저장되고 다른 사용자 화면에도 반영됩니다.
6. 로컬에서 `file://`로 직접 열면 Vercel API가 없으므로 공유 저장은 작동하지 않습니다. 공유 테스트는 Vercel 배포 URL이나 로컬 개발 서버에서 진행합니다.
