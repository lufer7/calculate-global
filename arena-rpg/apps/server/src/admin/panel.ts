/**
 * Owner-only admin panel, served by the game server at /admin.
 * - Strict CSP with a per-request nonce; no external scripts, styles or fonts.
 * - The session token lives only in this page's memory (no localStorage / cookies),
 *   so closing the tab logs you out and other pages cannot read it.
 * - Every value from the database is written with textContent (player-typed fighter names!).
 */
export function adminPanelHtml(nonce: string): string {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="data:,">
<title>Toz ve Demir · Yönetim</title>
<style nonce="${nonce}">
:root { --bg:#f4f1ec; --panel:#fffdf9; --ink:#2a241d; --muted:#7a6f62; --line:#e2dbd0; --accent:#9a5b1e; --danger:#b3261e; --ok:#2e7d32; --warn:#a66a00; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg:#14110e; --panel:#1d1915; --ink:#ece4d8; --muted:#a39684; --line:#3a3229; --accent:#d9934a; --danger:#ef6b62; --ok:#7cc47f; --warn:#e0a83c; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
header { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--line); background:var(--panel); position:sticky; top:0; z-index:2; }
header h1 { font-size:16px; margin:0; letter-spacing:.02em; }
header h1 span { color:var(--muted); font-weight:400; }
nav { display:flex; gap:4px; flex-wrap:wrap; }
nav button { background:none; border:1px solid transparent; color:var(--ink); }
nav button[aria-current="page"] { border-color:var(--line); background:var(--bg); }
main { max-width:1100px; margin:0 auto; padding:16px; display:grid; gap:16px; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; min-width:0; }
.tiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:12px; }
.tile .n { font-size:26px; font-weight:650; font-variant-numeric:tabular-nums; }
.tile .l { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
label { display:grid; gap:4px; font-size:12px; color:var(--muted); }
input, select { font:inherit; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:6px; padding:8px 10px; min-width:0; }
button { font:inherit; border-radius:6px; padding:7px 12px; cursor:pointer; border:1px solid var(--line); background:var(--panel); color:var(--ink); }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
button.danger { color:var(--danger); border-color:var(--danger); }
button:focus-visible, input:focus-visible, select:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.row { display:flex; flex-wrap:wrap; gap:8px; align-items:end; }
.head { align-items:center; justify-content:space-between; }
.head h2 { margin:0; }
.table-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
th, td { text-align:left; padding:8px; border-bottom:1px solid var(--line); white-space:nowrap; }
th { color:var(--muted); font-weight:500; font-size:12px; }
tbody tr { cursor:pointer; }
tbody tr:hover { background:var(--bg); }
.pill { display:inline-block; padding:1px 8px; border-radius:99px; font-size:12px; border:1px solid currentColor; }
.pill.active { color:var(--ok); } .pill.pending { color:var(--warn); } .pill.banned { color:var(--danger); }
.muted { color:var(--muted); }
.error { color:var(--danger); min-height:1.4em; }
.login { max-width:360px; margin:10vh auto; display:grid; gap:12px; }
dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; margin:0; }
dt { color:var(--muted); } dd { margin:0; min-width:0; overflow-wrap:anywhere; }
.list { display:grid; gap:8px; margin:0; padding:0; list-style:none; }
.list li { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid var(--line); padding-bottom:8px; flex-wrap:wrap; }
.unread { font-weight:600; }
.actions { display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(240px,1fr)); }
.actions .card { display:grid; gap:8px; align-content:start; }
[hidden] { display:none !important; }
</style>
</head>
<body>
<section id="login" class="login card" aria-labelledby="login-title">
  <h1 id="login-title">Yönetim girişi</h1>
  <p class="muted">Bu panel yalnızca oyun sahibine açıktır. Giriş için şifre ve kimlik doğrulama uygulamasındaki 6 haneli kod gerekir.</p>
  <form id="login-form" class="login" autocomplete="off">
    <label>E-posta <input id="l-email" type="email" required autocomplete="username"></label>
    <label>Şifre <input id="l-pass" type="password" required autocomplete="current-password"></label>
    <label>Doğrulama kodu <input id="l-totp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code"></label>
    <button class="primary" type="submit">Giriş yap</button>
    <p class="error" id="l-err" role="alert"></p>
  </form>
</section>

<div id="app" hidden>
  <header>
    <h1>Toz ve Demir <span>· Yönetim</span></h1>
    <nav aria-label="Bölümler">
      <button data-view="overview" aria-current="page">Genel</button>
      <button data-view="players">Oyuncular</button>
      <button data-view="audit">İşlem kaydı</button>
      <button id="logout">Çıkış</button>
    </nav>
  </header>
  <main>
    <section id="view-overview">
      <div class="tiles" id="tiles"></div>
      <div class="card">
        <div class="row head"><h2>Bildirimler</h2><button id="mark-read">Tümünü okundu say</button></div>
        <ul class="list" id="notifications"></ul>
      </div>
    </section>

    <section id="view-players" hidden>
      <div class="card">
        <form class="row" id="search-form">
          <label>Ara (takma ad, dövüşçü adı, hesap ID veya tam e-posta)<input id="q" size="36"></label>
          <label>Durum
            <select id="status"><option value="">Tümü</option><option value="active">Aktif</option><option value="pending">Doğrulanmamış</option><option value="banned">Yasaklı</option></select>
          </label>
          <button class="primary" type="submit">Ara</button>
        </form>
        <p class="muted">E-posta ile arama işlem kaydına yazılır.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Takma ad</th><th>Durum</th><th>Ana sınıf</th><th>Dövüşçü</th><th>En yüksek Sv</th><th>Kayıt</th><th>Son giriş</th></tr></thead>
          <tbody id="players"></tbody>
        </table></div>
      </div>

      <div class="card" id="detail" hidden>
        <div class="row head"><h2 id="d-name"></h2><span id="d-status"></span></div>
        <dl id="d-info"></dl>
        <h3>Dövüşçüler</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Ad</th><th>Sınıf</th><th>Seviye</th><th>Oluşturma</th><th></th></tr></thead>
          <tbody id="d-fighters"></tbody>
        </table></div>
        <h3>İşlemler</h3>
        <div class="actions">
          <form class="card" id="ban-form">
            <strong>Yasakla</strong>
            <label>Gerekçe <input id="ban-reason" required minlength="3" maxlength="200"></label>
            <label>Süre
              <select id="ban-days"><option value="1">1 gün</option><option value="7">7 gün</option><option value="30">30 gün</option><option value="">Kalıcı</option></select>
            </label>
            <button class="danger" type="submit">Yasakla</button>
          </form>
          <div class="card">
            <strong>Yasağı kaldır</strong>
            <p class="muted">Oyuncu tekrar giriş yapabilir.</p>
            <button id="unban">Yasağı kaldır</button>
          </div>
          <form class="card" id="reveal-form">
            <strong>E-postayı göster</strong>
            <label>Gerekçe (kayda geçer) <input id="reveal-reason" required minlength="3" maxlength="200"></label>
            <button type="submit">Göster</button>
            <output id="revealed"></output>
          </form>
          <form class="card" id="delete-form">
            <strong>Hesabı sil</strong>
            <label>Gerekçe <input id="delete-reason" required minlength="3" maxlength="200"></label>
            <label>Onay için takma adı yazın <input id="delete-confirm" required></label>
            <button class="danger" type="submit">Kalıcı olarak sil</button>
          </form>
        </div>
        <p class="error" id="d-err" role="alert"></p>
      </div>
    </section>

    <section id="view-audit" hidden>
      <div class="card">
        <h2>İşlem kaydı</h2>
        <p class="muted">Panelde yapılan her işlem burada tutulur ve silinemez.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Zaman</th><th>İşlem</th><th>Hedef</th><th>Ayrıntı</th></tr></thead>
          <tbody id="audit"></tbody>
        </table></div>
      </div>
    </section>
  </main>
</div>

<script nonce="${nonce}">
(() => {
  let token = null;
  let current = null;
  const $ = (id) => document.getElementById(id);
  const CLASS = { scout: 'Gözcü', swordmaster: 'Kılıç Ustası', seer: 'Müneccim' };
  const STATUS = { active: 'Aktif', pending: 'Doğrulanmamış', banned: 'Yasaklı' };
  const ACTIONS = { login: 'Giriş', logout: 'Çıkış', ban: 'Yasaklama', unban: 'Yasak kaldırma', reveal_email: 'E-posta görüntüleme', search_by_email: 'E-posta ile arama', rename_fighter: 'Dövüşçü adı değiştirme', delete_account: 'Hesap silme' };
  const fmt = (t) => (t ? new Date(t).toLocaleString('tr-TR') : '—');
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined && text !== null) e.textContent = String(text); if (cls) e.className = cls; return e; };
  const pill = (s) => el('span', STATUS[s] || s, 'pill ' + s);

  async function api(path, opts = {}) {
    const res = await fetch('/admin/api' + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit',
      cache: 'no-store',
    });
    if (res.status === 401 && token) { logout(); throw new Error('Oturum süresi doldu, tekrar giriş yapın.'); }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error(messageFor(data && data.error));
    return data;
  }
  function messageFor(code) {
    return ({ invalid_credentials: 'E-posta, şifre veya kod hatalı.', reason_required: 'Gerekçe en az 3 karakter olmalı.', invalid_name: 'Geçersiz ad (3-16 harf/rakam).', not_found: 'Kayıt bulunamadı.', rate_limited: 'Çok fazla deneme. Bir dakika bekleyin.' })[code] || 'İşlem başarısız oldu.';
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('l-err').textContent = '';
    try {
      const r = await api('/login', { method: 'POST', body: { email: $('l-email').value, password: $('l-pass').value, totp: $('l-totp').value } });
      token = r.token;
      $('l-pass').value = ''; $('l-totp').value = '';
      $('login').hidden = true; $('app').hidden = false;
      show('overview');
    } catch (err) { $('l-err').textContent = err.message; }
  });

  function logout() {
    if (token) fetch('/admin/api/logout', { method: 'POST', headers: { authorization: 'Bearer ' + token } }).catch(() => {});
    token = null; current = null;
    $('app').hidden = true; $('login').hidden = false;
  }
  $('logout').addEventListener('click', logout);

  document.querySelectorAll('nav [data-view]').forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));
  function show(view) {
    for (const v of ['overview', 'players', 'audit']) $('view-' + v).hidden = v !== view;
    document.querySelectorAll('nav [data-view]').forEach((b) => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
    ({ overview: loadOverview, players: loadPlayers, audit: loadAudit })[view]().catch((e) => alertBox(e.message));
  }
  function alertBox(msg) { $('d-err').textContent = msg; }

  async function loadOverview() {
    const [s, n] = await Promise.all([api('/stats'), api('/notifications')]);
    const tiles = [['Toplam hesap', s.accounts], ['Aktif', s.active], ['Doğrulanmamış', s.pending], ['Yasaklı', s.banned], ['Bugün kayıt', s.signupsToday], ['Dövüşçü', s.fighters], ['Okunmamış bildirim', s.unreadNotifications]];
    for (const r of s.byMainClass) tiles.push(['Ana sınıf: ' + (CLASS[r.cls] || r.cls), r.n]);
    $('tiles').replaceChildren(...tiles.map(([l, v]) => { const t = el('div', null, 'card tile'); t.append(el('div', v, 'n'), el('div', l, 'l')); return t; }));
    $('notifications').replaceChildren(...(n.notifications.length ? n.notifications.map((x) => {
      const li = el('li', null, x.read ? '' : 'unread');
      li.append(el('span', x.text), el('span', fmt(x.at), 'muted'));
      if (x.account_id) { li.tabIndex = 0; li.addEventListener('click', () => { show('players'); openPlayer(x.account_id); }); }
      return li;
    }) : [el('li', 'Henüz bildirim yok.', 'muted')]));
  }
  $('mark-read').addEventListener('click', async () => { await api('/notifications/read', { method: 'POST' }); loadOverview(); });

  $('search-form').addEventListener('submit', (e) => { e.preventDefault(); loadPlayers().catch((err) => alertBox(err.message)); });
  async function loadPlayers() {
    const params = new URLSearchParams({ q: $('q').value, status: $('status').value });
    const r = await api('/players?' + params);
    $('players').replaceChildren(...(r.players.length ? r.players.map((p) => {
      const tr = el('tr');
      const s = el('td'); s.append(pill(p.status));
      tr.append(el('td', p.display_name), s, el('td', CLASS[p.main_class] || '—'), el('td', p.fighter_count), el('td', p.max_level || '—'), el('td', fmt(p.created_at)), el('td', fmt(p.last_login_at)));
      tr.tabIndex = 0;
      tr.addEventListener('click', () => openPlayer(p.id));
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPlayer(p.id); });
      return tr;
    }) : [(() => { const tr = el('tr'); const td = el('td', 'Sonuç yok.', 'muted'); td.colSpan = 7; tr.append(td); return tr; })()]));
  }

  async function openPlayer(id) {
    $('d-err').textContent = ''; $('revealed').textContent = '';
    const p = await api('/players/' + encodeURIComponent(id));
    current = p;
    $('detail').hidden = false;
    $('d-name').textContent = p.displayName;
    $('d-status').replaceChildren(pill(p.status));
    const info = [['Hesap ID', p.id], ['E-posta', p.emailMasked], ['Ana sınıf', CLASS[p.mainClass] || '—'], ['Kayıt', fmt(p.createdAt)], ['Doğrulama', fmt(p.verifiedAt)], ['Son giriş', fmt(p.lastLoginAt)],
      ['Yasak', p.status === 'banned' ? (p.banReason || '') + (p.bannedUntil ? ' — bitiş: ' + fmt(p.bannedUntil) : ' — kalıcı') : '—'],
      ['Onaylanan metinler', 'Koşullar ' + p.termsVersion + ', Aydınlatma ' + p.privacyVersion + ' (' + fmt(p.consentAt) + ')'], ['Pazarlama izni', p.marketingConsent ? 'Var' : 'Yok']];
    $('d-info').replaceChildren(...info.flatMap(([k, v]) => [el('dt', k), el('dd', v)]));
    $('d-fighters').replaceChildren(...p.fighters.map((f) => {
      const tr = el('tr');
      const btn = el('button', 'Adını değiştir');
      btn.type = 'button';
      btn.addEventListener('click', () => renameFighter(f));
      const td = el('td'); td.append(btn);
      tr.append(el('td', f.name), el('td', CLASS[f.class] || f.class), el('td', f.level), el('td', fmt(f.created_at)), td);
      return tr;
    }));
    $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function renameFighter(f) {
    const tr = [...$('d-fighters').children].find((r) => r.firstChild.textContent === f.name);
    const input = el('input'); input.value = f.name; input.maxLength = 16;
    const save = el('button', 'Kaydet', 'primary'); save.type = 'button';
    const cell = tr.lastChild; cell.replaceChildren(input, save);
    input.focus();
    save.addEventListener('click', async () => {
      try { await api('/fighters/' + encodeURIComponent(f.id) + '/rename', { method: 'POST', body: { name: input.value } }); openPlayer(current.id); }
      catch (e) { alertBox(e.message); }
    });
  }

  $('ban-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const days = $('ban-days').value;
    try { await api('/players/' + encodeURIComponent(current.id) + '/ban', { method: 'POST', body: { reason: $('ban-reason').value, days: days ? Number(days) : null } }); $('ban-reason').value = ''; openPlayer(current.id); loadPlayers(); }
    catch (err) { alertBox(err.message); }
  });
  $('unban').addEventListener('click', async () => {
    try { await api('/players/' + encodeURIComponent(current.id) + '/unban', { method: 'POST' }); openPlayer(current.id); loadPlayers(); }
    catch (err) { alertBox(err.message); }
  });
  $('reveal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { const r = await api('/players/' + encodeURIComponent(current.id) + '/reveal-email', { method: 'POST', body: { reason: $('reveal-reason').value } }); $('revealed').textContent = r.email; $('reveal-reason').value = ''; }
    catch (err) { alertBox(err.message); }
  });
  $('delete-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if ($('delete-confirm').value !== current.displayName) { alertBox('Onay için takma adı birebir yazın.'); return; }
    try { await api('/players/' + encodeURIComponent(current.id), { method: 'DELETE', body: { reason: $('delete-reason').value } }); $('detail').hidden = true; $('delete-reason').value = ''; $('delete-confirm').value = ''; loadPlayers(); }
    catch (err) { alertBox(err.message); }
  });

  async function loadAudit() {
    const r = await api('/audit');
    $('audit').replaceChildren(...r.entries.map((a) => { const tr = el('tr'); tr.append(el('td', fmt(a.at)), el('td', ACTIONS[a.action] || a.action), el('td', a.target || '—'), el('td', a.detail || '')); return tr; }));
  }
})();
</script>
</body>
</html>`;
}
