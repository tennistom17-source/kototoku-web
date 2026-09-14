(function () {
  "use strict";
  const find = selector => document.querySelector(selector);
  const form = find("#diagnosis-form");
  const core = globalThis.ModelCompare;
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const format = value => value.toLocaleString("ja-JP");
  let data, rules, models = [], ready = false;
  const trialRecords = new Map();

  function renderTrialResult() {
    const values = Object.fromEntries(new FormData(find("#trial-form")));
    const result = core.compareTrials(
      { wait: values.first_wait, review: values.first_review, passed: values.first_passed },
      { wait: values.second_wait, review: values.second_review, passed: values.second_passed }
    );
    const output = find("#trial-result");
    if (!result) {
      output.textContent = "2つの試行の時間（0秒以上）と合格項目数（0〜4）を入力してください。";
      return;
    }
    const summary = `試行A：${format(result.firstTotal)}秒 / 試行B：${format(result.secondTotal)}秒。`;
    if (!values.same_conditions || values.first_environment !== values.second_environment) {
      output.textContent = `${summary}条件が同じか未確認のため、比較判定は保留です。`;
    } else if (!result.qualityMatched) {
      output.textContent = `${summary}両方が4項目に合格していないため、時間だけでは優劣を判定できません。`;
    } else {
      output.textContent = `${summary}両方4項目合格。${result.difference === 0 ? "合計時間は同じです。" : `今回の記録では試行${result.firstTotal < result.secondTotal ? "A" : "B"}が${format(result.difference)}秒速く完了しました。`}別の課題や試行でも同じ差が出るとは限りません。`;
    }
  }

  function renderTrials() {
    const exampleId = find("#guide-example").value;
    const record = trialRecords.get(exampleId) || {};
    const options = data.model_guide.profiles.map(profile => `<option value="${escape(profile.id)}">${escape(profile.name)}</option>`).join("");
    find("#trial-inputs").innerHTML = ['first', 'second'].map((prefix, index) => `<fieldset><legend>試行${index === 0 ? "A" : "B"}</legend>
      <label>モデル<select name="${prefix}_model">${options}</select></label>
      <label>利用環境<select name="${prefix}_environment"><option>Chat</option><option>Work</option><option>Codex</option><option>API</option></select></label>
      <label>推論設定<select name="${prefix}_reasoning"><option>既定 / 不明</option><option>Instant</option><option>Medium</option><option>High</option><option>Extra High</option><option>Pro</option></select></label>
      <label>生成待ち（秒）<input type="number" min="0" step="any" inputmode="decimal" name="${prefix}_wait" required></label>
      <label>確認・手直し（秒）<input type="number" min="0" step="any" inputmode="decimal" name="${prefix}_review" required></label>
      <label>合格項目数（4項目中）<input type="number" min="0" max="4" step="1" inputmode="numeric" name="${prefix}_passed" required></label></fieldset>`).join("");
    const form = find("#trial-form");
    form.elements.first_model.value = 'terra';
    form.elements.second_model.value = 'sol';
    form.elements.first_environment.value = 'Codex';
    form.elements.second_environment.value = 'Codex';
    form.elements.same_conditions.checked = Boolean(record.same_conditions);
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'same_conditions' && form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
    }
    renderTrialResult();
  }

  function priceText(plan) {
    const yen = core.monthlyYen(plan, data.usd_to_jpy);
    if (yen === null) return "料金未確認";
    if (plan.tier === "free") return "0円 / 月";
    const original = `${format(plan.price)}${plan.currency === "USD" ? " USD" : "円"}`;
    const suffix = plan.price_from ? "から" : "";
    if (plan.billing === "annual") return `約${format(yen)}円 / 月相当（年払い ${original}${suffix}）`;
    return `${original} / 月${suffix}${plan.currency === "USD" ? `（約${format(yen)}円）` : ""}`;
  }

  function official(model) {
    return `<a href="${escape(model.source_url)}" target="_blank" rel="noopener">公式料金・モデル情報 ↗</a><small>${model.last_checked ? `確認日：${escape(model.last_checked)}` : "料金・モデル対応は未確認"}</small>`;
  }

  function guideLink(model) {
    if (model.service_name !== "ChatGPT") return "";
    const profile = model.plan.name === "Pro" ? "astra" : model.plan.name === "Plus" ? "sol" : "luna";
    return `<a class="guide-link" href="#model-guide-title" data-guide-model="${profile}">モデルの使いどころ・根拠・例題 ↓</a>`;
  }

  function renderGuide() {
    const guide = data.model_guide;
    const profile = guide.profiles.find(item => item.id === find("#guide-model").value);
    const example = guide.examples.find(item => item.id === find("#guide-example").value);
    find("#guide-profile").innerHTML = `<h3>${escape(profile.name)}：${escape(profile.role)}</h3>
      <div class="guide-facts"><div><h4>公式に確認できること</h4><p>${escape(profile.fact)}</p>
      <p><b>使える場所・条件</b><br>${escape(profile.availability)}</p>
      <a href="${escape(guide.source_url)}" target="_blank" rel="noopener">${escape(guide.source_title)} ↗</a><small>確認日：${escape(guide.checked_at)}</small></div>
      <div><h4>使い分けの提案（コトトク）</h4><p>${escape(profile.suggestion)}</p><p><b>替える目安・替えなくてよい場合</b><br>${escape(profile.switch_when)}</p></div></div>`;
    find("#guide-prompt-title").textContent = example.title;
    find("#guide-prompt").value = example.prompt;
    find("#guide-checks").innerHTML = example.checks.map(check => `<li>${escape(check)}</li>`).join("");
    find("#guide-expected").textContent = example.expected;
    find("#guide-comparison").textContent = example.comparison;
    find("#guide-copy-status").textContent = "";
    find(".guide-answer").open = false;
    renderTrials();
  }

  function initGuide() {
    const guide = data.model_guide;
    find("#guide-notice").textContent = guide.notice;
    find("#guide-model").innerHTML = guide.profiles.map(profile => `<option value="${escape(profile.id)}">${escape(profile.name)} / ${escape(profile.role)}</option>`).join("");
    find("#guide-example").innerHTML = guide.examples.map(example => `<option value="${escape(example.id)}">${escape(example.title)}</option>`).join("");
    find("#guide-model").value = "terra";
    find("#guide-example").value = "coding";
    find("#guide-history").innerHTML = guide.history.map(entry => `<li><b>${escape(entry.date)} / ${escape(entry.kind)}</b><p>${escape(entry.change)}</p><a href="${escape(entry.source_url)}" target="_blank" rel="noopener">確認した公式情報 ↗</a></li>`).join("");
    const efficiency = guide.efficiency_example;
    const firstTotal = efficiency.first.wait_seconds + efficiency.first.review_seconds;
    const secondTotal = efficiency.second.wait_seconds + efficiency.second.review_seconds;
    const duration = seconds => `${Math.floor(seconds / 60)}分${seconds % 60 ? `${seconds % 60}秒` : ""}`;
    find("#guide-efficiency-content").innerHTML = `<p class="guide-disclaimer">${escape(efficiency.label)}</p><dl class="efficiency-times">
      ${[efficiency.first, efficiency.second].map(trial => `<div><dt>${escape(trial.label)}</dt><dd>生成待ち ${trial.wait_seconds}秒 + 確認・手直し ${duration(trial.review_seconds)}<br><b>合計 ${duration(trial.wait_seconds + trial.review_seconds)}</b></dd></div>`).join("")}</dl>
      <p><b>この仮定では${duration(firstTotal - secondTotal)}短縮（約${Math.round((firstTotal - secondTotal) / firstTotal * 100)}%）。</b>待ち時間が長くても、手直し込みで早く終わる場合があります。</p><p>${escape(efficiency.note)}</p>`;
    renderGuide();
    find("#model-guide").hidden = false;
  }

  function card(model) {
    const plan = model.plan;
    return `<article class="recommend-card ${plan.tier}" data-service="${escape(model.service_name)}" data-plan="${escape(plan.name)}">
      <span class="recommend-meta">${plan.tier === "free" ? "無料" : "有料"} / ${escape(plan.name)}</span>
      <h4>${escape(model.service_name)}</h4><p class="plan-price">${escape(priceText(plan))}</p>
      <p><b>${escape(plan.model_name)}</b></p><p>${escape(plan.benefit)}</p>
      <p class="plan-limit">${escape(plan.limits)}</p>${official(model)}${guideLink(model)}</article>`;
  }

  function renderResult(answers) {
    const result = core.candidates(models, answers, rules, data.usd_to_jpy);
    const freeOnly = core.budgetLimit(answers) === 0;
    const freeCards = result.free.length ? `<div class="recommendation-grid">${result.free.map(card).join("")}</div>` : "<p>この用途に対応する無料候補はありません。</p>";
    const paidCards = result.paid.length ? `<div class="recommendation-grid">${result.paid.map(card).join("")}</div>` : "<p>この予算・用途で料金を確認できた有料候補はありません。</p>";
    find("#recommendation").innerHTML = `<span class="kicker">YOUR OPTIONS</span>
      <h3>${freeOnly ? "無料で試せる候補" : "予算内の有料候補"}</h3>
      <p>月額予算：${format(core.budgetLimit(answers))}円 / ${escape(rules.types[answers.priority])} / ${escape(form.querySelector(`[name="usage"]:checked`).parentElement.textContent.trim())}。サービスの暫定適合値と選択条件による提案です。</p>
      ${freeOnly ? freeCards : paidCards}
      ${freeOnly ? '<p class="data-notice">有料プランの料金・利用モデルは下の比較表に掲載しています。</p>' : `<details class="free-alternatives"><summary>無料で試せる候補も比較する</summary>${freeCards}</details>`}
      <p class="data-notice">${escape(data.exchange_note)} 有料だから必ず高品質とは限りません。利用枠と必要な機能を確認してください。</p>
      <a href="#compare-title">上位プランも含めて比較する ↓</a>`;
    find("#recommendation").hidden = false;
  }

  function updateDiagnosis() {
    const customSelected = Boolean(form.querySelector('[name="budget"][value="custom"]:checked'));
    const customInput = find("#custom-budget");
    find("#custom-budget-field").hidden = !customSelected;
    customInput.disabled = !customSelected;
    customInput.required = customSelected;
    if (!ready) return;
    const answers = Object.fromEntries(new FormData(form));
    const answered = ["usage", "budget", "experience", "priority"].filter(key => answers[key]).length;
    find("#form-error").hidden = true;
    if (answers.usage) {
      find("#compare-usage").value = answers.usage;
      renderComparison();
    }
    if (!core.complete(answers)) {
      find("#recommendation").hidden = true;
      find("#form-status").textContent = customSelected && core.budgetLimit(answers) === null
        ? "月額予算を0円以上の整数で入力してください。"
        : `${answered} / 4 選択済み`;
      return;
    }
    renderResult(answers);
    find("#form-status").textContent = `結果を更新しました：月額予算 ${format(core.budgetLimit(answers))}円 / ${rules.types[answers.priority]}`;
  }

  function renderComparison() {
    if (!ready) return;
    const service = find("#service-filter").value;
    const tier = find("#plan-filter").value;
    const usage = find("#compare-usage").value;
    const items = models.filter(model => service === "all" || model.id === service)
      .flatMap(model => model.plans.filter(plan => tier === "all" || plan.tier === tier).map(plan => ({ ...model, plan })));
    find("#model-table tbody").innerHTML = items.map(model => `<tr>
      <th scope="row">${escape(model.service_name)}<small>${escape(model.plan.name)} / ${model.plan.tier === "free" ? "無料" : model.plan.tier === "paid" ? "有料" : "要確認"}</small></th>
      <td data-label="モデル・主な違い"><b>${escape(model.plan.model_name)}</b><small>${escape(model.plan.benefit)}</small>${guideLink(model)}</td>
      <td data-label="料金・利用条件"><b>${escape(priceText(model.plan))}</b><small>${escape(model.plan.limits)}</small></td>
      <td data-label="公式情報">${official(model)}</td></tr>`).join("") || '<tr><td colspan="4">この条件に一致するプランはありません。</td></tr>';
    find("#table-count").textContent = `${items.length}件のプラン`;
    const dimension = usage === "ideas" ? "writing" : usage;
    const eligible = [...new Set(items.filter(model => model.plan.usages.includes(usage)).map(model => model.id))];
    const ranked = models.filter(model => eligible.includes(model.id))
      .sort((first, second) => second.capabilities[dimension] - first.capabilities[dimension]);
    find("#ranking-title").textContent = `${find("#compare-usage").selectedOptions[0].textContent}の適合目安`;
    find("#bar-chart").innerHTML = ranked.map(model => {
      const value = model.capabilities[dimension];
      return `<li class="bar-row"><span>${escape(model.service_name)}</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${value}%"></span></span><span class="bar-value">${value}<small> / 100</small></span></li>`;
    }).join("") || '<li class="empty-state">この用途・表示条件に対応する比較対象はありません。</li>';
    find("#evaluation-note").textContent = `${data.evaluation_note}${usage === "ideas" ? " 日常の相談は文章・企画の設定値を使用します。" : ""}`;
  }

  async function loadData() {
    ready = false;
    find("#show-result").disabled = true;
    find("#retry-data").disabled = true;
    find("#load-error").hidden = true;
    find("#form-status").textContent = "データを読み込み中";
    try {
      [data, rules] = await Promise.all(["data/models.json", "data/scoring-rules.json"].map(async url => {
        const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(url);
        return response.json();
      }));
      models = data.models.filter(model => model.status === "active");
      if (!models.length || models.some(model => !Array.isArray(model.plans))) throw new Error("Invalid plan data");
      find("#service-filter").innerHTML = '<option value="all">すべて</option>' + models.map(model => `<option value="${escape(model.id)}">${escape(model.service_name)}</option>`).join("");
      find("#data-date").textContent = `データ更新：${data.updated_at}`;
      find("#exchange-note").textContent = data.exchange_note;
      ready = true;
      find("#show-result").disabled = false;
      initGuide();
      renderComparison();
      updateDiagnosis();
    } catch {
      find("#load-error").hidden = false;
      find("#form-status").textContent = "読み込みに失敗しました";
      find("#data-date").textContent = "データ未取得";
      find("#model-table tbody").innerHTML = '<tr><td colspan="4">データを読み込めませんでした。</td></tr>';
    } finally {
      find("#retry-data").disabled = false;
    }
  }

  form.addEventListener("change", updateDiagnosis);
  find("#custom-budget").addEventListener("input", updateDiagnosis);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!ready) return;
    if (!core.complete(Object.fromEntries(new FormData(form)))) {
      find("#form-error").hidden = false;
      return;
    }
    updateDiagnosis();
    find("#recommendation").focus({ preventScroll: true });
    find("#recommendation").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  form.addEventListener("reset", () => {
    find("#custom-budget-field").hidden = true;
    find("#custom-budget").disabled = true;
    find("#custom-budget").required = false;
    find("#recommendation").hidden = true;
    find("#recommendation").replaceChildren();
    find("#form-error").hidden = true;
    if (ready) find("#form-status").textContent = "0 / 4 選択済み";
    find("#compare-usage").value = "writing";
    renderComparison();
  });
  for (const selector of ["#service-filter", "#plan-filter", "#compare-usage"]) find(selector).addEventListener("change", renderComparison);
  find("#guide-model").addEventListener("change", () => {
    const profile = data.model_guide.profiles.find(item => item.id === find("#guide-model").value);
    find("#guide-example").value = profile.example_id;
    renderGuide();
  });
  find("#guide-example").addEventListener("change", renderGuide);
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-guide-model]");
    if (!link || !ready) return;
    find("#guide-model").value = link.dataset.guideModel;
    const profile = data.model_guide.profiles.find(item => item.id === link.dataset.guideModel);
    const usage = form.querySelector('[name="usage"]:checked')?.value;
    const example = data.model_guide.examples.find(item => item.usages.includes(usage));
    find("#guide-example").value = example?.id || profile.example_id;
    renderGuide();
    find("#model-guide-title").focus({ preventScroll: true });
  });
  find("#copy-guide-prompt").addEventListener("click", async () => {
    const prompt = find("#guide-prompt");
    const text = prompt.value;
    try {
      await navigator.clipboard.writeText(text);
      if (prompt.value === text) find("#guide-copy-status").textContent = "例題をコピーしました。";
    } catch {
      prompt.focus();
      prompt.select();
      find("#guide-copy-status").textContent = "自動コピーできませんでした。選択された例題を手動でコピーしてください。";
    }
  });
  find("#retry-data").addEventListener("click", loadData);
  find("#trial-form").addEventListener("input", () => {
    trialRecords.set(find("#guide-example").value, Object.fromEntries(new FormData(find("#trial-form"))));
    renderTrialResult();
  });
  find("#trial-form").addEventListener("submit", event => event.preventDefault());
  find("#trial-form").addEventListener("reset", event => {
    event.preventDefault();
    trialRecords.delete(find("#guide-example").value);
    renderTrials();
  });
  loadData();
})();
