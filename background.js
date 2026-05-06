const API_URL = 'https://cyberwatchai.com/api/scan';

const SYSTEM_PROMPT = `You are CyberWatch AI, an AI-powered scam detection expert. Analyse the submitted URL for scam risk.
Respond ONLY with this JSON:
{"score":<0-100>,"label":"<SAFE|LOW RISK|MEDIUM RISK|HIGH RISK|DANGER>","riskClass":"<risk-safe|risk-low|risk-medium|risk-high>","summary":"<2-4 sentences, plain English, specific>","flags":[{"text":"<specific red flag>","severity":"<high|medium|low>"}],"actions":[{"title":"<action>","detail":"<detail>"}],"verdict":"<one sentence>"}`;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'scan-link',
    title: 'Scan with CyberWatch AI',
    contexts: ['link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl;
  if (!url) return;

  // Inject content script first in case it's not loaded yet
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
  } catch(e) { /* already injected */ }

  chrome.tabs.sendMessage(tab.id, { type: 'SHOW_LOADING', url });

  try {
    const result = await scanUrl(url);
    chrome.tabs.sendMessage(tab.id, { type: 'SHOW_RESULT', result, url });
  } catch (err) {
    chrome.tabs.sendMessage(tab.id, { type: 'SHOW_ERROR', message: 'Could not reach CyberWatch AI. Check your connection.' });
  }
});

async function scanUrl(url) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analyse this URL: ${url}` }]
    })
  });
  if (!response.ok) throw new Error('API error: ' + response.status);
  const data = await response.json();
  const raw = data.content.map(b => b.text || '').join('');
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Bad response');
  return JSON.parse(match[0]);
}
