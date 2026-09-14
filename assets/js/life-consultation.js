(() => {
  'use strict';
  const find = selector => document.querySelector(selector);
  const form = find('#consult-form');
  const concern = find('#concern');
  let resultVersion = 0;
  let activeService = null;
  const services = {
    chatgpt: { label: 'ChatGPT', url: 'https://chatgpt.com/' },
    gemini: { label: 'Gemini', url: 'https://gemini.google.com/' },
    claude: { label: 'Claude', url: 'https://claude.ai/new' },
    copilot: { label: 'Microsoft Copilot', url: 'https://copilot.microsoft.com/' },
    other: { label: 'お使いの生成AI', url: null }
  };
  const advisors = {
    'peer-gentle': { label: '優しい同年代', focus: '自分が大切にしたい気持ち', approach: 'すぐに行動を決める前に、本当はどうしたいかを言葉にする見方です。', examples: {
      work: ['周りの期待をいったん外すと、どの作業に納得感がありますか？', '「やりたい」と「気が重い」を一つずつ、誰にも見せないメモに書く。'],
      relationships: ['連絡したい気持ちと、ためらう気持ちには何がありますか？', '相手の反応を予想せず、自分が伝えたい気持ちを一文だけ書く。'],
      family: ['家族に分かってもらいたい負担は何ですか？', '自分が困る場面と、そのときの気持ちを一つ書く。'],
      future: ['他の人と比べなければ、どちらに心が動きますか？', '気になる選択肢の好きなところを一つ書く。'],
      feelings: ['今の気持ちに近い言葉は、焦り、寂しさ、疲れのどれでしょう？', '近い言葉を一つ選ぶ。どれも違えば、自分の言葉で短く書く。']
    } },
    'senior-realistic': { label: '現実的な先輩', focus: '時間と負担の調整', approach: '気合いで全部をこなすより、期限や使える時間から範囲を絞る見方です。', examples: {
      work: ['本当に今日が期限なのはどれですか？', '作業を三つまで書き、期限と所要時間を横に添える。期限が不明なら確認事項にする。'],
      relationships: ['今、やり取りにどれくらい時間を使えそうですか？', '返事を急がせない短い連絡文を下書きする。送るかは後で決める。'],
      family: ['今週、一人で抱えなくてもよい用事はありますか？', '用事を一つ選び、分担を相談できる相手や手段をメモする。安全が心配なら対話を優先しない。'],
      future: ['試すために使える時間と費用はどれくらいですか？', '無理なく使える時間と費用の上限を先に書く。'],
      feelings: ['今日の予定で、延期できるものはありますか？', '急ぎではない用事を一つ見つけ、休める余白を考える。']
    } },
    'parent-longterm': { label: '長い目で見る親世代', focus: '続けられるペース', approach: '今日の成果だけでなく、しばらく続けても負担が増えないかを考える役割です。年齢による知恵の保証ではありません。', examples: {
      work: ['今の進め方を一か月続けたら、何が負担になりそうですか？', '守りたい休憩や学ぶ時間を一つ決め、予定に残せるか考える。'],
      relationships: ['一度の返事より、どんな距離感で付き合っていきたいですか？', '無理なく続けられる連絡の頻度を、自分の希望として書く。'],
      family: ['一度だけ頑張る分担と、毎週続けられる分担は同じですか？', '続けると負担になる習慣を一つ書き、見直す時期を考える。'],
      future: ['今決めても、後で見直せる余地はありますか？', '仮に試す期間と、続けるか見直す日をメモする。'],
      feelings: ['似た気持ちは、どんな時間や場面で起きやすいですか？', '今日の気分と直前の出来事を一行だけ残す。つらさが続く場合は専門家への相談も考える。']
    } },
    'advisor-logical': { label: '論理的な相談役', focus: '事実と予想の区別', approach: 'まだ分からないことを結論にせず、確認できる事実と予想を分ける見方です。', examples: {
      work: ['優先すべき理由は、期限、影響、誰かの期待のどれですか？', '候補を二つ選び、期限と後回しにした場合の影響を並べる。不明な点は不明と書く。'],
      relationships: ['相手が実際に言ったことと、こちらの予想は分けられますか？', '「起きたこと」と「そう思った理由」を別の行に書く。'],
      family: ['分担について合意したことと、暗黙の期待は何ですか？', '確認済みの約束と、まだ確認していない期待を分けて書く。'],
      future: ['選択肢を比べるとき、一番大切な条件は何ですか？', '比べる条件を二つだけ決め、各選択肢の分かる点・分からない点を書く。'],
      feelings: ['起きた出来事と、自分への評価が混ざっていませんか？', '「失敗した人間だ」などの評価ではなく、起きた出来事だけを一文で書く。']
    } },
    'friend-encouraging': { label: '背中を押す友人', focus: '小さく試して分かること', approach: '自信がつくのを待つ以外に、いつでもやめられる小さな試し方を探す役割です。', examples: {
      work: ['五分だけなら、どの作業に触れられそうですか？', '候補を一つ選び、五分だけ下書きする。続けるかはその後に決める。'],
      relationships: ['送信せずに文章を考えるだけなら、できそうですか？', '軽い近況を一文下書きし、読み返してから送るか決める。'],
      family: ['自分だけで試せる、負担の少ない工夫はありますか？', '自分の用事の手順を一つ減らせるか試す。他の人の持ち物や予定は勝手に変えない。'],
      future: ['契約や購入をせず、雰囲気だけ試す方法はありますか？', '気になる活動の無料の紹介や体験情報を一つ調べる。申し込みは別に判断する。'],
      feelings: ['考え続ける以外に、今できる小さな休み方はありますか？', '楽な姿勢で少し休むなど、負担が増えないことを一つ試す。合わなければやめてよい。']
    } }
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
    find('#result-status').textContent = '質問文を作ると、ここで確認・編集できます。';
  }
  function showSafety() {
    clearResult();
    find('#empty-result').hidden = true;
    find('#safety-panel').hidden = false;
    find('#result-status').textContent = '専門家・公的窓口への案内';
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
  form.addEventListener('submit', event => {
    event.preventDefault();
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
    const settings = new FormData(form);
    const genre = settings.get('genre');
    const keys = settings.getAll('advisors');
    if (keys.length !== 3 || new Set(keys).size !== 3 || keys.some(key => !advisors[key])) {
      find('#form-message').textContent = '相談役を3人選んでください。';
      return;
    }
    const selectedAdvisors = keys.map(key => advisors[key]);
    activeService = services[settings.get('target-ai')];
    if (!activeService) return;
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
      const [question, action] = advisor.examples[genre];
      for (const [label, content] of [['着目点', `${advisor.focus}。${advisor.approach}`], ['考える問い', question], ['試すこと', action]]) {
        const text = document.createElement('p');
        const heading = document.createElement('strong');
        heading.textContent = `${label}：`;
        text.append(heading, document.createTextNode(content));
        article.append(text);
      }
      find('#advisor-list').append(article);
    });
    find('#persona-summary').textContent = '相談本文への回答ではなく、選んだ相談役とジャンルに応じた固定の整理例です。';
    find('#common').textContent = 'どの例も、大きな結論を出す前に、負担の小さい確認や試行を提案しています。これは固定例の共通方針で、専門家の合意ではありません。';
    find('#differences').textContent = selectedAdvisors.map((advisor, index) => `${['A', 'B', 'C'][index]}は「${advisor.focus}」を優先`).join('。') + '。どの視点から考えるかは、自分の状況に合わせて選べます。';
    find('#next-step').textContent = '3つの「試すこと」から、今の自分に合うものを一つだけ選ぶ。どれも合わなければ、無理に実行しなくて構いません。';
    find('#empty-result').hidden = true;
    find('#answers').hidden = false;
    const roleText = selectedAdvisors.map((advisor, index) => `${['A', 'B', 'C'][index]}：${advisor.label}\n着目点：${advisor.focus}\n${advisor.approach}\n整理例の問い：${advisor.examples[genre][0]}\n整理例の行動：${advisor.examples[genre][1]}`).join('\n\n');
    find('#generated-prompt').value = `${activeService.label}へ\n\n私はコトトクの「多視点相談室」で、考えを整理するための視点を選びました。答えを決めるのではなく、考えを深める手伝いをしてください。\n\n【進め方】\nまず、私の悩みについて確認したい質問を3つだけしてください。私の回答を待ってから、下記の3役の観点で、それぞれ異なる理由と選択肢を短く提示してください。最後に共通点・意見が分かれる点・今日できる小さな一歩をまとめてください。\n実在の専門家として振る舞わず、年齢や関係による決めつけを避けてください。分からない事情は推測で埋めず、最終判断は私に委ねてください。\n\n【私の悩み】\n${concern.value.trim()}\n\n【ジャンル】\n${find('#genre').selectedOptions[0].textContent}\n\n【選んだ3役と整理例】\n${roleText}\n\n【固定例に共通すること】\n${find('#common').textContent}\n\n【視点の違い】\n${find('#differences').textContent}\n\n【今日の一歩を選ぶヒント】\n${find('#next-step').textContent}\n\n【注意】\n上記の整理例はジャンル別の固定例で、私の悩みを理解して生成された回答ではありません。当てはまらない前提や提案は引き継がないでください。医療・法律・お金の重大な判断や緊急相談はAIだけで扱わず、適切な専門支援へ案内してください。`;
    updateHandoff();
    find('#result-status').textContent = `${activeService.label}に渡す質問文を作りました。まだ送信していません。`;
    find('#results-title').focus();
  });
  find('#reset-demo').addEventListener('click', () => {
    form.reset();
    concern.setCustomValidity('');
    find('#character-count').textContent = '0 / 600文字';
    clearResult();
    updateSelection();
    concern.focus();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) find('#reset-demo').click(); });
  function isUnsafePrompt(value) {
    return riskWords.test(value.replace('医療・法律・お金の重大な判断や緊急相談はAIだけで扱わず、適切な専門支援へ案内してください。', ''));
  }
  function updateHandoff() {
    const value = find('#generated-prompt').value;
    const blocked = !value.trim() || isUnsafePrompt(value);
    find('#copy-prompt').disabled = blocked;
    find('#open-ai').hidden = blocked || !activeService?.url;
    if (!blocked && activeService?.url) {
      find('#open-ai').href = activeService.url;
      find('#open-ai').textContent = `${activeService.label}を開く ↗`;
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
})();