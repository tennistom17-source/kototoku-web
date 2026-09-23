(function () {
  "use strict";
  const find = selector => document.querySelector(selector);
  const form = find("#diagnosis-form");
  const core = globalThis.ModelCompare;
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const format = value => value.toLocaleString("ja-JP");
  let data, rules, models = [], ready = false;

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

  function card(model) {
    const plan = model.plan;
    return `<article class="recommend-card ${plan.tier}" data-service="${escape(model.service_name)}" data-plan="${escape(plan.name)}">
      <span class="recommend-meta">${plan.tier === "free" ? "無料" : "有料"} / ${escape(plan.name)}</span>
      <h4>${escape(model.service_name)}</h4><p class="plan-price">${escape(priceText(plan))}</p>
      <p><b>${escape(plan.model_name)}</b></p><p>${escape(plan.benefit)}</p>
      <p class="plan-limit">${escape(plan.limits)}</p>${official(model)}</article>`;
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
      <td data-label="モデル・主な違い"><b>${escape(model.plan.model_name)}</b><small>${escape(model.plan.benefit)}</small></td>
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
  find("#retry-data").addEventListener("click", loadData);
  loadData();
})();
