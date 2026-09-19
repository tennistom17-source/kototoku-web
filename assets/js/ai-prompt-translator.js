(function () {
  'use strict';

  const form = document.querySelector('#prompt-form');
  const result = document.querySelector('#result');
  const cards = document.querySelector('#result-cards');
  const error = document.querySelector('#form-error');
  const status = document.querySelector('#copy-status');
  const generalOptions = document.querySelector('#general-options');
  const socialOptions = document.querySelector('#social-options');
  const generalResult = document.querySelector('#general-result');
  let drafts = [];
  let fullPrompt = '';
  let shortPrompt = '';

  const tasks = {
    document: { label: '資料・文章を作る', role: '編集者・資料作成の専門家', work: '結論を先に示し、タイトル案、構成案、各項目の要点を作成してください。必要なら想定質問と回答案も示してください。', ai: 'ChatGPT、Claude、Gemini' },
    research: { label: '調査・情報を整理する', role: '信頼できる情報を整理するリサーチアシスタント', work: '調べるべき論点を分け、情報源と確認日を示しながら整理してください。事実と推測を区別してください。', ai: 'Gemini、ChatGPT、Claude' },
    development: { label: 'プログラム・Webサイトを作る', role: '既存環境を大切にするWeb開発者', work: '既存の構成と関係するファイルを確認し、変更対象を明確にしてください。既存機能を壊さずに実装し、実装後は構文チェックと動作確認を行ってください。', ai: 'GitHub Copilot' },
    analysis: { label: 'Excel・CSVを分析する', role: 'データ分析者', work: '入力列と出力内容を確認し、不明な列名を想像せず、集計、グラフ、異常値、結論を分けて示してください。', ai: 'ChatGPT、Claude、Gemini' },
    image: { label: '画像を作る', role: 'アートディレクター', work: '主題、構図、色、雰囲気、サイズ、文字の有無を整理してください。避けたい表現も示してください。', ai: '画像生成AI' },
    video: { label: '動画を作る', role: '映像ディレクター', work: '秒数、場面、カメラワーク、音楽、ナレーション、テロップを整理し、映像のトーンと禁止事項を明記してください。', ai: '動画生成AI' },
    ideas: { label: 'アイデアを出す', role: '企画ファシリテーター', work: '異なる切り口の案を複数出し、それぞれの狙い、必要な準備、最初の小さな一歩を整理してください。', ai: 'ChatGPT、Claude、Gemini' },
    other: { label: 'その他の依頼', role: '依頼内容を整理する実務アシスタント', work: '目的を達成するための作業を分解し、必要な確認事項を先に質問してください。', ai: 'ChatGPT、Claude、Gemini' }
  };

  const styles = { saving: '節約型', balance: 'バランス型', quality: '品質優先型', speed: '速度優先型', dev: '開発集中型' };

  const destinations = {
    'instagram-post': { name: 'Instagram投稿', limit: '最大2,200文字', caution: '本文内のURLはクリックされません。プロフィールのリンクへ案内してください。' },
    'instagram-story': { name: 'Instagramストーリーズ', limit: '1枚あたり短く', caution: '1枚に情報を詰め込みすぎず、リンクはリンクスタンプへ設定してください。' },
    'instagram-reel': { name: 'Instagramリール', limit: 'キャプションは最大2,200文字', caution: '冒頭で内容を伝え、詳しい案内はプロフィールのリンクへ誘導します。' },
    threads: { name: 'Threads', limit: '500文字程度を目安', caution: '返信を促す場合は、答えやすい問いを1つに絞ります。' },
    x: { name: 'X', limit: '280文字以内を目安', caution: 'URLや画像を付ける場合は、投稿前に実際の表示を確認してください。' },
    'note-article': { name: 'note記事', limit: '見出しと本文を分ける', caution: 'タイトル、公開設定、画像、引用元を投稿前に確認してください。' },
    'note-post': { name: 'noteつぶやき', limit: '短く1つの話題に', caution: '長くなる場合は、記事への導線を別途確認してください。' },
    tiktok: { name: 'TikTok', limit: 'キャプションは短く', caution: '動画の内容とキャプションが一致しているか確認してください。' },
    youtube: { name: 'YouTube動画説明欄', limit: '冒頭2行を特に簡潔に', caution: '動画に含まれない内容や未公開の予定は書かないでください。' },
    linkedin: { name: 'LinkedIn', limit: '改行を使って読みやすく', caution: '仕事上の情報、他者の名前、公開範囲を確認してください。' },
    facebook: { name: 'Facebook', limit: '要点を先に', caution: '公開範囲と写っている方の同意を確認してください。' },
    line: { name: 'LINE', limit: '短く、相手に合わせて', caution: '送信先と個人情報を確認してから送信してください。' },
    blog: { name: 'ブログ', limit: '見出しと段落を使う', caution: '公開日、引用、リンク先、見出しを確認してください。' }
  };

  const purposeOpenings = {
    'お知らせ': 'お知らせです。',
    'ツール紹介': '使ってみてよかったものを紹介します。',
    '体験談': '最近あったことを記録します。',
    '共感': '同じように感じる人がいるかもしれません。',
    '質問': 'みなさんはどうしていますか？',
    '背中を押す': '無理のない一歩の参考になればうれしいです。'
  };

  function getValue(name) {
    return new FormData(form).get(name) || '';
  }

  function setMode(task) {
    const isSocial = task === 'message';
    generalOptions.hidden = isSocial;
    socialOptions.hidden = !isSocial;
    const messageInput = form.querySelector('input[name="task"][value="message"]');
    messageInput.setAttribute('aria-expanded', String(isSocial));
    result.hidden = true;
    error.hidden = true;
  }

  form.querySelectorAll('input[name="task"]').forEach(function (input) {
    input.addEventListener('change', function () { setMode(input.value); });
  });

  function selectedDestinations() {
    return Array.from(form.querySelectorAll('input[name="destination"]:checked')).map(function (input) {
      return input.value;
    });
  }

  function cleanText(text) {
    return text.trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  }

  function emojiMark(level) {
    if (level === '少なめ') return '🌿 ';
    if (level === 'ふつう') return '🌿 ';
    if (level === '多め') return '🌿✨ ';
    return '';
  }

  function shortenForX(text) {
    if (text.length <= 220) return text;
    const sentence = text.split(/(?<=[。！？!?])|\n/).find(function (item) {
      return item.trim().length > 0;
    }) || text;
    return sentence.trim().slice(0, 210) + '…';
  }

  function hashTagText(source, amount) {
    if (amount === 'なし') return 'ハッシュタグ：なし';
    const existing = source.match(/#[^\s#]+/g) || [];
    if (!existing.length) return 'ハッシュタグ：元の文章にないため、必要な言葉を確認して追加してください。';
    const count = amount === '3個' ? 3 : amount === '5個' ? 5 : existing.length;
    return 'ハッシュタグ：' + existing.slice(0, count).join(' ');
  }

  function linkText(id, guide) {
    if (id === 'instagram-post' || id === 'instagram-reel') return 'リンク案：詳しくはプロフィールのリンクから。';
    if (id === 'instagram-story') return 'リンク案：詳しくはリンクスタンプから。';
    if (guide === 'none') return 'リンク案：URLなし';
    if (guide === 'profile') return 'リンク案：詳しくはプロフィールのリンクから。';
    if (guide === 'sticker') return 'リンク案：詳しくはリンクスタンプから。';
    if (guide === 'direct' || guide === 'auto') return 'リンク案：公開済みの直接URLを確認して本文末尾に添えてください。';
    return 'リンク案：URLなし';
  }

  function makeBody(id, source, purpose, tone, emoji) {
    const opening = purposeOpenings[purpose];
    const decorated = emojiMark(emoji) + source;
    const closing = purpose === '質問' ? 'よければ、あなたの考えも教えてください。' : '';
    if (id === 'instagram-story') return '1枚目\n' + opening + '\n\n2枚目\n' + decorated + (closing ? '\n\n' + closing : '');
    if (id === 'note-article' || id === 'blog') return '見出し案：' + purpose + 'として伝えたいこと\n\n' + opening + '\n\n' + decorated + (closing ? '\n\n' + closing : '') + '\n\n※' + tone + '文体になるよう、公開前に表現を調整してください。';
    if (id === 'x') return emojiMark(emoji) + shortenForX(source) + (closing ? '\n\n' + closing : '');
    return opening + '\n\n' + decorated + (closing ? '\n\n' + closing : '');
  }

  function renderDraft(id, options) {
    const meta = destinations[id];
    const body = makeBody(id, options.source, options.purpose, options.tone, options.emoji);
    const draft = meta.name + '\n\n本文\n' + body + '\n\n' + hashTagText(options.source, options.hashtags) + '\n' + linkText(id, options.linkGuide) + '\n\n文字数目安：' + meta.limit + '\n投稿時の注意：' + meta.caution;
    const card = document.createElement('article');
    card.className = 'result-card';
    card.innerHTML = '<div class="output-head"><div><span class="platform-label">' + meta.name + '</span><h3>' + meta.name + '向けの下書き</h3></div><button class="copy-button" type="button" aria-label="' + meta.name + '向けの下書きをコピー">コピー</button></div><section><h4>本文</h4><p class="draft-body"></p></section><section><h4>ハッシュタグ</h4><p class="draft-tags"></p></section><section><h4>リンク案</h4><p class="draft-link"></p></section><p class="draft-meta"><b>文字数目安：</b>' + meta.limit + '<br><b>投稿時の注意：</b>' + meta.caution + '</p>';
    card.querySelector('.draft-body').textContent = body;
    card.querySelector('.draft-tags').textContent = hashTagText(options.source, options.hashtags).replace('ハッシュタグ：', '');
    card.querySelector('.draft-link').textContent = linkText(id, options.linkGuide).replace('リンク案：', '');
    card.querySelector('.copy-button').addEventListener('click', function () { copyText(draft, meta.name + '向けの下書きをコピーしました'); });
    cards.appendChild(card);
    return draft;
  }

  function createGeneralPrompt(task) {
    const detail = tasks[task];
    const selectedAi = getValue('ai');
    const audience = getValue('audience');
    const format = getValue('format');
    const style = getValue('style');
    const context = getValue('context').trim() || '追加条件はありません。必要な前提が不足している場合は、作業前に質問してください。';
    const priorities = Array.from(form.querySelectorAll('input[name="priority"]:checked')).map(function (input) { return input.value; });
    const priorityText = priorities.length ? priorities.join('、') : '分かりやすさと実用性';
    fullPrompt = '役割：\nあなたは' + detail.role + 'です。\n\n目的：\n' + detail.label + 'を行い、' + audience + 'が使いやすい結果を作成してください。\n\n背景・前提：\n対象者：' + audience + '\n追加条件：' + context + '\n\n指示：\n' + detail.work + '\n\n出力形式：\n' + format + 'で出力してください。\n\n品質・条件：\n重視する点：' + priorityText + '\n不明な点は推測せず、「要確認」と明記してください。\n\n禁止事項：\n個人情報、機密情報、未確認情報を事実のように扱わないでください。';
    shortPrompt = detail.role + 'として、' + audience + 'が使う「' + detail.label + '」を作成してください。' + context + ' 出力は' + format + '。重視する点は' + priorityText + '。不明点は「要確認」と明記してください。';
    document.querySelector('#result-ai').textContent = selectedAi === 'unknown' ? detail.ai : selectedAi;
    document.querySelector('#result-style').textContent = styles[style];
    document.querySelector('#full-prompt').textContent = fullPrompt;
    document.querySelector('#short-prompt').textContent = shortPrompt;
    document.querySelector('#result-title').textContent = 'AIへ渡す依頼文ができました。';
    document.querySelector('#result-description').textContent = '内容を確認して、ご自身の生成AIへ貼り付けてください。';
    generalResult.hidden = false;
    cards.replaceChildren();
    drafts = [];
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (copyError) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    status.textContent = message;
    window.setTimeout(function () { status.textContent = ''; }, 3000);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const task = getValue('task');
    if (!task) {
      error.textContent = '「何をしたいですか」を選んでください。';
      error.hidden = false;
      return;
    }

    if (task !== 'message') {
      if (!getValue('ai')) {
        error.textContent = '使用する生成AIを選んでください。';
        error.hidden = false;
        return;
      }
      error.hidden = true;
      createGeneralPrompt(task);
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const source = cleanText(getValue('sourceText'));
    const selected = selectedDestinations();
    if (!source || !selected.length) {
      error.textContent = !source ? '元になる文章を入力してください。' : '出力先を1つ以上選んでください。';
      error.hidden = false;
      return;
    }
    error.hidden = true;
    generalResult.hidden = true;
    cards.replaceChildren();
    const options = { source: source, audience: getValue('socialAudience'), purpose: getValue('purpose'), tone: getValue('tone'), emoji: getValue('emoji'), hashtags: getValue('hashtags'), linkGuide: getValue('linkGuide') };
    drafts = selected.map(function (id) { return renderDraft(id, options); });
    document.querySelector('#result-title').textContent = '媒体ごとの投稿文ができました。';
    document.querySelector('#result-description').textContent = options.audience + 'へ届ける下書きです。投稿前に内容を確認してください。';
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelector('#copy-all').addEventListener('click', function () {
    const text = drafts.length ? drafts.join('\n\n----------\n\n') : fullPrompt + '\n\n----------\n\n短縮版\n' + shortPrompt;
    copyText(text, drafts.length ? 'すべての下書きをコピーしました' : '依頼文をコピーしました');
  });

  document.querySelector('#open-chatgpt').addEventListener('click', function () {
    window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    copyText(drafts.length ? drafts.join('\n\n----------\n\n') : fullPrompt, 'コピーしました。ChatGPTに貼り付けて調整できます');
  });

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      copyText(button.dataset.copy === 'full' ? fullPrompt : shortPrompt, 'コピーしました');
    });
  });

  document.querySelector('#restart').addEventListener('click', function () {
    form.reset();
    drafts = [];
    fullPrompt = '';
    shortPrompt = '';
    generalOptions.hidden = false;
    socialOptions.hidden = true;
    result.hidden = true;
    form.querySelector('input[name="task"]').focus();
  });
}());