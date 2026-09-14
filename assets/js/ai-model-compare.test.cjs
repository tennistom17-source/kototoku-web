const { test } = require('node:test');
const assert = require('node:assert/strict');
const { complete, monthlyYen, candidates } = require('./ai-model-compare-core.js');
const rules = require('../../data/scoring-rules.json');
const answers = { usage: 'coding', budget: 'three-thousand', experience: 'beginner', priority: 'development' };
const models = [{
  service_name: 'GitHub Copilot', status: 'active', capabilities: { coding: 90 },
  plans: [
    { name: 'Free', tier: 'free', price: 0, currency: 'USD', usages: ['coding'] },
    { name: 'Pro', tier: 'paid', price: 10, currency: 'USD', usages: ['coding'] },
    { name: 'Pro+', tier: 'paid', price: 39, currency: 'USD', usages: ['coding'] }
  ]
}];

test('four answers are sufficient without an existing service', () => {
  assert.equal(complete(answers), true);
  assert.equal(complete({ ...answers, usage: '' }), false);
});

test('budget changes immediately change paid eligibility', () => {
  assert.equal(candidates(models, answers, rules, 150).paid[0].plan.name, 'Pro');
  assert.equal(candidates(models, { ...answers, budget: 'free' }, rules, 150).paid.length, 0);
  assert.equal(candidates(models, answers, rules, 400).paid.length, 0);
});

test('plans must support the selected usage and unknown prices are excluded', () => {
  assert.equal(candidates(models, { ...answers, usage: 'video' }, rules, 150).free.length, 0);
  assert.equal(monthlyYen({ price: null, currency: 'JPY' }, 150), null);
  assert.equal(monthlyYen({ price: 22, currency: 'USD' }, 150), 3300);
});

test('one affordable paid plan per service and no results before completion', () => {
  assert.equal(candidates(models, { ...answers, budget: 'custom', custom_budget: '20000' }, rules, 150).paid.length, 1);
  assert.deepEqual(candidates(models, {}, rules, 150), { free: [], paid: [] });
});

const data = require('../../data/models.json');

test('curated ChatGPT paid recommendation includes GPT-6 for quality within 3000 yen', () => {
  const result = candidates(data.models, { ...answers, usage: 'writing', priority: 'quality' }, rules, data.usd_to_jpy);
  const chatgpt = result.paid.find(model => model.service_name === 'ChatGPT');
  assert.equal(chatgpt.plan.name, 'Plus');
  assert.match(chatgpt.plan.model_name, /GPT-6 Astra/);
});

test('annual prices use a monthly equivalent and every plan has source-backed details', () => {
  assert.equal(monthlyYen({ price: 11800, currency: 'JPY', billing: 'annual' }, 150), 983);
  for (const model of data.models) {
    assert.match(model.source_url, /^https:\/\//);
    for (const plan of model.plans) {
      assert.ok(plan.name && plan.model_name && plan.benefit && plan.limits);
      assert.ok(Array.isArray(plan.usages));
    }
  }
});

test('all combinations respect budget and exclude unverified offerings', () => {
  for (const usage of Object.keys(rules.usage)) {
    for (const [budget, limit] of Object.entries({ free: 0, 'three-thousand': 3000, 'ten-thousand': 10000, custom: 20000 })) {
      for (const priority of Object.keys(rules.priority)) {
        const result = candidates(data.models, { ...answers, usage, budget, priority, custom_budget: String(limit) }, rules, data.usd_to_jpy);
        for (const model of result.paid) {
          assert.ok(monthlyYen(model.plan, data.usd_to_jpy) <= limit);
          assert.equal(model.plan.tier, 'paid');
        }
        assert.ok([...result.free, ...result.paid].every(model => model.plan.usages.includes(usage)));
      }
    }
  }
});

test('custom monthly budget accepts zero and filters at the exact price boundary', () => {
  for (const [amount, count] of [['0', 0], ['1499', 0], ['1500', 1], ['1501', 1]]) {
    const custom = { ...answers, budget: 'custom', custom_budget: amount };
    assert.equal(complete(custom), true);
    assert.equal(candidates(models, custom, rules, 150).paid.length, count);
  }
});

test('invalid custom budgets never yield recommendations, presets ignore hidden input', () => {
  for (const amount of [undefined, '', ' ', '-1', '1.5', 'Infinity', 'abc', '9007199254740992']) {
    const custom = { ...answers, budget: 'custom', custom_budget: amount };
    assert.equal(complete(custom), false);
    assert.deepEqual(candidates(models, custom, rules, 150), { free: [], paid: [] });
  }
  assert.equal(complete({ ...answers, custom_budget: '-1' }), true);
});

test('Plus distinguishes Astra in Work and Codex from GPT-6 Pro in Chat', () => {
  const plus = data.models.find(model => model.service_name === 'ChatGPT').plans.find(plan => plan.name === 'Plus');
  assert.match(plus.model_name, /Work・Codex：GPT-6 Astra/);
  assert.match(plus.limits, /通常チャットのGPT-6 Proは含まれません/);
});