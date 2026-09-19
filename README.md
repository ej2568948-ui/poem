# 흔들리며 피는 꽃, 시를 읽는 너에게

오늘의 마음, 만나고 싶은 주제, 읽을 시간을 선택하면 어울리는 한국 시를 추천하는 웹앱입니다.

## 주요 기능

- 기분·주제·읽기 시간에 따른 시 추천
- 위키문헌에서 원문과 자유 이용 상태를 확인한 기존 시 100편 기반 AI 추천
- 저작권 보호기간이 만료된 작품의 시 전문 제공
- 작품별 추천 이유와 감상 질문 제공
- 마음에 남은 시를 브라우저에 저장
- 저장한 시 다시 열기 및 제목·시인 검색
- 추천 카드 복사
- 모바일·데스크톱 반응형 화면

## Gemini AI 검색 연결

앱은 `/api/recommend` 서버 함수를 통해 Gemini로 작품 목록을 분석합니다. `GEMINI_FILE_SEARCH_STORE`를 추가하면 대규모 작품 데이터에 대한 Gemini File Search로 확장되고, 환경변수가 없으면 기존 로컬 추천으로 자동 대체됩니다.

1. Google AI Studio에서 새 Gemini API 키를 발급합니다.
2. `.env.example`을 참고해 `GEMINI_API_KEY`와 `GEMINI_MODEL`을 서버 환경변수로 등록합니다.
3. 작품 수가 많아지면 Gemini File Search Store를 만들고 `GEMINI_FILE_SEARCH_STORE`를 추가합니다.

API 키는 브라우저 코드에 넣지 마세요. AI 검색 결과는 작품 ID와 추천 이유만 사용하고, 실제 시 전문은 앱의 원문 데이터에서 표시합니다.

## Vercel 배포

이 프로젝트는 별도 빌드 과정 없이 Vercel에 배포할 수 있습니다.

1. GitHub에 이 폴더의 파일을 새 저장소로 업로드합니다.
2. Vercel에서 `Add New Project`를 선택하고 GitHub 저장소를 연결합니다.
3. Framework Preset은 `Other`, Build Command는 비워 둡니다.
4. Deploy를 실행합니다.
5. AI 검색을 켜려면 Vercel 프로젝트의 Settings → Environment Variables에 다음 값을 추가합니다.

```text
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_FILE_SEARCH_STORE
```

API 키는 GitHub 파일, `index.html`, README에 직접 입력하지 않습니다. 환경변수 없이도 사이트는 기본 로컬 추천 모드로 배포됩니다.

## 저작권 안내

앱에는 위키문헌에서 원문과 `PD-old-70` 등 자유 이용 상태를 확인한 기존 시 100편이 수록되어 있습니다. 외부 사이트로 이동하지 않는 텍스트 출처 표기를 사용합니다. 일부 작품은 현대 독자가 읽기 쉽도록 띄어쓰기와 문장부호를 정리했습니다.

## 실행 방법

별도의 설치나 빌드 과정 없이 `index.html`을 브라우저에서 열면 실행됩니다.

