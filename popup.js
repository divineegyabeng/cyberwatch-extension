const API_URL = 'https://cyberwatchai.com/api/scan';
const SYSTEM_PROMPT = `You are CyberWatch AI, an AI-powered scam detection expert. Analyse the submitted URL for scam risk.
Respond ONLY with this JSON:
{"score":<0-100>,"label":"<SAFE|LOW RISK|MEDIUM RISK|HIGH RISK|DANGER>","riskClass":"<risk-safe|risk-low|risk-medium|risk-high>","summary":"<2-4 sentences, plain English, specific>","flags":[{"text":"<specific red flag>","severity":"<high|medium|low>"}],"actions":[{"title":"<action>","detail":"<detail>"}],"verdict":"<one sentence>"}`;

function color(score){return score>=75?'#ef4444':score>=61?'#f97316':score>=31?'#f59e0b':'#22c55e'}
function bg(score){return score>=75?'#1f0a0a':score>=61?'#1f1007':score>=31?'#1f1400':'#091a0e'}

function setLoading(show){
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  document.getElementById('result').style.display = 'none';
  document.getElementById('input-area').style.display = show ? 'none' : 'block';
  document.getElementById('scan-btn').disabled = show;
}

function showResult(r){
  const c = color(r.score), b = bg(r.score);
  const flags = (r.flags||[]).slice(0,3).map(f=>`
    <div class="flag-item">
      <div class="flag-dot" style="background:${c}"></div>
      <div>${f.text||f}</div>
    </div>`).join('');
  document.getElementById('result').style.display = 'block';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('input-area').style.display = 'none';
  document.getElementById('result').innerHTML = `
    <div style="height:10px"></div>
    <div class="result-bar" style="background:${b};border-left-color:${c}">
      <div>
        <div class="result-label" style="color:${c}">${r.label}</div>
        <div class="result-verdict">${r.verdict||''}</div>
      </div>
      <div class="result-score" style="color:${c}">${r.score}%</div>
    </div>
    <div class="meter-track"><div class="meter-fill" id="meter" style="width:0%;background:${c}"></div></div>
    <div class="result-summary">${r.summary}</div>
    ${flags ? `<div class="flags-title">Red flags</div>${flags}` : ''}
    <a class="full-btn" href="https://cyberwatchai.com/?scan=${encodeURIComponent(document.getElementById('url-input').value.trim())}" target="_blank">Full scan on CyberWatch AI →</a>
  `;
  setTimeout(()=>{const m=document.getElementById('meter');if(m)m.style.width=r.score+'%';},60);
}

function showError(msg){
  document.getElementById('loading').style.display = 'none';
  document.getElementById('result').style.display = 'block';
  document.getElementById('input-area').style.display = 'none';
  document.getElementById('result').innerHTML = `<div class="error-msg">${msg}</div><button onclick="resetUI()" style="width:100%;margin-top:10px;background:#1a56db;color:#fff;border:none;padding:9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Try again</button>`;
}

function resetUI(){
  document.getElementById('result').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('input-area').style.display = 'block';
  document.getElementById('scan-btn').disabled = false;
}

async function doScan(url){
  setLoading(true);
  const texts = ['Scanning for threats...','Checking domain reputation...','Analysing patterns...','Almost done...'];
  let i = 0;
  const iv = setInterval(()=>{ i++; if(i<texts.length) document.getElementById('loading-txt').textContent=texts[i]; }, 1100);

  try {
    console.log('Fetching:', API_URL, 'for URL:', url);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Analyse this URL: ${url}` }]
      })
    });
    clearInterval(iv);
    console.log('Response status:', res.status);

    if(res.status === 429){
      document.getElementById('loading').style.display = 'none';
      document.getElementById('input-area').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').innerHTML = `
        <div style="text-align:center;padding:16px 0 8px">
          <div style="font-size:28px;margin-bottom:10px">🔒</div>
          <div style="font-size:14px;font-weight:800;color:#f1f5f9;margin-bottom:6px">Daily limit reached</div>
          <div style="font-size:12px;color:#94a3b8;line-height:1.6;margin-bottom:16px">You've used all your free scans for today. Upgrade to Pro for unlimited scans.</div>
          <a href="https://cyberwatchai.com/#pricing" target="_blank" style="display:block;background:linear-gradient(135deg,#1a56db,#2563eb);color:#fff;text-decoration:none;padding:11px;border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;margin-bottom:8px">Upgrade to Pro — $1.99/mo</a>
          <button onclick="resetUI()" style="width:100%;background:transparent;border:1px solid #1e3a5f;color:#64748b;padding:9px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">Maybe later</button>
        </div>
      `;
      return;
    }
    if(!res.ok) throw new Error('API returned ' + res.status);

    const data = await res.json();
    const raw = data.content.map(b => b.text||'').join('');
    const cleaned = raw.replace(/```json|```/g,'').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if(!match) throw new Error('Could not parse response: ' + cleaned.substring(0,80));
    showResult(JSON.parse(match[0]));

  } catch(err){
    clearInterval(iv);
    console.error('Scan error:', err.name, err.message);
    if(err.name === 'TypeError' && err.message.includes('fetch')){
      showError('Connection blocked. Make sure you reloaded the extension after the last update.');
    } else {
      showError('Could not reach CyberWatch AI: ' + err.message);
    }
  }
}

function scanUrl(){
  const url = document.getElementById('url-input').value.trim();
  if(!url){ document.getElementById('url-input').focus(); return; }
  if(!url.startsWith('http')){ showError('Please enter a full URL starting with https://'); return; }
  doScan(url);
}

// Enter key
document.getElementById('url-input').addEventListener('keydown', e => { if(e.key==='Enter') scanUrl(); });

// Attach button click via JS (inline onclick blocked by CSP in MV3)
document.getElementById('scan-btn').addEventListener('click', scanUrl);

// Auto-fill current tab URL on open
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const url = tabs[0]?.url;
  if(url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://'))
    document.getElementById('url-input').value = url;
});
