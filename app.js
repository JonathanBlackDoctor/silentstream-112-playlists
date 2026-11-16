import { dateRange, recentItems } from './data.mjs';

const $ = selector => document.querySelector(selector);
const PIN_HASH = '54a91e5d887479bc41beae6f297e3e412407a03742d5e7127456a3062b86ef43';
const SESSION_KEY = 'ss112-open-v1';
const CACHE_KEY = 'ss112-playlists-v1';
let unlocked = false, fetching = false, renderKey = '', lastPayload, toastTimer;
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const shortDate = date => date.slice(5).replace('-', '.');

function storageGet(storage, key) { try { return storage.getItem(key); } catch { return null; } }
function storageSet(storage, key, value) { try { storage.setItem(key, value); } catch {} }

function render(payload) {
  const now = new Date(), items = recentItems(payload, now), range = dateRange(now);
  $('#range').textContent = `${shortDate(range.from)} — ${shortDate(range.to)}`;
  $('#count').textContent = String(items.length).padStart(2, '0');
  const key = JSON.stringify([range, items]);
  $('#loading').hidden = true;
  if (key === renderKey) return;
  renderKey = key;
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const row = document.createElement('article');
    row.className = 'playlist-row';
    const weekday = weekdays[new Date(item.date + 'T12:00:00Z').getUTCDay()];
    row.innerHTML = `<div class="date-block"><time class="date-number" datetime="${item.date}">${shortDate(item.date)}</time><span class="weekday">${weekday}</span>${item.date === range.to ? '<span class="today-dot" title="오늘" aria-label="오늘"></span>' : ''}</div><div class="row-actions"><button class="copy-button" type="button" aria-label="${item.date} 재생목록 링크 복사" title="링크 복사">${icon('copy')}</button><a class="youtube-link" target="_blank" rel="noopener noreferrer" aria-label="${item.date} YouTube에서 재생목록 열기"><svg class="youtube-icon" aria-hidden="true"><use href="#i-youtube"/></svg><span>YouTube</span><svg class="external" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>`;
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
    $('#update-status').textContent = '';
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
    button.innerHTML = icon('check');
    $('#toast').textContent = '복사됨';
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
