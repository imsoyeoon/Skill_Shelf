# Skill Shelf

프로젝트 설명과 파일을 바탕으로 Agent Skill을 추천하고, GitHub 스킬을 카테고리별로 탐색하는 Streamlit 앱입니다.

## 실행

Python 3.10 이상이 필요합니다. 압축을 푼 폴더에서 다음 명령으로 실행합니다.

```powershell
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

### AI 추천 연결

PowerShell에서 API 키를 설정한 뒤 앱을 실행합니다. 키 없이 실행하면 키워드 추천이 작동합니다. 기본 모델은 `gpt-4.1-mini`이며 `OPENAI_MODEL`로 바꿀 수 있습니다.

```powershell
$env:OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'
python -m streamlit run app.py
```

채팅은 프로젝트 설명과 ZIP 또는 텍스트 파일을 받습니다. ZIP에서는 일부 파일명과 README·패키지 설정 등 주요 파일의 앞부분을 읽습니다. 추천에 AI를 사용할 때 설명과 발췌 요약을 OpenAI API로 전송합니다. 파일은 최대 3개, 개별 4MB와 합계 8MB까지 첨부할 수 있습니다. 대화와 목록은 현재 앱 세션에 보관됩니다.

### GitHub 목록

`GitHub에서 불러오기`는 공개 저장소의 관련 토픽과 이름·설명을 검색하고, 별 10,000개 이상인 저장소의 기본 브랜치에서 `SKILL.md` 파일을 확인합니다. 별 개수는 저장소 기준이며, 스킬은 파일 경로를 기준으로 구분합니다. 각 카드의 상세에서 설명과 저장소·스킬 원문 링크를 볼 수 있습니다. 분류는 파일 경로와 저장소 토픽을 기준으로 합니다.

GitHub의 인덱싱 범위와 호출 제한에 따라 일부 저장소는 검색에서 빠질 수 있습니다. 인증 없이 가져올 수 있으며 호출 한도가 필요한 경우 `GITHUB_TOKEN` 환경변수를 설정하고 다시 실행합니다. 요청에 실패하면 기존 목록을 표시합니다. 앱의 초기 목록은 화면을 바로 확인할 수 있도록 GitHub 별 스냅샷과 함께 제공됩니다.
