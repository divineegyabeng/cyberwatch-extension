// Listen for messages from background script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_LOADING') showPanel('loading', msg.url);
  if (msg.type === 'SHOW_RESULT') showPanel('result', msg.url, msg.result);
  if (msg.type === 'SHOW_ERROR') showPanel('error', '', null, msg.message);
});

function getRiskColor(score) {
  if (score >= 75) return '#ef4444';
  if (score >= 61) return '#f97316';
  if (score >= 31) return '#f59e0b';
  return '#22c55e';
}

function getRiskBg(score) {
  if (score >= 75) return '#450a0a';
  if (score >= 61) return '#431407';
  if (score >= 31) return '#422006';
  return '#052e16';
}

function truncateUrl(url, max = 45) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.substring(0, max) + '...' : display;
  } catch {
    return url.length > max ? url.substring(0, max) + '...' : url;
  }
}

function removePanel() {
  const existing = document.getElementById('cw-panel');
  if (existing) existing.remove();
}

function showPanel(state, url, result = null, errorMsg = '') {
  removePanel();

  const panel = document.createElement('div');
  panel.id = 'cw-panel';

  if (state === 'loading') {
    panel.innerHTML = `
      <div class="cw-header">
        <div class="cw-logo">
          <div class="cw-logo-icon">C</div>
          <span>CyberWatch <b>AI</b></span>
        </div>
        <button class="cw-close" id="cw-close">✕</button>
      </div>
      <div class="cw-url">${truncateUrl(url)}</div>
      <div class="cw-loading">
        <div class="cw-spinner"></div>
        <div class="cw-loading-text">Scanning for threats...</div>
      </div>
    `;
  } else if (state === 'result' && result) {
    const color = getRiskColor(result.score);
    const bg = getRiskBg(result.score);
    const flagsHtml = (result.flags || []).slice(0, 3).map(f =>
      `<div class="cw-flag">
        <div class="cw-flag-dot" style="background:${color}"></div>
        <div>${f.text || f}</div>
      </div>`
    ).join('');

    panel.innerHTML = `
      <div class="cw-header">
        <div class="cw-logo">
          <div class="cw-logo-icon">C</div>
          <span>CyberWatch <b>AI</b></span>
        </div>
        <button class="cw-close" id="cw-close">✕</button>
      </div>
      <div class="cw-url">${truncateUrl(url)}</div>
      <div class="cw-result-bar" style="background:${bg};border-left:3px solid ${color}">
        <div class="cw-result-left">
          <div class="cw-label" style="color:${color}">${result.label || 'UNKNOWN'}</div>
          <div class="cw-verdict">${result.verdict || ''}</div>
        </div>
        <div class="cw-score" style="color:${color}">${result.score}%</div>
      </div>
      <div class="cw-meter-track">
        <div class="cw-meter-fill" style="width:${result.score}%;background:${color}"></div>
      </div>
      <div class="cw-summary">${result.summary || ''}</div>
      ${flagsHtml ? `<div class="cw-flags-title">Red flags</div><div class="cw-flags">${flagsHtml}</div>` : ''}
      <a href="https://cyberwatchai.com" target="_blank" class="cw-cta">Full scan on CyberWatch AI →</a>
    `;
  } else {
    panel.innerHTML = `
      <div class="cw-header">
        <div class="cw-logo">
          <div class="cw-logo-icon">C</div>
          <span>CyberWatch <b>AI</b></span>
        </div>
        <button class="cw-close" id="cw-close">✕</button>
      </div>
      <div class="cw-error">${errorMsg || 'Something went wrong. Please try again.'}</div>
    `;
  }

  document.body.appendChild(panel);

  // Animate in
  requestAnimationFrame(() => panel.classList.add('cw-visible'));

  // Close button
  document.getElementById('cw-close')?.addEventListener('click', removePanel);

  // Auto-dismiss after 30s
  setTimeout(removePanel, 30000);
}
