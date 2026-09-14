(() => {
  'use strict';
  const find = selector => document.querySelector(selector);
  const form = find('#consult-form');
  const concern = find('#concern');
  const limit = 3;
  let used = 0;
  const examples = {
    work: ['仕事について、続けたいことと負担になっていることを分けてみましょう。迷っている自分を責める必要はありません。', '時間・生活費・今ある支援を整理し、大きな決断の前に試せる変更を探しましょう。', '続けるか辞めるかの二択以外にも、役割の相談や短い学習など、戻せる試し方があります。', '今の仕事で残したいことと変えたいことを、1つずつメモする。'],
    relationships: ['相手への気持ちと、自分が大切にしたいことは両方あってよいものです。まず分けて書いてみましょう。', '実際に起きた出来事と、相手の意図についての推測を分けると、伝える内容を整理しやすくなります。', 'すぐに話し合う以外に、少し距離を置く、短い文章で伝えるなど、負担の少ない方法も考えられます。', '相手への評価ではなく、自分が困った具体的な場面を1つ書く。'],
    family: ['近い関係だからこそ、気を使いすぎることもあります。自分の負担も大切な情報として扱いましょう。', '家事や時間の分担など、見える条件から整理し、無理なく頼めることを探しましょう。', '全員が一度に納得するより、小さい変更を一つ試すという進め方もあります。安全が心配な場合は話し合いを優先しないでください。', '一人で引き受けていることを1つ書き、頼めそうな支援を考える。'],
    future: ['将来がまだ決まらなくても、今気になることを大切にしてよいと思います。焦りと興味を分けてみましょう。', '費用・使える時間・期限を整理し、今すぐ必要な判断と、後でもよい判断を分けましょう。', '正解を一つ選ぶ前に、小さな体験や情報収集で選択肢を増やす方法もあります。', '気になる選択肢を1つ選び、確認したい情報を1つ書く。'],
    feelings: ['うまく言葉にならない気持ちがあっても構いません。今の気分に近い言葉を一つ探すところから始めましょう。', '今起きていること、自分で変えられること、休める時間を分けて考えてみましょう。', '考え続ける以外にも、短く休む、安心できる人に話すなどの方法があります。つらさが続く場合は専門家への相談も選択肢です。', '今の気持ちを一言だけ書き、今日は何を減らせそうか考える。']
  };
  const openings = {
    '優しい': '急いで答えを出さなくても大丈夫です。',
    '現実的': '今できる範囲から考えてみましょう。',
    '率直': '一度に全部を解決しようとしなくてよいと思います。',
    '論理的': '気持ち・条件・選択肢を分けて整理します。',
    '背中を押す': '負担の少ない一歩から、試してみませんか。'
  };
  const riskWords = /死にたい|自殺|自傷|消えたい|殺したい|殺す|虐待|暴力|DV|診断|薬|訴訟|法律|suicid|self[- ]?harm|kill myself/i;
  function clearResult() {
    find('#answers').hidden = true;
    find('#safety-panel').hidden = true;
    find('#empty-result').hidden = false;
    find('#advisor-list').replaceChildren();
    for (const selector of ['#persona-summary', '#common', '#differences', '#next-step', '#form-message']) find(selector).textContent = '';
    find('#result-status').textContent = '相談後に、3人の意見と整理の例を表示します。';
  }
  function updateQuota() {
    const stopped = used >= limit || find('#demo-state').value === 'limit';
    find('#consult-submit').disabled = stopped;
    find('#quota-status').textContent = stopped
      ? '月間上限に達しました。新しい相談は翌月まで停止します。（デモ表示・実際の利用枠ではありません）'
      : `デモ残り ${limit - used} / ${limit} 回。再読み込みで戻ります。本番の制限はサーバーで管理する設計です。`;
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
  form.addEventListener('input', clearResult);
  find('#urgent').addEventListener('change', () => {
    if (find('#urgent').checked) showSafety();
  });
  find('#demo-state').addEventListener('change', () => { clearResult(); updateQuota(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearResult();
    if (find('#urgent').checked || riskWords.test(concern.value)) {
      showSafety();
      find('#results-title').focus();
      return;
    }
    if (used >= limit || find('#demo-state').value === 'limit') { updateQuota(); return; }
    if (!concern.value.trim() || concern.value.length > 600) {
      concern.setCustomValidity('空白だけでなく、600文字以内で入力してください。');
      concern.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    if (find('#demo-state').value === 'error') {
      find('#form-message').textContent = '接続できませんでした（デモ）。自動再試行はしません。実際の通信・課金は発生していません。';
      return;
    }
    const settings = new FormData(form);
    const sample = examples[settings.get('genre')];
    const labels = ['相談役A / 気持ち', '相談役B / 現実条件', '相談役C / 選択肢'];
    labels.forEach((label, index) => {
      const article = document.createElement('article');
      article.className = 'advisor';
      const header = document.createElement('header');
      const symbol = document.createElement('span');
      symbol.className = 'advisor-symbol';
      symbol.textContent = ['A', 'B', 'C'][index];
      symbol.setAttribute('aria-hidden', 'true');
      const title = document.createElement('h3');
      title.textContent = label;
      const text = document.createElement('p');
      text.textContent = `${openings[settings.get('tone')]} ${sample[index]}`;
      header.append(symbol, title);
      article.append(header, text);
      find('#advisor-list').append(article);
    });
    find('#persona-summary').textContent = `選択した人物像：${settings.get('age')} / ${settings.get('gender')} / ${settings.get('relation')} / ${settings.get('tone')}。デモでは年齢・性別・関係は設定表示のみで、ジャンルと話し方に応じた固定例です。`;
    find('#common').textContent = '結論を急がず、自分の負担と大切にしたいことを整理する点は共通しています。これは独立した3人の専門家の合意ではありません。';
    find('#differences').textContent = 'Aは気持ちを受け止めること、Bは時間や支援などの条件確認、Cは別の試し方を優先します。どの順番が合うかは状況によって変わります。';
    find('#next-step').textContent = sample[3];
    find('#empty-result').hidden = true;
    find('#answers').hidden = false;
    find('#result-status').textContent = '固定の回答例を表示しました。相談本文に合わせたAI回答ではありません。';
    used += 1;
    updateQuota();
    find('#results-title').focus();
  });
  find('#reset-demo').addEventListener('click', () => {
    form.reset();
    concern.setCustomValidity('');
    find('#demo-state').value = 'ready';
    used = 0;
    find('#character-count').textContent = '0 / 600文字';
    clearResult();
    updateQuota();
    concern.focus();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) find('#reset-demo').click(); });
  find('#input-fields').disabled = false;
  updateQuota();
})();