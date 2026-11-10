const verifiedLocal = new Map();
let displayed = null;
let generation = 0;

const controls = document.querySelector('#locked-archive');
const choice = document.querySelector('#choose-local-scan');
const notice = document.querySelector('#scan-notice');
const preview = document.querySelector('#scan');
const original = document.querySelector('#original');

export function showArchiveRecord(record) {
  generation += 1;
  displayed = record;
  const localUrl = record.access === 'restricted' && verifiedLocal.get(record.sha256);
  const available = Boolean(record.url || localUrl);
  controls.hidden = record.access !== 'restricted';
  choice.value = '';
  notice.textContent = localUrl ? 'Shoda s archivním SHA-256 ověřena.' : '';
  preview.hidden = !available;
  preview.alt = record.title;
  if (available) {
    preview.src = record.url || localUrl;
    original.href = localUrl || record.originalUrl || record.url;
    original.textContent = record.openLabel || 'Otevřít celý originál ↗';
  } else {
    preview.removeAttribute('src');
    original.href = 'https://libuse.vugtk.cz:3004/manager/streets';
    original.textContent = 'Otevřít evidenci Libuše ↗';
  }
  document.querySelector('#doc-id').textContent = [
    record.collection || 'Libuše',
    record.recordId || record.id,
    record.sha256 && 'SHA-256 ' + record.sha256,
    Number.isFinite(record.bytes) && record.bytes.toLocaleString('cs-CZ') + ' B'
  ].filter(Boolean).join(' · ');
}

choice.addEventListener('change', async () => {
  const file = choice.files[0], record = displayed, start = generation;
  if (!file || record?.access !== 'restricted') return;
  notice.textContent = 'Ověřuji vybraný soubor…';
  try {
    if (file.size !== record.bytes) throw Error('Soubor má jinou velikost než zvolený archivní sken.');
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash !== record.sha256) throw Error('Kontrolní součet se liší od zvoleného archivního skenu.');
    if (generation !== start) return;
    if (!verifiedLocal.has(hash)) verifiedLocal.set(hash, URL.createObjectURL(file));
    showArchiveRecord(record);
  } catch (e) {
    if (generation === start) notice.textContent = e.message || 'Soubor se nepodařilo otevřít.';
  }
});
