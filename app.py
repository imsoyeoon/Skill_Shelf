import os

import streamlit as st
from streamlit.components.v1 import declare_component

from catalog import ROOT, SEED, ServiceError, fetch_description, recommend, refresh_catalog, skill_id, summarize_uploads


st.set_page_config(page_title='Skill Shelf', layout='wide', initial_sidebar_state='collapsed')
st.html('''<style>
    :root, body, [data-testid="stAppViewContainer"] {background: #f6f6f4 !important;}
    [data-testid="stHeader"], [data-testid="stToolbar"], [data-testid="stDecoration"] {display: none !important;}
    [data-testid="stMainBlockContainer"] {padding: 0 !important; max-width: none !important;}
    iframe {display: block; border: 0 !important;}
</style>''')


def handle_event(event, state, token):
    state.processed = event['id']
    state.detail = None
    action = event.get('action')
    if action == 'refresh':
        try:
            catalog, checked, issues = refresh_catalog()
            state.catalog = catalog
            state.source = f'GitHub · 저장소 {checked:,}개 확인'
            state.catalog_notice = f'일부 결과가 누락될 수 있습니다. {issues}' if issues else ''
        except ServiceError as error:
            state.catalog_notice = str(error)
    elif action == 'detail':
        match = next((skill for skill in state.catalog if skill_id(skill) == event.get('skill')), None)
        if match and match.get('detail_pending'):
            try:
                text = fetch_description(match)
                match.update({'description': text or match['description'], 'detail_pending': False})
                state.detail = {'id': event['id'], 'description': match['description']}
            except ServiceError:
                state.detail = {'id': event['id'], 'description': f"{match['description']}\n\nSKILL.md 설명을 가져오지 못했습니다."}
    elif action == 'recommend':
        prompt = str(event.get('prompt', ''))[:6000].strip()
        files = event.get('files', [])
        files = [entry for entry in files[:3] if isinstance(entry, dict)] if isinstance(files, list) else []
        summary, errors = summarize_uploads(files)
        state.chat_notice = errors
        if not prompt and not summary:
            return
        names = ', '.join(str(file.get('name', ''))[:200] for file in files)
        visible_text = '\n'.join(part for part in (prompt, f'첨부 · {names}' if names else '') if part)
        current = '\n\n'.join(part for part in (prompt, summary) if part)
        context = f'{current}\n\n이전 대화의 프로젝트 정보\n{state.previous}' if state.previous else current
        text, matches, notice = recommend(state.catalog, context[:20000], token)
        recommendations = [{'id': skill_id(skill), 'reason': reason, 'skill': dict(skill)} for skill, reason in matches]
        state.messages = (state.messages + [
            {'role': 'user', 'text': visible_text},
            {'role': 'assistant', 'text': text, 'recommendations': recommendations},
        ])[-24:]
        state.previous = '\n\n'.join([current, state.previous])[:7000]
        state.chat_notice = ' '.join(part for part in (errors, notice) if part)


state = st.session_state
if 'catalog' not in state:
    state.catalog = [dict(item) for item in SEED]
    state.messages = []
    state.source = '초기 목록 · GitHub 저장소 별 스냅샷'
    state.processed = ''
    state.chat_notice = ''
    state.catalog_notice = ''
    state.detail = None
    state.previous = ''

token = os.getenv('OPENAI_API_KEY', '').strip()
panel = declare_component('skill_shelf', path=str(ROOT / 'frontend'))
event = panel(
    key='skill_shelf', default=None, catalog=state.catalog, messages=state.messages,
    source=state.source, mode='ai' if token else 'rules', processed=state.processed,
    detail=state.detail, chat_notice=state.chat_notice, catalog_notice=state.catalog_notice,
)
if isinstance(event, dict) and event.get('id') and event['id'] != state.processed:
    handle_event(event, state, token)
    st.rerun()
