# 작업 기록 (WORKLOG)

> 프로젝트: Skill Shelf · 팀: 일단 해보조
> 저장소: https://github.com/imsoyeoon/Skill_Shelf
> 이 문서는 저장소 정리·업로드·시연 점검 과정을 시간 순서로 남긴 기록입니다.

---

## 2026-11-25 (수)

### 1. 제출 요건 확인

| 제출물 | 요건 | 상태 |
|---|---|---|
| 발표자료 | 린캔버스 포함 | 별도 준비 (`Skill Shelf 발표 자료 — 일단 해보조.pptx/.pdf`) |
| GitHub 저장소 | 공개, 소스 코드, `docs/PRD.md`, `docs/TECH_SPEC.md` | ✅ 완료 (아래 3~4) |
| 배포된 앱 URL | Streamlit Cloud 등 | ⬜ 미완료 |
| 일정 | 주제 발표 11/24(화), 최종 발표 12/1(화, 20분 이내·시연 포함) | — |

### 2. 로컬 프로젝트 정리

- 프로젝트 위치: `~/Documents/공부/AI·프로그래밍 강의/skill-shelf`
  (원래 `~/Downloads/skill-shelf`에 있었으나 Downloads 정리 중 이 위치로 옮겨짐. 파일 손실 없음 확인)
- `docs/PRD.md` ← `Skill_Shelf_PRD (1).md` 그대로 복사
- `docs/TECH_SPEC.md` ← `TechSpec_Skill_Shelf.docx`를 Markdown으로 변환
  - 제목·문단·번호 목록·표 14개·코드 블록·그림 1개를 원문 순서대로 옮김
  - 아키텍처 그림은 `docs/images/tech_spec_1.png`로 분리
- `.gitignore` 추가: `.env`, `.env.*`, `.streamlit/secrets.toml`, `__pycache__/`, `*.pyc`, `.venv/`, `.DS_Store` 등 제외
  - `.streamlit/config.toml`(테마 설정)은 배포에 필요하므로 **제외하지 않음**
- API 키 검사: 프로젝트 전체에서 실제 키 없음 확인
  - `OPENAI_API_KEY`, `GITHUB_TOKEN`은 코드에서 환경변수로만 읽음
  - README의 `YOUR_OPENAI_API_KEY`는 자리표시자

### 3. GitHub 저장소 검수 (업로드 전)

- 대상: `imsoyeoon/Skill_Shelf` (팀원 소유, 공개)
- 당시 파일은 `README.md`, `Skill_Shelf_Preview.html` 2개뿐 → 소스 코드·docs·.gitignore 모두 누락 상태

### 4. GitHub 업로드

- 기존 커밋 2개(`0553c4a`, `257c85c`) 위에 이어서 커밋해 충돌 없이 반영
- 커밋 `b5e167c` "소스 코드와 개발 문서(PRD, TECH_SPEC) 추가" — 12개 파일 추가
  - 작성자: `bstc1472` → GitHub 계정 **maesil12** 기여로 집계 확인
  - 작성자 정보는 이 저장소에만 설정(`git config --local`), 컴퓨터 전체 설정은 변경 안 함
- 로그인: `brew install gh` → `gh auth login`(웹 브라우저 인증)
- 첫 push는 **403 권한 거부** → 저장소 주인이 maesil12를 Collaborator로 초대·수락 후 push 성공
- 업로드 후 저장소를 새로 받아 재검수
  - 필수 파일 13개 모두 존재, 비밀값·민감 파일 없음, 로컬 정리본과 내용 완전 일치

현재 저장소 커밋 기록:

```
b5e167c  maesil12   소스 코드와 개발 문서(PRD, TECH_SPEC) 추가
257c85c  imsoyeoon  1124 제작 초안 등록
0553c4a  imsoyeoon  Initial commit
```

### 5. MVP 시연 점검 (로컬 실행)

- 환경: Python 3.12 + Streamlit 1.67 (별도 가상환경), `OPENAI_API_KEY`·`GITHUB_TOKEN` **없이** 실행
- 시나리오: "랜딩 페이지를 만들고 있어요. 화면 디자인을 다듬고 브라우저에서 동작을 테스트하고 싶어요."

| 기능 | 결과 | 비고 |
|---|---|---|
| 첫 화면 | ✅ | 첫 로딩 약 5초 |
| 프로젝트 추천 (키워드 모드) | ✅ | 즉시 3개 추천: Frontend Design, Webapp Testing(적합), Spreadsheets(부적합) |
| 스킬 상세 모달 | ✅ | SKILL.md·저장소 링크가 실제 GitHub 주소로 연결 |
| 카테고리 필터 | ✅ | 테스트·디버깅 → 3개 |
| 초기 목록 | ✅ | 9개 (seed.json) |
| GitHub에서 불러오기 | ⚠️ | 약 45초 소요, 저장소 58개·스킬 4,880개. "API 요청 한도…" 경고 노출 |
| 불러온 스킬 상세 | ❌ | "SKILL.md 설명을 가져오지 못했습니다" (API 한도 소진) |
| AI 추천 모드 | ⬜ 미검증 | OpenAI 키가 없어 확인 못 함 |

발견한 문제:

1. **GitHub API 한도**: 토큰 없이는 시간당 60회인데, 불러오기 1회에 57회 사용 → 그 뒤 상세 설명 조회 실패
2. **불러온 목록의 품질**: 상위가 한 저장소(`morluto/rea`)의 스킬로 채워지고, 설명이 영어 저장소 소개로 반복됨
3. **키워드 모드 추천 정확도**: 3개 중 1개가 질문과 무관
4. 불러온 목록은 세션에만 저장 → 새로고침/새 창이면 초기 9개로 돌아감

시연 권장 사항:

- 배포 시 Streamlit Cloud **Secrets**에 `OPENAI_API_KEY`와 `GITHUB_TOKEN`을 모두 등록 (저장소에는 올리지 않음)
- 시연 흐름은 **추천 → 상세 → 원문 링크 → 카테고리 필터** 중심으로 구성
- "GitHub에서 불러오기"는 토큰 설정 후 리허설에서 시간·결과를 확인하고, 불안하면 발표 직전 같은 탭에서 미리 실행해 두기
- Streamlit Cloud 앱은 오래 쓰지 않으면 잠들기 때문에, 발표 직전에 한 번 열어 깨워 두기

### 6. 작업 기록 업로드

- 커밋 `403d8f2` "작업 기록(docs/WORKLOG.md) 추가" → push 완료 (작성자 계정 maesil12 확인)
- 이후 작업도 이 문서에 날짜별로 이어서 기록

### 7. 남은 일

- [ ] Streamlit Community Cloud 배포 → 앱 URL 확보 (Main file: `app.py`)
- [ ] Secrets에 `OPENAI_API_KEY`, `GITHUB_TOKEN` 등록 후 AI 모드·불러오기 재점검
- [ ] 시연 리허설 (TECH_SPEC 테스트 계획상 11/30)
- [ ] 발표자료(린캔버스 포함) 최종본 제출
