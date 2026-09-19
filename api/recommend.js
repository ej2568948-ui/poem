const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'poems-catalog.json'), 'utf8')
);

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const input = req.body || {};
  const { mood, theme, pace, recentPoemIds = [] } = input;
  if (!mood || !theme || !pace) return res.status(400).json({ error: 'mood, theme, pace are required' });

  const local = localRecommend({ mood, theme, pace, recentPoemIds });
  const hasAiSearch = process.env.GEMINI_API_KEY && process.env.GEMINI_FILE_SEARCH_STORE;

  if (!hasAiSearch) {
    return res.status(200).json({ ...local, mode: 'local-fallback' });
  }

  try {
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
