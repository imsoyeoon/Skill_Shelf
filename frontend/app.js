(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const embedded = window.parent !== window && !document.body.hasAttribute('data-standalone');
  const source = $('seed').textContent.trim();
  const demo = source.startsWith('[') ? JSON.parse(source) : [];
  const categories = {
    all: ['전체', ''], frontend: ['프론트엔드', '</>'], design: ['디자인', '◫'],
    backend: ['백엔드', '{ }'], testing: ['테스트·디버깅', '✓'], workflow: ['개발 워크플로', '≡'],
    documents: ['문서·데이터', '▤'], other: ['기타', '···'],
  };
  const welcome = '프로젝트의 목표나 막힌 부분을 알려주세요.';
  const uploadHint = 'ZIP 또는 텍스트 파일 첨부';
  const maxUpload = 4 * 1024 * 1024;
  let catalog = demo;
  let messages = [];
  let mode = 'demo';
  let sourceLabel = '미리보기 데이터';
  let filter = 'all';
  let waiting = false;
  let offset = 6;
  let files = [];
  let skills = new Map();
  let detailRequest = '';
  let pendingRequest = '';
  let activeDetail = '';

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function post(type, props = {}) {
    window.parent.postMessage({isStreamlitMessage: true, type: `streamlit:${type}`, ...props}, '*');
  }

  function sendEvent(action, data = {}) {
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    post('setComponentValue', {value: {id, action, ...data}, dataType: 'json'});
    return id;
  }

  function reviseHeight() {
    if (embedded) post('setFrameHeight', {height: Math.ceil(document.body.getBoundingClientRect().height)});
  }

  function key(skill) { return `${skill.repo}:${skill.path}`; }

  function starLabel(stars) {
    return `${(stars / 1000).toLocaleString('en', {maximumFractionDigits: 1})}k`;
  }

  function status(id, message) {
    $(id).textContent = message || '';
    $(id).hidden = !message;
  }

  function isBusy(next) {
    waiting = next;
    $('refresh').disabled = next;
    $('send').disabled = next;
  }

  function card(skill) {
    const [name, icon] = categories[skill.category] || categories.other;
    const button = el('button', 'card');
    button.type = 'button';
    button.dataset.skill = skill.name;
    const top = el('span', 'card-top');
    top.append(el('span', 'glyph', icon), el('span', 'category', name));
    const footer = el('span', 'card-footer');
    const stars = el('span', '', `☆ ${starLabel(skill.stars)}`);
    stars.title = `저장소 별 ${skill.stars.toLocaleString('ko-KR')}개`;
    footer.append(el('span', '', skill.repo), stars);
    button.append(top, el('h3', '', skill.name), el('p', '', skill.description), footer);
    button.addEventListener('click', () => openDetail(skill));
    return button;
  }

  function renderCatalog() {
    const query = $('search').value.trim().toLocaleLowerCase();
    const result = catalog.filter((skill) => {
      const category = categories[skill.category] || categories.other;
      return (filter === 'all' || skill.category === filter)
        && `${skill.name} ${skill.description} ${skill.repo} ${category[0]}`.toLocaleLowerCase().includes(query);
    });
    const grid = $('grid');
    grid.replaceChildren(...result.slice(0, offset).map(card));
    if (!result.length) grid.append(el('div', 'empty', '조건에 맞는 스킬이 없습니다.'));
    $('count').textContent = `스킬 ${result.length.toLocaleString('ko-KR')}개`;
    $('source').textContent = sourceLabel;
    $('more').hidden = result.length <= offset;
  }

  function renderMessages() {
    const log = $('transcript');
    log.replaceChildren(el('div', 'message', welcome));
    for (const message of messages) {
      const item = el('div', `message ${message.role}`, message.text);
      if (message.recommendations?.length) {
        const list = el('div', 'suggestions');
        for (const match of message.recommendations) {
          const skill = skills.get(match.id) || match.skill;
          if (!skill) continue;
          const button = el('button', 'suggestion');
          button.type = 'button';
          button.append(el('strong', '', skill.name), el('span', '', match.reason));
          button.addEventListener('click', () => openDetail(skill));
          list.append(button);
        }
        item.append(list);
      }
      log.append(item);
    }
    $('examples').hidden = messages.length > 0;
    log.scrollTop = log.scrollHeight;
  }

  function render() {
    skills = new Map(catalog.map((skill) => [key(skill), skill]));
    $('mode').classList.toggle('live', mode === 'ai');
    $('mode').textContent = {ai: 'AI 연결됨', rules: '키워드 추천', demo: '시안 · 예시 추천'}[mode] || '';
    renderCatalog();
    renderMessages();
  }

  function githubLink(text, href, className) {
    const link = el('a', className, text);
    const parsed = new URL(href, 'https://github.com/');
    if (parsed.origin === 'https://github.com') link.href = parsed.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function openDetail(skill) {
    const dialog = $('detail');
    const body = $('detail-body');
    activeDetail = key(skill);
    const trigger = document.activeElement?.getBoundingClientRect();
    const [name, icon] = categories[skill.category] || categories.other;
    const title = el('h2', '', skill.name);
    title.id = 'detail-title';
    const description = el('p', '', skill.description);
    description.id = 'detail-description';
    const repo = skill.repo.split('/').map(encodeURIComponent).join('/');
    const branch = (skill.branch || 'main').split('/').map(encodeURIComponent).join('/');
    const path = skill.path.split('/').map(encodeURIComponent).join('/');
    body.replaceChildren(el('span', 'glyph', icon), title,
      el('div', 'category', `${name} · 저장소 별 ${starLabel(skill.stars)}`), description,
      githubLink('SKILL.md 보기', `https://github.com/${repo}/blob/${branch}/${path}`, 'primary'),
      githubLink('저장소 열기', `https://github.com/${repo}`, 'outline'), el('small', '', `${skill.repo}/${skill.path}`));
    if (!dialog.open) {
      dialog.showModal();
      // A Streamlit iframe can be taller than the visible browser viewport.
      dialog.style.top = '';
      dialog.style.bottom = '';
      if (embedded) {
        const frame = window.frameElement?.getBoundingClientRect();
        const center = frame ? window.parent.innerHeight / 2 - frame.top : trigger?.top;
        if (center !== undefined) {
          dialog.style.top = `${Math.max(10, center - dialog.offsetHeight / 2)}px`;
          dialog.style.bottom = 'auto';
        }
      }
    }
    if (embedded && skill.detail_pending && !waiting) {
      const id = sendEvent('detail', {skill: activeDetail});
      detailRequest = {id, skill: activeDetail};
      pendingRequest = id;
      isBusy(true);
    }
  }

  function score(skill, input) {
    const haystack = `${skill.name} ${skill.tags || ''} ${skill.description}`.toLocaleLowerCase();
    return [...new Set(input.toLocaleLowerCase().match(/[\p{L}\p{N}.+-]{2,}/gu) || [])]
      .reduce((total, term) => total + Number(haystack.includes(term)), 0);
  }

  async function encodeFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return {name: file.name, content: btoa(binary)};
  }

  async function submit(event) {
    event.preventDefault();
    const input = $('prompt');
    const prompt = input.value.trim();
    if (waiting) return;
    if (!prompt && !files.length) {
      status('chat-notice', '프로젝트 설명을 입력하거나 파일을 첨부하세요.');
      input.focus();
      return;
    }
    status('chat-notice', '');
    isBusy(true);
    try {
      if (!embedded) {
        const text = [prompt, ...files.map((file) => file.name)].filter(Boolean).join('\n');
        const best = [...catalog].sort((a, b) => score(b, text) - score(a, text));
        const relevant = best.filter((skill) => score(skill, text) > 0);
        messages.push({role: 'user', text}, {role: 'assistant',
          text: relevant.length ? '입력한 내용과 관련된 예시 스킬입니다.' : '사용 기술이나 해결하고 싶은 작업을 조금 더 구체적으로 적어주세요.',
          recommendations: relevant.slice(0, 3).map((skill) => ({id: key(skill), reason: skill.description}))});
        if (files.length) status('chat-notice', '시안에서는 첨부한 파일 이름으로 예시 추천을 보여드립니다.');
        renderMessages();
      } else {
        const payload = await Promise.all(files.map(encodeFile));
        pendingRequest = sendEvent('recommend', {prompt, files: payload});
        status('chat-notice', '프로젝트에 맞는 스킬을 찾고 있습니다.');
      }
      input.value = '';
      files = [];
      $('upload').value = '';
      $('uploads').textContent = uploadHint;
    } catch {
      status('chat-notice', '첨부파일을 읽지 못했습니다. 다시 선택해 주세요.');
      isBusy(false);
    } finally {
      if (!embedded) isBusy(false);
    }
  }

  for (const [id, [name]] of Object.entries(categories)) {
    const button = el('button', '', name);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(id === 'all'));
    button.addEventListener('click', () => {
      $('filters').querySelector('[aria-pressed=true]').setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      filter = id;
      offset = 6;
      renderCatalog();
    });
    $('filters').append(button);
  }

  $('refresh').addEventListener('click', () => {
    if (!embedded) {
      sourceLabel = '미리보기 데이터';
      renderCatalog();
      status('catalog-notice', 'Streamlit 앱을 실행하면 이 버튼으로 GitHub의 최신 목록을 불러올 수 있습니다.');
      return;
    }
    isBusy(true);
    status('catalog-notice', 'GitHub에서 스킬을 찾고 있습니다.');
    pendingRequest = sendEvent('refresh');
  });
  $('search').addEventListener('input', () => { offset = 6; renderCatalog(); });
  $('more').addEventListener('click', () => { offset += 12; renderCatalog(); });
  $('close').addEventListener('click', () => $('detail').close());
  $('detail').addEventListener('click', (event) => { if (event.target === $('detail')) $('detail').close(); });
  $('composer').addEventListener('submit', submit);
  $('prompt').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      $('composer').requestSubmit();
    }
  });
  document.querySelector('.clip').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('upload').click(); }
  });
  $('upload').addEventListener('change', () => {
    const picked = Array.from($('upload').files);
    if (picked.length > 3 || picked.some((file) => file.size > maxUpload)
        || picked.reduce((size, file) => size + file.size, 0) > 2 * maxUpload) {
      $('upload').value = '';
      files = [];
      $('uploads').textContent = uploadHint;
      status('chat-notice', '파일은 3개까지, 각 4MB와 합계 8MB 이내로 첨부할 수 있습니다.');
      return;
    }
    files = picked;
    const privacy = mode === 'ai' ? ' · 분석용 파일 요약을 OpenAI로 전송합니다.' : '';
    $('uploads').textContent = files.length ? files.map((file) => file.name).join(' · ') + privacy : uploadHint;
    status('chat-notice', '');
  });
  $('examples').addEventListener('click', (event) => {
    if (!event.target.dataset.example) return;
    $('prompt').value = event.target.dataset.example;
    $('prompt').focus();
  });
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = link.getAttribute('href');
      document.querySelectorAll('.nav-link').forEach((item) => item.classList.toggle('active', item.hash === (target === '#top' ? '#recommend' : target)));
      if (target === '#top') document.body.scrollIntoView();
      else document.querySelector(target).scrollIntoView({block: 'start'});
    });
  });

  if (embedded) {
    addEventListener('message', (event) => {
      if (event.source !== window.parent || event.data?.type !== 'streamlit:render') return;
      const args = event.data.args || {};
      catalog = args.catalog || [];
      messages = args.messages || [];
      sourceLabel = args.source || '';
      mode = args.mode || 'rules';
      if (args.processed && args.processed === pendingRequest) {
        isBusy(false);
        pendingRequest = '';
        status('chat-notice', args.chat_notice);
        status('catalog-notice', args.catalog_notice);
      }
      if (detailRequest && args.detail?.id === detailRequest.id && activeDetail === detailRequest.skill
          && $('detail').open && args.detail.description) {
        $('detail-description').textContent = args.detail.description;
        detailRequest = null;
      }
      render();
    });
    post('componentReady', {apiVersion: 1});
    new ResizeObserver(reviseHeight).observe(document.body);
  }
  render();
})();
