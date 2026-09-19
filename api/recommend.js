const fs = require('fs');
const path = require('path');

const baseCatalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'poems-catalog.json'), 'utf8')
);
const publicDomainPoems = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'public-domain-poems.json'), 'utf8')
).map(({ text, ...poem }) => poem);
const catalog = baseCatalog.slice(0, 12).concat(publicDomainPoems);

function localRecommend({ mood, theme, pace, recentPoemIds = [] }) {
  const ranked = catalog.map(poem => ({
    poem,
    score:
      (poem.moods.includes(mood) ? 4 : 0) +
      (poem.themes.includes(theme) ? 3 : 0) +
      (poem.pace === pace ? 2 : 0) -
      (recentPoemIds.includes(poem.id) ? 3 : 0) +
      Math.random()
  })).sort((a, b) => b.score - a.score);

  return ranked[0].poem;
}

function parseJson(text) {
  const cleaned = String(text).replace(/^```json\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned);
}

async function recommendWithCatalog({ mood, theme, pace, recentPoemIds }) {
  const prompt = `너는 한국 시 큐레이터야. 아래 작품 목록에서 사용자의 조건에 가장 잘 맞는 작품 하나를 골라 JSON만 반환해.
조건: 감정=${mood}, 주제=${theme}, 읽는 시간=${pace}, 최근 추천 ID=${recentPoemIds.join(',') || '없음'}
반드시 목록에 있는 id만 선택하고, 최근 추천 작품은 가능하면 피해야 해.
형식: {"id":"poem-001","reason":"한국어 추천 이유"}
작품 목록:
${JSON.stringify(catalog)}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3.8-flash'}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });
  if (!response.ok) throw new Error(`Gemini catalog request failed: ${response.status}`);
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.find(part => part.text)?.text;
  return parseJson(text);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const input = req.body || {};
  const { mood, theme, pace, recentPoemIds = [] } = input;
  if (!mood || !theme || !pace) return res.status(400).json({ error: 'mood, theme, pace are required' });

  const local = localRecommend({ mood, theme, pace, recentPoemIds });
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (!hasGemini) {
    return res.status(200).json({ ...local, mode: 'local-fallback' });
  }

  try {
    if (!process.env.GEMINI_FILE_SEARCH_STORE) {
      const result = await recommendWithCatalog({ mood, theme, pace, recentPoemIds });
      const selected = catalog.find(poem => poem.id === result.id) || local;
      return res.status(200).json({ ...selected, why: result.reason || selected.why, mode: 'ai-catalog' });
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        input: `시 추천 조건: 감정=${mood}, 주제=${theme}, 읽는 시간=${pace}. 최근 추천 작품 ID=${recentPoemIds.join(',') || '없음'}. 검색된 작품 중 하나만 선택하고 JSON만 반환해. 형식: {"id":"poem-001","reason":"한국어 추천 이유"}`,
        tools: [{ type: 'file_search', file_search_store_names: [process.env.GEMINI_FILE_SEARCH_STORE] }]
      })
    });

    if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
    const payload = await response.json();
    const outputText = payload.steps?.flatMap(step => step.content || []).find(item => item.type === 'text')?.text;
    const result = parseJson(outputText);
    const selected = catalog.find(poem => poem.id === result.id) || local;
    return res.status(200).json({ ...selected, why: result.reason || selected.why, mode: 'ai-search' });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ ...local, mode: 'local-fallback', warning: 'AI 검색에 실패해 기본 추천을 사용했습니다.' });
  }
};
