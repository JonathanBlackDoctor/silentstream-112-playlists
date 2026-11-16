import { dateRange, recentItems } from './data.mjs';

const $ = selector => document.querySelector(selector);
const PIN_HASH = '54a91e5d887479bc41beae6f297e3e412407a03742d5e7127456a3062b86ef43';
const SESSION_KEY = 'ss112-open-v1';
const CACHE_KEY = 'ss112-playlists-v1';
let unlocked = false, fetching = false, renderKey = '', lastPayload, toastTimer;
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const shortDate = date => date.slice(5).replace('-', '.');

function storageGet(storage, key) { try { return storage.getItem(key); } catch { return null; } }
function storageSet(storage, key, value) { try { storage.setItem(key, value); } catch {} }

function render(payload) {
  const now = new Date(), items = recentItems(payload, now), range = dateRange(now);
  $('#range').textContent = `${range.from.replaceAll('-', '.')} — ${range.to.replaceAll('-', '.')}`;
  $('#count').textContent = String(items.length).padStart(2, '0');
  const key = JSON.stringify([range, items]);
  $('#loading').hidden = true;
  if (key === renderKey) return;
  renderKey = key;
  const fragment = document.createDocumentFragment();
  let month = '';
  for (const item of items) {
    if (month !== item.date.slice(0, 7)) {
      month = item.date.slice(0, 7);
      const heading = document.createElement('div');
      heading.className = 'month-label';
      heading.textContent = `${month.slice(0, 4)} / ${month.slice(5)}`;
      fragment.append(heading);
    }
    const row = document.createElement('article');
    row.className = 'playlist-row';
    const weekday = weekdays[new Date(item.date + 'T12:00:00Z').getUTCDay()];
    row.innerHTML = `<div class="date-block"><time class="day-number" datetime="${item.date}">${item.date.slice(8)}</time><span class="weekday">${weekday}</span></div><div class="row-info"><div class="row-title">112호 수업${item.date === range.to ? '<span class="new-tag">TODAY</span>' : ''}</div><p class="row-subtitle">${shortDate(item.date)} · PLAYLIST</p></div><div class="row-actions"><button class="copy-button" type="button" aria-label="${item.date} 재생목록 링크 복사">${icon('copy')}<span class="copy-label">링크 복사</span></button><a class="youtube-link" target="_blank" rel="noopener noreferrer" aria-label="${item.date} YouTube에서 재생목록 열기"><svg class="youtube-icon" aria-hidden="true"><use href="#i-youtube"/></svg><span>YouTube</span><svg class="external" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>`;
    row.querySelector('a').href = item.url;
    row.querySelector('button').addEventListener('click', event => copyLink(item.url, event.currentTarget));
    fragment.append(row);
  }
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '최근 30일에 등록된 수업이 없어요.';
    fragment.append(empty);
  }
  $('#list').replaceChildren(fragment);
}

function updatedLabel(payload) {
  const date = new Date(payload.updatedAtUtc);
  return Number.isFinite(+date) ? '목록 갱신 ' + new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }).format(date) : '최근 30일 · 한국 시간 기준';
}

async function load() {
  if (!unlocked || fetching) return;
  fetching = true;
  $('#refresh').disabled = true;
  try {
    const response = await fetch(`./playlists.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('목록 요청 실패');
    const payload = await response.json();
    recentItems(payload);
    if (!unlocked) return;
    lastPayload = payload;
    render(payload);
    storageSet(localStorage, CACHE_KEY, JSON.stringify(payload));
    $('#update-status').textContent = updatedLabel(payload);
  } catch {
    if (!unlocked) return;
    if (lastPayload) {
      render(lastPayload);
      $('#update-status').textContent = '저장된 목록 · 연결 후 다시 갱신해 주세요.';
    } else {
      $('#loading').hidden = false;
      $('#loading').textContent = '목록을 불러오지 못했어요. 잠시 후 새로고침해 주세요.';
      $('#update-status').textContent = '연결을 확인해 주세요.';
    }
  } finally {
    fetching = false;
    $('#refresh').disabled = false;
  }
}

function openArchive() {
  unlocked = true;
  $('#gate').hidden = true;
  $('#archive').hidden = false;
  $('#pin').value = '';
  try {
    const cache = JSON.parse(storageGet(localStorage, CACHE_KEY));
    recentItems(cache);
    lastPayload = cache;
    render(cache);
    $('#update-status').textContent = '저장된 목록 · 갱신 중';
  } catch {}
  load();
}

async function copyLink(url, button) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('복사 미지원');
    await navigator.clipboard.writeText(url);
    const previous = button.innerHTML;
    button.innerHTML = `${icon('check')}<span class="copy-label">복사됨</span>`;
    $('#toast').textContent = '재생목록 링크를 복사했어요.';
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2200);
    setTimeout(() => { if (button.isConnected) button.innerHTML = previous; }, 1800);
  } catch {
    $('#copy-url').value = url;
    $('#copy-dialog').showModal();
    $('#copy-url').focus();
    $('#copy-url').select();
  }
}

$('#unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  if (button.disabled) return;
  button.disabled = true;
  try {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode($('#pin').value));
    const hex = [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
    if (hex !== PIN_HASH) {
      $('#pin-error').textContent = '비밀번호를 다시 확인해 주세요.';
      $('#pin').setAttribute('aria-invalid', 'true');
      $('#pin').focus();
      $('#pin').select();
      return;
    }
    storageSet(sessionStorage, SESSION_KEY, 'open');
    openArchive();
  } catch { $('#pin-error').textContent = '연결을 확인하고 다시 시도해 주세요.'; }
  finally { button.disabled = false; }
});
$('#pin').addEventListener('input', () => {
  $('#pin').value = $('#pin').value.replace(/[^0-9]/g, '').slice(0, 4);
  $('#pin').removeAttribute('aria-invalid');
  $('#pin-error').textContent = '';
});
$('#lock').addEventListener('click', () => {
  unlocked = false;
  storageSet(sessionStorage, SESSION_KEY, '');
  $('#archive').hidden = true;
  $('#gate').hidden = false;
  $('#pin').focus();
  $('#toast').hidden = true;
});
$('#refresh').addEventListener('click', load);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
window.addEventListener('online', load);
setInterval(() => { if (!document.hidden) load(); }, 60000);
if (storageGet(sessionStorage, SESSION_KEY) === 'open') openArchive();
