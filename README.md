# 필적 — 필적확인문구 뽑기

한지 질감, 고서의 겹테두리와 제본 자국, 붉은 낙관을 활용한 필적확인 문구 뽑기 웹사이트입니다. 별도 설치 과정 없이 정적 파일만으로 동작합니다.

사이트: https://dodongmoon.github.io/pilzuk/

저장소: https://github.com/dodongmoon/pilzuk

## 로컬 실행

```sh
npm run dev
```

http://127.0.0.1:4173 에서 확인합니다. `npm test`로 데이터 무결성, 중복 없는 무작위 뽑기, 검색 및 날짜 표기를 검사합니다.

## 기능

- 2005–2026년 공개 목록의 217개 시험 기록과 211개 서로 다른 문구
- 중복 없는 무작위 뽑기, 수능만 뽑기
- 종이가 들리고 새 문구가 나타나는 뽑기 모션, 연속 클릭 방지
- 기기의 동작 줄이기 설정 지원 및 화면 이동 시 모션 정리
- 시행 연월 / 수능 학년도 / 작가 / 작품 / 출전 미상·추정 구분
- 문구·작가·작품 검색, 연도·시험별 필터
- 브라우저 localStorage 책갈피 및 탭 간 동기화
- 문구·출처 복사, 특정 문장으로 연결되는 공유 링크
- 모바일 대응, 키보드 탐색, reduced-motion 지원

## 데이터

`docs/quotes.json`이 원본 데이터입니다. `year`/`month`는 실제 시행 연월이고 `nominalMonth`는 시험명상의 월입니다. `academicYear`는 수능·평가원 시험의 대입 학년도이며 학력평가에서는 학교 학년도입니다. 예시문항은 실제 시행 시험과 구분합니다.

2026-11-09에 조사했으며 2026년 본수능(2027학년도)은 미공개이므로 제외했습니다. 전체 기록을 공식 시험지로 개별 검증한 자료는 아닙니다. `sourceStatus`: `listed`는 원문 목록에 출전이 기재된 경우, `estimated`는 출전 추정, `unknown`은 출전 미상입니다. 상세 근거는 `DATA-SOURCES.txt`를 참조하세요.

목록: [나무위키 · 필적 확인란 문구](https://namu.wiki/w/%ED%95%84%EC%A0%81%20%ED%99%95%EC%9D%B8%EB%9E%80%20%EB%AC%B8%EA%B5%AC). 목록의 가공·정리 데이터는 CC BY-NC-SA 2.0 KR 조건을 따르며 각 문구의 원저작물 권리는 각 저작권자에게 있습니다.

## 배포

GitHub Pages는 `main` 브랜치의 `/docs` 폴더를 자동으로 배포합니다. `docs/` 안의 사이트 파일을 수정하고 `main`에 push하면 공개 사이트에 반영됩니다. 별도 GitHub Actions 워크플로 권한이나 빌드 설치는 필요하지 않습니다.

```sh
npm test
git add .
git commit -m "Update website"
git push
```

`docs/` 전체를 다른 정적 호스팅에 올려도 동작합니다. 사이트는 `/pilzuk/` 같은 하위 경로를 지원합니다. 폰트는 Google Fonts의 Gowun Batang과 Noto Sans KR을 사용하며 네트워크 불가 시 시스템 폰트로 표시됩니다.
