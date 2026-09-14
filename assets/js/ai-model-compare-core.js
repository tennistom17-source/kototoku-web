(function (root) {
  'use strict';

  const requiredAnswers = ['usage', 'budget', 'experience', 'priority'];
  const budgetLimits = { free: 0, 'three-thousand': 3000, 'ten-thousand': 10000 };

  function budgetLimit(answers) {
    if (answers.budget !== 'custom') return budgetLimits[answers.budget] ?? null;
    const input = String(answers.custom_budget ?? '').trim();
    if (!input) return null;
    const amount = Number(input);
    return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
  }

  function complete(answers) {
    return requiredAnswers.every(key => Boolean(answers[key])) && budgetLimit(answers) !== null;
  }

  function monthlyYen(plan, usdToJpy) {
    if (!Number.isFinite(plan.price) || plan.price < 0) return null;
    if (!['JPY', 'USD'].includes(plan.currency)) return null;
    return Math.round(plan.price * (plan.currency === 'USD' ? usdToJpy : 1) / (plan.billing === 'annual' ? 12 : 1));
  }

  function score(model, answers, rules) {
    let total = 0;
    for (const group of requiredAnswers) {
      for (const [key, weight] of Object.entries(rules[group]?.[answers[group]] || {})) {
        if (typeof weight === 'number') total += (model.capabilities[key] || 0) * weight / 100;
      }
    }
    return total + (rules.service_bonus[answers.usage]?.[model.service_name] || 0);
  }

  function candidates(models, answers, rules, usdToJpy) {
    if (!complete(answers)) return { free: [], paid: [] };
    const ranked = models.filter(model => model.status === 'active')
      .map(model => ({ model, value: score(model, answers, rules) }))
      .sort((first, second) => second.value - first.value);
    const result = { free: [], paid: [] };
    for (const { model } of ranked) {
      const plans = (model.plans || []).filter(plan => plan.usages.includes(answers.usage));
      const free = plans.find(plan => plan.tier === 'free');
      if (free) result.free.push({ ...model, plan: free });
      const paid = plans.filter(plan => {
        const price = monthlyYen(plan, usdToJpy);
        return plan.tier === 'paid' && price !== null && price <= budgetLimit(answers);
      }).sort((first, second) => {
        const preference = Number((second.recommend_for || []).includes(answers.priority))
          - Number((first.recommend_for || []).includes(answers.priority));
        return preference || monthlyYen(first, usdToJpy) - monthlyYen(second, usdToJpy);
      })[0];
      if (paid) result.paid.push({ ...model, plan: paid });
    }
    return Object.fromEntries(Object.entries(result).map(([tier, items]) => [tier, items.slice(0, rules.maximum_recommendations)]));
  }

  const api = { complete, budgetLimit, monthlyYen, score, candidates };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ModelCompare = api;
})(globalThis);