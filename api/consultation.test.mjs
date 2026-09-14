import worker, { ConsultationBudget, approvedConfig, reserve, generate, validateInput, monthKey } from './consultation.mjs';

export async function runTests() {
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  const now = Date.parse('2026-09-14T00:00:00Z');
  const env = { ENABLED: 'true', FREE_PLAN_VERIFIED: 'true', MODERATION_FREE_VERIFIED: 'true', APPROVED_MONTH: '2026-09', PRICE_VALID_UNTIL: '2026-09-30T14:59:59Z', MODEL: 'gpt-4.1-mini-2025-04-14', INPUT_USD_PER_MILLION: '1', OUTPUT_USD_PER_MILLION: '5', YEN_PER_USD_WITH_TAX: '198', OPENAI_API_KEY: 'fake-test-key' };
  assert(approvedConfig(env, now), 'approved settings');
  for (const override of [{ ENABLED: 'false' }, { FREE_PLAN_VERIFIED: 'false' }, { INPUT_USD_PER_MILLION: '100' }, { OPENAI_API_KEY: '' }, { APPROVED_MONTH: '2026-08' }, { PRICE_VALID_UNTIL: '2026-09-13' }]) assert(!approvedConfig({ ...env, ...override }, now), 'fail closed config');
  const storage = () => {
    const values = new Map();
    let queue = Promise.resolve();
    const transaction = { get: async key => structuredClone(values.get(key)), put: async (key, value) => values.set(key, structuredClone(value)) };
    return { ...transaction, transaction: operation => { const pending = queue.then(() => operation(transaction)); queue = pending.catch(() => {}); return pending; } };
  };
  const ledger = storage();
  const concurrent = await Promise.all(Array.from({ length: 20 }, (_, index) => reserve(ledger, String(index), now)));
  assert(concurrent.filter(value => value === null).length === 1, 'concurrent serialization');
  assert(await reserve(ledger, '0', now + 180000) === 'DUPLICATE', 'deduplication');
  const monthly = storage();
  for (let index = 0; index < 100; index++) {
    const date = now + Math.floor(index / 10) * 86400000 + index % 10 * 180000;
    assert(await reserve(monthly, String(index), date) === null, 'within budget');
    if (index === 9) assert(await reserve(monthly, 'extra-day', date + 180000) === 'DAILY_LIMIT', 'daily cap');
  }
  assert(await reserve(monthly, '101', now + 11 * 86400000) === 'MONTHLY_LIMIT', 'monthly cap');
  assert((await monthly.get('2026-09')).yen === 600, 'full reservations retained');
  assert(!approvedConfig(env, Date.parse('2026-10-01T00:00:00Z')), 'no automatic monthly restart');
  const input = { concern: '趣味の時間を増やすか迷っています。', genre: 'future', advisors: ['peer-gentle', 'senior-realistic', 'advisor-logical'], targetAI: 'chatgpt', consent: true, requestId: crypto.randomUUID() };
  assert(validateInput(input), 'valid input');
  assert(!validateInput({ ...input, consent: false }), 'consent');
  assert(!validateInput({ ...input, advisors: ['peer-gentle', 'peer-gentle', 'advisor-logical'] }), 'unique roles');
  const output = { safe: true, advisors: input.advisors.map(id => ({ id, opinion: 'テスト用の意見', question: 'テスト用の問い', action: 'テスト用の行動' })), common: 'テスト共通点', differences: 'テスト相違点', nextStep: 'テスト一歩', prompt: 'テスト引き継ぎ文' };
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return Response.json(url.endsWith('moderations') ? { results: [{ flagged: false }] } : { status: 'completed', usage: { input_tokens: 2000, output_tokens: 1000 }, output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  };
  const result = await generate(env, input, transport);
  assert(result.mode === 'live' && result.prompt === output.prompt, 'use actual response');
  assert(calls.length === 3 && calls[1].body.store === false && calls[1].body.max_output_tokens === 2400 && calls[1].body.input.includes(input.concern), 'bounded one generation and moderation');
  const unsafe = await generate(env, input, async () => Response.json({ results: [{ flagged: true }] }));
  assert(unsafe.code === 'SAFETY_REFERRAL', 'unsafe blocked');
  let failures = 0;
  try { await generate(env, input, async () => { failures++; throw new Error('timeout'); }); } catch {}
  assert(failures === 1, 'no retries');
  const disabled = await worker.fetch({ url: 'https://test/consult', method: 'POST', headers: { get: name => name === 'Origin' ? 'https://site' : null } }, { ALLOWED_ORIGIN: 'https://site', ENABLED: 'false' });
  assert(disabled.status === 503, 'unconfigured zero API calls');
  await ledger.put('hold', true);
  assert(await reserve(ledger, 'next', now + 600000) === 'BUDGET_REVIEW', 'hold prevents spend');
  await monthly.put('2026-09', { yen: -1, count: 0, days: {}, ids: [] });
  let corruptRejected = false;
  try { await reserve(monthly, 'corrupt', now); } catch { corruptRejected = true; }
  assert(corruptRejected, 'corrupt ledger fails closed');
  const realFetch = globalThis.fetch;
  const liveNow = Date.now();
  const activeEnv = { ...env, APPROVED_MONTH: monthKey(liveNow), PRICE_VALID_UNTIL: new Date(liveNow + 86400000).toISOString() };
  const request = () => ({ json: async () => ({ ...input, requestId: crypto.randomUUID() }) });
  let outbound = 0;
  globalThis.fetch = async () => { outbound++; throw new Error('mock unavailable'); };
  try {
    const capped = storage();
    await capped.put(monthKey(liveNow), { yen: 600, count: 100, days: {}, ids: Array.from({ length: 100 }, (_, index) => String(index)) });
    const stopped = await new ConsultationBudget({ storage: capped }, activeEnv).fetch(request());
    assert(stopped.status === 429 && outbound === 0, 'capped worker calls no OpenAI');
    const failed = storage();
    const failure = await new ConsultationBudget({ storage: failed }, activeEnv).fetch(request());
    assert(failure.status === 503 && outbound === 1, 'failed call no retry');
    assert((await failed.get(monthKey(liveNow))).yen === 6, 'failed request keeps reservation');
    const broken = { transaction: async () => { throw new Error('storage unavailable'); } };
    try { await new ConsultationBudget({ storage: broken }, activeEnv).fetch(request()); } catch {}
    assert(outbound === 1, 'ledger failure zero additional calls');
    const held = storage();
    globalThis.fetch = async url => { outbound++; return Response.json(url.endsWith('moderations') ? { results: [{ flagged: false }] } : { status: 'completed', usage: { input_tokens: 12001, output_tokens: 1000 } }); };
    await new ConsultationBudget({ storage: held }, activeEnv).fetch(request());
    assert(await held.get('hold') === true, 'unexpected usage holds account');
    const countBeforeHold = outbound;
    await new ConsultationBudget({ storage: held }, activeEnv).fetch(request());
    assert(outbound === countBeforeHold, 'held worker makes no calls');
  } finally { globalThis.fetch = realFetch; }
  return { passed: true, reservations: 100, concurrentRequests: 20, generationCalls: calls.length };
}