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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl;
  if (!url) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
  } catch(e) {}
  chrome.tabs.sendMessage(tab.id, { type: 'SHOW_LOADING', url });
  try {
    const result = await doScan(url);
    chrome.tabs.sendMessage(tab.id, { type: 'SHOW_RESULT', result, url });
  } catch (err) {
    chrome.tabs.sendMessage(tab.id, { type: 'SHOW_ERROR', message: 'Could not reach CyberWatch AI.' });
  }
});

// Handle messages from popup — background does the fetch
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SCAN_URL') {
    doScan(msg.url)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => sendResponse({ ok: false, error: err.message, status: err.status }));
    return true; // keep channel open for async response
  }
});

async function doScan(url) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analyse this URL: ${url}` }]
    })
  });

  if (res.status === 429) {
    const err = new Error('rate_limited');
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    const err = new Error('API error ' + res.status);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const raw = data.content.map(b => b.text || '').join('');
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('parse_error');
  return JSON.parse(match[0]);
}
