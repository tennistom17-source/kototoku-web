(() => {
  'use strict';
  const find = selector => document.querySelector(selector);
  const form = find('#consult-form');
  const concern = find('#concern');
  let resultVersion = 0;
  let activeService = null;
  let pending = false;
  const endpoint = document.querySelector('meta[name="consultation-api"]')?.content || '';
  const configured = /^https:\/\/[^/?#]+\/consult$/.test(endpoint);
  const ready = document.querySelector('meta[name="consultation-ready"]')?.content === 'true';
  let stopped = configured && ready ? '' : 'NOT_CONFIGURED';
  const stopReasons = {
    MONTHLY_LIMIT: ['今月の運営予算・利用枠の上限に達したため、新しい相談をお休みしています。あなた個人の使いすぎではなく、サイト全体の上限です。', '翌月以降、運営者が予算を確認してから再開します。月が変わっても自動では再開しません。'],
    DAILY_LIMIT: ['今日のサイト全体の受付数が上限に達しました。', '明日（日本時間）以降、ページを開き直してお試しください。月の予算上限などで引き続きお休みの場合もあります。'],
    BUDGET_REVIEW: ['運営者が利用料金を確認する必要があるため、新しい相談を止めています。', '確認が終わるまでお待ちください。再開時期は未定です。'],
    NOT_CONFIGURED: ['AIの接続準備、または今月の予算確認がまだ終わっていません。', '準備と確認が整うまで、新しい相談の受付はお休みです。']
  };
  const submitLabel = find('#consult-submit').textContent;
  function updateAvailability() {
    const reason = stopReasons[stopped];
    find('#availability-panel').dataset.state = reason ? 'stopped' : 'ready';
    find('#availability-title').textContent = reason ? '今は使えません' : pending ? '相談を受け付けています' : '相談を送れます';
    find('#availability-reason').textContent = reason ? reason[0] : pending ? 'AIが考えています。続けて送らず、そのままお待ちください。' : '同意して生成ボタンを押すと、受付時に利用枠を確認します。';
    find('#availability-next').textContent = reason ? reason[1] : 'サイト全体の利用枠がなくなった場合は、この場所でお知らせします。';
    find('#consult-submit').disabled = !!reason || pending;
    find('#consult-submit').textContent = reason ? '今は使えません（受付休止中）' : pending ? 'AIが考えています…' : submitLabel;
    find('#connection-status').textContent = reason ? `今は使えません。${reason[0]}` : '同意して送信するとOpenAIが回答を考えます。受付時に利用枠を確認します。';
  }
  const services = {
    chatgpt: { label: 'ChatGPT', url: 'https://chatgpt.com/' },
    gemini: { label: 'Gemini', url: 'https://gemini.google.com/' },
    claude: { label: 'Claude', url: 'https://claude.ai/new' },
    copilot: { label: 'Microsoft Copilot', url: 'https://copilot.microsoft.com/' },
    other: { label: 'お使いの生成AI', url: null }
  };
  const advisors = {
    'peer-gentle': { label: '優しい同年代', focus: '自分が大切にしたい気持ち' },
    'senior-realistic': { label: '現実的な先輩', focus: '時間と負担の調整' },
    'parent-longterm': { label: '長い目で見る親世代', focus: '続けられるペース' },
    'advisor-logical': { label: '論理的な相談役', focus: '事実と予想の区別' },
    'friend-encouraging': { label: '背中を押す友人', focus: '小さく試して分かること' }
  };
  const riskWords = /死にたい|自殺|自傷|消えたい|殺したい|殺す|虐待|暴力|\bDV\b|診断|薬|訴訟|法律|投資|借金|犯罪|suicid|self[- ]?harm|kill myself/i;
  for (const [key, advisor] of Object.entries(advisors)) {
    const label = document.createElement('label');
    label.className = 'advisor-choice';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'advisors';
    checkbox.value = key;
    checkbox.defaultChecked = ['peer-gentle', 'senior-realistic', 'parent-longterm'].includes(key);
    const text = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = advisor.label;
    const detail = document.createElement('small');
    detail.textContent = advisor.focus;
    text.append(title, detail);
    label.append(checkbox, text);
    find('#advisor-options').append(label);
  }
  function updateSelection() {
    const checkboxes = [...form.querySelectorAll('[name="advisors"]')];
    const count = checkboxes.filter(checkbox => checkbox.checked).length;
    for (const checkbox of checkboxes) checkbox.disabled = count >= 3 && !checkbox.checked;
    find('#selection-status').textContent = `${count} / 3人を選択中。${count === 3 ? '入れ替えるには選択を一つ外してください。' : '3人選ぶと質問文を作れます。'}`;
  }
  function updateServiceLink() {
    const service = services[find('#target-ai').value];
    const link = find('#selected-ai-link');
    const blocked = find('#urgent').checked || riskWords.test(concern.value) || !find('#safety-panel').hidden;
    link.hidden = blocked || !service?.url;
    if (!link.hidden) {
      link.href = service.url;
      link.textContent = `${service.label}を開く ↗`;
    } else link.removeAttribute('href');
  }
  function clearResult() {
    resultVersion += 1;
    activeService = null;
    find('#generated-prompt').value = '';
    find('#copy-status').textContent = '';
    find('#copy-prompt').disabled = false;
    find('#open-ai').hidden = true;
    find('#open-ai').removeAttribute('href');
    find('#answers').hidden = true;
    find('#safety-panel').hidden = true;
    find('#empty-result').hidden = false;
    find('#advisor-list').replaceChildren();
    for (const selector of ['#persona-summary', '#common', '#differences', '#next-step', '#form-message']) find(selector).textContent = '';
    find('#result-status').textContent = '3役の問いとまとめ、その後に生成AIへ渡す質問文を表示します。';
    updateServiceLink();
  }
  function showSafety() {
    clearResult();
    find('#empty-result').hidden = true;
    find('#safety-panel').hidden = false;
    find('#result-status').textContent = '専門家・公的窓口への案内';
    updateServiceLink();
  }
  function showDemo() {
    clearResult();
    activeService = services[find('#target-ai').value] || services.other;
    const demoAdvisors = [
      ['優しい同年代', '迷っている気持ちを急いで結論にしなくて大丈夫です。今の自分が何を大切にしたいか、言葉にしてみましょう。', '続けたいことと、変えたいことを一つずつ挙げるとしたら何ですか？', '今日は5分だけ、気になることをメモしてみます。'],
      ['現実的な先輩', '大きく変える前に、時間や負担を小さく見積もると続けやすくなります。', '今の生活で無理なく使えそうな時間は、週にどれくらいありますか？', '一週間だけ試せる小さな予定を一つ決めます。'],
      ['背中を押す友人', '考え続けるだけでなく、失敗しても戻せる形で試すと新しい発見があります。', '試したあとに「合う・合わない」を何で判断しますか？', '最初の一歩を誰かに話すか、カレンダーに入れます。']
    ];
    demoAdvisors.forEach(([label, opinion, question, action], index) => {
      const article = document.createElement('article');
      article.className = 'advisor';
      const header = document.createElement('header');
      const symbol = document.createElement('span');
      symbol.className = 'advisor-symbol';
      symbol.textContent = ['A', 'B', 'C'][index];
      symbol.setAttribute('aria-hidden', 'true');
      const title = document.createElement('h3');
      title.textContent = `相談役${['A', 'B', 'C'][index]} / ${label}の視点（例）`;
      header.append(symbol, title);
      article.append(header);
      for (const [headingText, content] of [['考え方', opinion], ['考える問い', question], ['試すこと', action]]) {
        const paragraph = document.createElement('p');
        const heading = document.createElement('strong');
        heading.textContent = `${headingText}：`;
        paragraph.append(heading, document.createTextNode(content));
        article.append(paragraph);
      }
      find('#advisor-list').append(article);
    });
    find('#persona-summary').textContent = 'これは端末内で表示している固定の例です。入力した相談内容は使わず、CloudflareやOpenAIへも送信しません。';
    find('#common').textContent = '自分の気持ち、使える時間、小さく試す方法を分けて考える例です。';
    find('#differences').textContent = '気持ちを整えること、現実的な負担を見ること、試して確かめることに着目点の違いがあります。';
    find('#next-step').textContent = '気になっていることを一つ書き出し、無理のない短い時間で試せる形にします。';
    find('#empty-result').hidden = true;
    find('#answers').hidden = false;
    find('#generated-prompt').value = `${activeService.label}へ\n\nこれは送信しない例です。自分の気持ち、使える時間、まず小さく試せることを分けて整理する質問をしてください。`;
    updateHandoff();
    find('#result-status').textContent = '送信しない例を表示しています。入力内容は使わず、外部へ送信していません。';
    find('#results-title').focus();
  }
  concern.addEventListener('input', () => {
    find('#character-count').textContent = `${concern.value.length} / 600文字`;
    concern.setCustomValidity('');
  });
  form.addEventListener('input', () => { clearResult(); updateSelection(); });
  form.addEventListener('change', () => { clearResult(); updateSelection(); if (find('#urgent').checked) showSafety(); });
  find('#urgent').addEventListener('change', () => {
    if (find('#urgent').checked) showSafety();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || stopped) return;
    clearResult();
    if (find('#urgent').checked || riskWords.test(concern.value)) {
      showSafety();
      find('#results-title').focus();
      return;
    }
    if (!concern.value.trim() || concern.value.length > 600) {
      concern.setCustomValidity('空白だけでなく、600文字以内で入力してください。');
      concern.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    if (!configured) { find('#form-message').textContent = 'AI接続の準備中です。固定回答では代替しません。'; return; }
    if (!find('#api-consent').checked) { find('#form-message').textContent = '送信先とデータの取扱いを確認し、同意してください。'; return; }
    const settings = new FormData(form);
    const keys = settings.getAll('advisors');
    if (keys.length !== 3 || new Set(keys).size !== 3 || keys.some(key => !advisors[key])) {
      find('#form-message').textContent = '相談役を3人選んでください。';
      return;
    }
    const selectedAdvisors = keys.map(key => advisors[key]);
    activeService = services[settings.get('target-ai')];
    if (!activeService) return;
    const version = resultVersion;
    pending = true;
    updateAvailability();
    find('#answers').setAttribute('aria-busy', 'true');
    find('#result-status').textContent = 'OpenAIで3役の言葉・まとめ・引き継ぎ文を生成しています。';
    try {
    const response = await fetch(endpoint, {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concern: concern.value.trim(), genre: settings.get('genre'), advisors: keys, targetAI: settings.get('target-ai'), consent: true, requestId: crypto.randomUUID() }),
      signal: AbortSignal.timeout(70000)
    });
    const result = await response.json();
    if (result.code === 'FORBIDDEN') {
      stopped = 'NOT_CONFIGURED';
      updateAvailability();
    }
    if (Object.hasOwn(stopReasons, result.code)) {
      stopped = result.code;
      updateAvailability();
    }
    if (version !== resultVersion) return;
    if (result.code === 'SAFETY_REFERRAL') { showSafety(); return; }
    const messages = {
      MONTHLY_LIMIT: '今月のサイト全体の利用上限に達しました。受付を停止しています。',
      DAILY_LIMIT: '本日のサイト全体の受付上限に達しました。',
      BUSY: '現在ほかの生成を処理中、または受付間隔の制限中です。1分以上あけてください。',
      DUPLICATE: 'この依頼は受付済みです。自動再送はしません。',
      BUDGET_REVIEW: '費用の確認が必要になったため、受付を停止しています。',
      NOT_CONFIGURED: '現在は準備中です。AI接続または今月の予算確認が未完了のため停止しています。',
      FORBIDDEN: '現在は準備中です。正式開始までお待ちください。'
    };
    if (!response.ok || result.mode !== 'live') throw new Error(messages[result.code] || '生成できませんでした。自動再試行や固定回答への置き換えはしません。');
    const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
    if (result.safe !== true || !Array.isArray(result.advisors) || result.advisors.length !== 3 ||
      !result.advisors.every((advisor, index) => advisor.id === keys[index] && text(advisor.opinion, 240) && text(advisor.question, 180) && text(advisor.action, 180)) ||
      !text(result.common, 300) || !text(result.differences, 300) || !text(result.nextStep, 240) || !text(result.prompt, 1200)) throw new Error('生成結果の形式を確認できませんでした。回答は表示しません。');
    selectedAdvisors.forEach((advisor, index) => {
      const article = document.createElement('article');
      article.className = 'advisor';
      const header = document.createElement('header');
      const symbol = document.createElement('span');
      symbol.className = 'advisor-symbol';
      symbol.textContent = ['A', 'B', 'C'][index];
      symbol.setAttribute('aria-hidden', 'true');
      const title = document.createElement('h3');
      title.textContent = `相談役${['A', 'B', 'C'][index]} / ${advisor.label}の視点`;
      header.append(symbol, title);
      article.append(header);
      const generated = result.advisors[index];
      for (const [label, content] of [['考え方', generated.opinion], ['考える問い', generated.question], ['試すこと', generated.action]]) {
        const text = document.createElement('p');
        const heading = document.createElement('strong');
        heading.textContent = `${label}：`;
        text.append(heading, document.createTextNode(content));
        article.append(text);
      }
      find('#advisor-list').append(article);
    });
    find('#persona-summary').textContent = 'OpenAIが今回の相談本文に応じて生成した3つの観点です。同じAIの役割分けであり、独立した専門家の合意ではありません。';
    find('#common').textContent = result.common;
    find('#differences').textContent = result.differences;
    find('#next-step').textContent = result.nextStep;
    find('#empty-result').hidden = true;
    find('#answers').hidden = false;
    find('#generated-prompt').value = `${activeService.label}へ\n\n${result.prompt}`;
    updateHandoff();
    find('#result-status').textContent = `OpenAIで生成しました。最後に${activeService.label}へ渡す質問文があります。引き継ぎ先にはまだ送信していません。`;
    find('#results-title').focus();
    } catch (error) {
      if (version === resultVersion) {
        clearResult();
        find('#form-message').textContent = error.name === 'TimeoutError' || error instanceof TypeError ? '通信を完了できませんでした。自動再送はしません。受付済みの場合は利用枠を消費します。' : error.message;
        find('#result-status').textContent = 'AI回答は表示していません。';
      }
    } finally {
      pending = false;
      updateAvailability();
      find('#answers').removeAttribute('aria-busy');
    }
  });
  find('#reset-demo').addEventListener('click', () => {
    form.reset();
    concern.setCustomValidity('');
    find('#character-count').textContent = '0 / 600文字';
    clearResult();
    updateSelection();
    concern.focus();
  });
  find('#demo-response').addEventListener('click', showDemo);
  window.addEventListener('pageshow', event => { if (event.persisted) find('#reset-demo').click(); });
  function isUnsafePrompt(value) {
    return riskWords.test(value);
  }
  function updateHandoff() {
    const value = find('#generated-prompt').value;
    const blocked = !value.trim() || isUnsafePrompt(value);
    find('#copy-prompt').disabled = blocked;
    find('#open-ai').hidden = blocked || !activeService?.url;
    if (!blocked && activeService?.url) {
      find('#open-ai').href = activeService.url;
      find('#open-ai').textContent = `2. ${activeService.label}を開く ↗`;
    } else find('#open-ai').removeAttribute('href');
    return !blocked;
  }
  find('#generated-prompt').addEventListener('input', () => {
    resultVersion += 1;
    find('#copy-status').textContent = '';
    if (isUnsafePrompt(find('#generated-prompt').value)) { showSafety(); return; }
    updateHandoff();
  });
  find('#copy-prompt').addEventListener('click', async () => {
    if (find('#answers').hidden || !updateHandoff()) return;
    const value = find('#generated-prompt').value;
    const version = resultVersion;
    try {
      await navigator.clipboard.writeText(value);
      if (version === resultVersion) find('#copy-status').textContent = 'コピーしました。ご自身の生成AIに貼り付けてください。';
    } catch {
      if (version === resultVersion) {
        find('#generated-prompt').focus();
        find('#generated-prompt').select();
        find('#copy-status').textContent = '自動コピーできませんでした。選択した質問文を手動でコピーしてください。';
      }
    }
  });
  find('#input-fields').disabled = false;
  updateSelection();
  updateServiceLink();
  updateAvailability();
  find('a[href="#data-details"]').addEventListener('click', () => { find('#data-details').open = true; });
})();