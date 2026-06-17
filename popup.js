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

function showSignupPrompt(){
  document.getElementById('loading').style.display = 'none';
  document.getElementById('input-area').style.display = 'none';
  document.getElementById('result').style.display = 'block';
  document.getElementById('result').innerHTML = `
    <div style="text-align:center;padding:12px 0 8px">
      <div style="background:linear-gradient(135deg,#0d2e7a,#1a56db);border-radius:12px;padding:18px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:6px">You've used your 3 free scans</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.8);line-height:1.6">Create a free account to get 5 scans every day — no credit card needed.</div>
      </div>
      <a href="https://cyberwatchai.com" target="_blank" style="display:block;background:linear-gradient(135deg,#1a56db,#2563eb);color:#fff;text-decoration:none;padding:11px;border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;margin-bottom:8px">Create free account →</a>
      <a href="https://cyberwatchai.com" target="_blank" style="display:block;background:transparent;border:1px solid #1e3a5f;color:#94a3b8;text-decoration:none;padding:9px;border-radius:8px;font-size:12px;font-family:inherit;margin-bottom:8px">Already have an account? Sign in</a>
      <button onclick="resetUI()" style="width:100%;background:transparent;border:none;color:#475569;padding:6px;font-size:11px;cursor:pointer;font-family:inherit">Maybe later</button>
    </div>
  `;
}

function showUpgradePrompt(){
  document.getElementById('loading').style.display = 'none';
  document.getElementById('input-area').style.display = 'none';
  document.getElementById('result').style.display = 'block';
  document.getElementById('result').innerHTML = `
    <div style="text-align:center;padding:12px 0 8px">
      <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);border-radius:12px;padding:18px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:6px">Daily limit reached</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.8);line-height:1.6">You've used all 5 free scans today. Upgrade to Pro for unlimited scans every day.</div>
      </div>
      <a href="https://cyberwatchai.com/?upgrade=1" target="_blank" style="display:block;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;text-decoration:none;padding:11px;border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;margin-bottom:8px">Upgrade to Pro — $1.99/mo</a>
      <button onclick="resetUI()" style="width:100%;background:transparent;border:none;color:#475569;padding:6px;font-size:11px;cursor:pointer;font-family:inherit">Maybe later</button>
    </div>
  `;
}

function showError(msg){
  document.getElementById('loading').style.display = 'none';
  document.getElementById('result').style.display = 'block';
  document.getElementById('input-area').style.display = 'none';
  document.getElementById('result').innerHTML = `
    <div class="error-msg">${msg}</div>
    <button onclick="resetUI()" style="width:100%;margin-top:10px;background:#1a56db;color:#fff;border:none;padding:9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Try again</button>
  `;
}

function resetUI(){
  document.getElementById('result').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('input-area').style.display = 'block';
  document.getElementById('scan-btn').disabled = false;
}

function scanUrl(){
  const url = document.getElementById('url-input').value.trim();
  if(!url){ document.getElementById('url-input').focus(); return; }
  if(!url.startsWith('http')){ showError('Please enter a full URL starting with https://'); return; }

  setLoading(true);
  const texts = ['Scanning for threats...','Checking domain...','Analysing patterns...','Almost done...'];
  let i = 0;
  const iv = setInterval(()=>{ i++; if(i<texts.length) document.getElementById('loading-txt').textContent=texts[i]; }, 1100);

  // Send to background service worker which handles the fetch (bypasses popup CSP/CORS)
  chrome.runtime.sendMessage({ type: 'SCAN_URL', url }, response => {
    clearInterval(iv);

    if(chrome.runtime.lastError){
      showError('Extension error. Try reloading it from chrome://extensions.');
      return;
    }

    if(!response){ showError('No response. Please try again.'); return; }

    if(!response.ok){
      if(response.error === 'rate_limited'){
        const count = parseInt(localStorage.getItem('cw_scan_count') || '0');
        if(count < 5){
          showSignupPrompt();
        } else {
          showUpgradePrompt();
        }
      } else {
        showError('Could not reach CyberWatch AI. Check your connection.');
      }
      return;
    }

    // Success — increment local count and show result
    const count = parseInt(localStorage.getItem('cw_scan_count') || '0');
    localStorage.setItem('cw_scan_count', count + 1);
    showResult(response.result);
  });
}

document.getElementById('scan-btn').addEventListener('click', scanUrl);
document.getElementById('url-input').addEventListener('keydown', e => { if(e.key==='Enter') scanUrl(); });

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const url = tabs[0]?.url;
  if(url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://'))
    document.getElementById('url-input').value = url;
});
