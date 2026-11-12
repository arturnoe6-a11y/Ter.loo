/* Ter Loo – vrijetijdsactiviteiten kiezen
 * Werkt volledig in de browser; gegevens worden lokaal bewaard (localStorage).
 */
(() => {
  'use strict';

  const STORE_KEY = 'terloo-activiteiten-v1';
  const IDLE_MS = 2 * 60 * 1000; // na 2 minuten zonder aanraking terug naar het begin
  const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
    'augustus', 'september', 'oktober', 'november', 'december'];
  const ICONS = ['🎨', '🎵', '🎲', '🃏', '🚶', '🧘', '🍰', '☕', '🌷', '📖', '🎬', '⛪',
    '💃', '🧶', '🥖', '🐾', '🏓', '🎤', '🧩', '💇', '🛍️', '🍽️', '🎉', '🗞️'];
  const AVATAR_COLORS = ['#2f6b4f', '#c8642c', '#4a5fa8', '#8a4f8f', '#a2793a', '#3a7f86', '#b04a5a'];

  const $app = document.getElementById('app');
  const $dialog = document.getElementById('dialog');
  const $toast = document.getElementById('toast');

  /* ------------------------------------------------------------------ */
  /* Hulpfuncties                                                        */
  /* ------------------------------------------------------------------ */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayIso = () => isoDate(new Date());
  const longDate = (s) => { const d = parseDate(s); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const initials = (name) => name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const colorFor = (id) => AVATAR_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const byDateTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
  const sayTime = (t) => { const [h, m] = t.split(':').map(Number); return m ? `${h} uur ${m}` : `${h} uur`; };

  /* ------------------------------------------------------------------ */
  /* Gegevens                                                            */
  /* ------------------------------------------------------------------ */
  function seed() {
    const residents = [
      'Maria Peeters', 'Jozef Janssens', 'Lisette Claes', 'Georges Wouters', 'Simonne Maes',
      'Frans De Smet', 'Agnes Willems', 'Leon Goossens', 'Rosa Mertens', 'Albert Jacobs',
    ].map((name, i) => ({ id: uid(), name, room: String(101 + i * 3) }));

    // Weekschema dat op de komende 7 dagen geplakt wordt
    const template = {
      1: [['Koffie & krant', '☕', '10:00', 'Cafetaria', 0, 'Samen de krant lezen bij een tas koffie.'],
          ['Bingo', '🎲', '14:30', 'Leefruimte', 20, 'Met mooie prijzen!']],
      2: [['Zachte gymnastiek', '🧘', '10:30', 'Polyvalente zaal', 12, 'Bewegen op de stoel, op je eigen tempo.'],
          ['Breiclub', '🧶', '14:00', 'Leefruimte', 8, 'Breien, haken en gezellig babbelen.']],
      3: [['Wandeling in het park', '🚶', '10:00', 'Inkom', 8, 'Rolstoelen zijn welkom, er gaan begeleiders mee.'],
          ['Samen zingen', '🎵', '15:00', 'Polyvalente zaal', 0, 'Oude liedjes van vroeger.']],
      4: [['Schilderen', '🎨', '14:00', 'Atelier', 10, 'Al het materiaal is aanwezig.']],
      5: [['Bakken', '🍰', '10:00', 'Keuken', 6, 'We bakken een taart voor bij de koffie.'],
          ['Film', '🎬', '14:30', 'Leefruimte', 25, 'Een klassieke film met een zakje snoep.']],
      6: [['Kaarten', '🃏', '14:00', 'Cafetaria', 12, 'Wiezen, manillen of rikken.']],
      0: [['Misviering', '⛪', '10:00', 'Kapel', 0, ''],
          ['Muzieknamiddag', '💃', '15:00', 'Cafetaria', 0, 'Live muziek met een drankje.']],
    };
    const activities = [];
    const start = new Date();
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      for (const [title, icon, time, location, capacity, description] of template[d.getDay()] || []) {
        activities.push({ id: uid(), title, icon, date: isoDate(d), time, location, capacity, description });
      }
    }
    // Een paar inschrijvingen als voorbeeld
    const signups = {};
    activities.slice(0, 4).forEach((a, i) => { signups[a.id] = residents.slice(i, i + 3).map((r) => r.id); });

    return { version: 1, pin: '1234', residents, activities, signups };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.residents) && Array.isArray(data.activities)) {
          data.signups ||= {};
          data.pin ||= '1234';
          return data;
        }
      }
    } catch (e) { /* opslag niet beschikbaar of beschadigd */ }
    return seed();
  }

  let db = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    catch (e) { toast('Let op: opslaan is niet gelukt op dit toestel.'); }
  }
  save();

  const resident = (id) => db.residents.find((r) => r.id === id);
  const activity = (id) => db.activities.find((a) => a.id === id);
  const signupsFor = (aid) => (db.signups[aid] ||= []);
  const isJoined = (aid, rid) => signupsFor(aid).includes(rid);
  const spotsLeft = (a) => (a.capacity > 0 ? Math.max(0, a.capacity - signupsFor(a.id).length) : Infinity);

  /* ------------------------------------------------------------------ */
  /* UI-helpers                                                          */
  /* ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('show'), 3200);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('Voorlezen werkt niet op dit toestel.'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-BE';
    u.rate = 0.85;
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('nl'));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  function avatar(r) {
    return `<span class="avatar" style="background:${colorFor(r.id)}" aria-hidden="true">${esc(initials(r.name))}</span>`;
  }

  function openDialog(html, onReady) {
    $dialog.innerHTML = html;
    $dialog.showModal();
    onReady?.($dialog);
  }
  const closeDialog = () => $dialog.open && $dialog.close();
  $dialog.addEventListener('click', (e) => { if (e.target === $dialog) closeDialog(); });

  function confirmBox(title, body, okLabel = 'Ja', danger = false) {
    return new Promise((resolve) => {
      openDialog(`
        <h2>${esc(title)}</h2>
        <p>${esc(body)}</p>
        <div class="btn-row">
          <button class="btn ${danger ? 'danger' : 'ok'}" data-ok>${esc(okLabel)}</button>
          <button class="btn secondary" data-cancel>Annuleren</button>
        </div>`, (d) => {
        d.querySelector('[data-ok]').onclick = () => { closeDialog(); resolve(true); };
        d.querySelector('[data-cancel]').onclick = () => { closeDialog(); resolve(false); };
        d.addEventListener('close', () => resolve(false), { once: true });
      });
    });
  }

  function tickClock() {
    const d = new Date();
    document.getElementById('clock').textContent =
      `${cap(DAYS[d.getDay()])} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  tickClock();
  setInterval(tickClock, 15000);

  /* ------------------------------------------------------------------ */
  /* Navigatie                                                           */
  /* ------------------------------------------------------------------ */
  const state = { view: 'pick', residentId: null, filter: 'all', staff: false, staffTab: 'activities', showPast: false, query: '' };

  function go(patch) {
    Object.assign(state, patch);
    render();
    window.scrollTo(0, 0);
    $app.focus({ preventScroll: true });
  }

  document.getElementById('homeBtn').onclick = () => go({ view: 'pick', residentId: null, staff: false, query: '' });
  document.getElementById('staffBtn').onclick = () => (state.staff ? go({ view: 'staff' }) : askPin());

  // Gedeelde tablet: na een tijdje niets doen terug naar het startscherm
  let idleTimer;
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (state.view !== 'pick') { closeDialog(); go({ view: 'pick', residentId: null, staff: false, query: '' }); }
    }, IDLE_MS);
  };
  ['pointerdown', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();

  function render() {
    if (state.view === 'resident' && resident(state.residentId)) return renderResident();
    if (state.view === 'staff' && state.staff) return renderStaff();
    state.view = 'pick';
    renderPick();
  }

  /* ------------------------------------------------------------------ */
  /* Scherm 1: wie ben jij?                                              */
  /* ------------------------------------------------------------------ */
  function renderPick() {
    const q = state.query.trim().toLowerCase();
    const list = [...db.residents]
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.room.includes(q));

    $app.innerHTML = `
      <h1>Goeiedag! 👋</h1>
      <p class="lead">Tik op je naam om je activiteiten te kiezen.</p>
      ${db.residents.length > 8 ? `<input class="search" type="search" placeholder="🔍 Zoek je naam of kamernummer" value="${esc(state.query)}" aria-label="Zoek je naam">` : ''}
      <div class="people">
        ${list.map((r) => `
          <button class="person" data-id="${r.id}">
            ${avatar(r)}
            <span>${esc(r.name)}</span>
            ${r.room ? `<span class="room">Kamer ${esc(r.room)}</span>` : ''}
          </button>`).join('')}
      </div>
      ${list.length ? '' : `<div class="empty">${db.residents.length ? 'Geen bewoner gevonden.' : 'Er zijn nog geen bewoners. De begeleiding kan ze toevoegen.'}</div>`}
    `;
    $app.querySelectorAll('.person').forEach((b) => { b.onclick = () => go({ view: 'resident', residentId: b.dataset.id, filter: 'all' }); });
    const search = $app.querySelector('.search');
    if (search) {
      search.oninput = () => {
        state.query = search.value;
        const pos = search.selectionStart;
        renderPick();
        const s = $app.querySelector('.search');
        s.focus(); s.setSelectionRange(pos, pos);
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scherm 2: activiteiten kiezen                                       */
  /* ------------------------------------------------------------------ */
  function renderResident() {
    const r = resident(state.residentId);
    const today = todayIso();
    const now = new Date();
    const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const upcoming = db.activities
      .filter((a) => a.date > today || (a.date === today && a.time >= nowTime))
      .sort(byDateTime);
    const mine = upcoming.filter((a) => isJoined(a.id, r.id));
    const shown = state.filter === 'mine' ? mine : upcoming;

    const groups = {};
    shown.forEach((a) => (groups[a.date] ||= []).push(a));

    $app.innerHTML = `
      <button class="back" data-back>← Terug naar de namen</button>
      <div class="hello">
        <div class="hello-left">
          ${avatar(r)}
          <div>
            <h1>Dag ${esc(r.name.split(' ')[0])}!</h1>
            <p class="meta">Je doet mee aan <strong>${mine.length}</strong> ${mine.length === 1 ? 'activiteit' : 'activiteiten'}.</p>
          </div>
        </div>
      </div>
      <div class="tabs" role="group" aria-label="Wat wil je zien?">
        <button class="tab" data-filter="all" aria-pressed="${state.filter === 'all'}">📅 Alle activiteiten</button>
        <button class="tab" data-filter="mine" aria-pressed="${state.filter === 'mine'}">⭐ Mijn activiteiten (${mine.length})</button>
      </div>
      ${Object.keys(groups).length ? Object.entries(groups).map(([date, list]) => `
        <div class="day-head">${cap(longDate(date))}${date === today ? '<span class="today">Vandaag</span>' : ''}</div>
        <div class="cards">${list.map((a) => activityCard(a, r)).join('')}</div>
      `).join('') : `<div class="empty">${state.filter === 'mine'
        ? 'Je hebt nog niets gekozen. Tik op <strong>📅 Alle activiteiten</strong> om iets te kiezen.'
        : 'Er staan op dit moment geen activiteiten gepland.'}</div>`}
    `;

    $app.querySelector('[data-back]').onclick = () => go({ view: 'pick', residentId: null });
    $app.querySelectorAll('[data-filter]').forEach((b) => { b.onclick = () => go({ filter: b.dataset.filter }); });
    $app.querySelectorAll('[data-join]').forEach((b) => { b.onclick = () => toggleJoin(b.dataset.join, r.id); });
    $app.querySelectorAll('[data-speak]').forEach((b) => {
      b.onclick = () => {
        const a = activity(b.dataset.speak);
        const left = spotsLeft(a);
        speak(`${a.title}. ${cap(longDate(a.date))}, om ${sayTime(a.time)}, in ${a.location}. ${a.description || ''} ${
          isJoined(a.id, r.id) ? 'Je doet mee.' : left === 0 ? 'Het is volzet.' : 'Tik op de groene knop om mee te doen.'}`);
      };
    });
  }

  function activityCard(a, r) {
    const joined = isJoined(a.id, r.id);
    const left = spotsLeft(a);
    const full = left === 0 && !joined;
    let spots = '';
    if (a.capacity > 0) {
      spots = left === 0
        ? '<span class="spots full">Volzet</span>'
        : `<span class="spots ${left <= 3 ? 'few' : ''}">Nog ${left} ${left === 1 ? 'plaats' : 'plaatsen'} vrij</span>`;
    }
    return `
      <article class="card ${joined ? 'joined' : ''}">
        <div class="card-top">
          <div class="card-icon" aria-hidden="true">${esc(a.icon)}</div>
          <div>
            <h3>${esc(a.title)}</h3>
            <p class="meta">🕒 <strong>${esc(a.time)}</strong> · 📍 ${esc(a.location)}</p>
          </div>
        </div>
        ${a.description ? `<p class="desc">${esc(a.description)}</p>` : ''}
        ${joined ? '<span class="badge-joined">✅ Je doet mee!</span>' : spots}
        <div class="card-actions">
          ${joined
            ? `<button class="btn secondary" data-join="${a.id}">Ik doe toch niet mee</button>`
            : `<button class="btn ok" data-join="${a.id}" ${full ? 'disabled' : ''}>${full ? 'Volzet' : '👍 Ik doe mee'}</button>`}
          <button class="speak" data-speak="${a.id}" aria-label="Lees voor">🔊</button>
        </div>
      </article>`;
  }

  async function toggleJoin(aid, rid) {
    const a = activity(aid);
    const list = signupsFor(aid);
    if (list.includes(rid)) {
      const ok = await confirmBox('Toch niet meedoen?', `Wil je je uitschrijven voor "${a.title}" op ${longDate(a.date)}?`, 'Ja, uitschrijven', true);
      if (!ok) return;
      list.splice(list.indexOf(rid), 1);
      save();
      toast(`Je bent uitgeschreven voor ${a.title}.`);
    } else {
      if (spotsLeft(a) === 0) { toast('Sorry, deze activiteit is volzet.'); return; }
      list.push(rid);
      save();
      toast(`🎉 Ingeschreven voor ${a.title}!`);
    }
    renderResident();
  }

  /* ------------------------------------------------------------------ */
  /* Begeleiding                                                         */
  /* ------------------------------------------------------------------ */
  function askPin() {
    openDialog(`
      <h2>🔒 Begeleiding</h2>
      <p>Geef de pincode in.</p>
      <form method="dialog" id="pinForm">
        <input class="pin-input" type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="Pincode" required>
        <p class="meta" id="pinErr" style="color:var(--danger);min-height:1.4em"></p>
        <div class="btn-row">
          <button class="btn" type="submit">Openen</button>
          <button class="btn secondary" type="button" data-cancel>Annuleren</button>
        </div>
      </form>`, (d) => {
      const input = d.querySelector('input');
      input.focus();
      d.querySelector('[data-cancel]').onclick = closeDialog;
      d.querySelector('#pinForm').onsubmit = (e) => {
        e.preventDefault();
        if (input.value === db.pin) { closeDialog(); go({ view: 'staff', staff: true }); }
        else { d.querySelector('#pinErr').textContent = 'Verkeerde pincode.'; input.value = ''; input.focus(); }
      };
    });
  }

  function renderStaff() {
    const tabs = [['activities', '📅 Activiteiten'], ['residents', '👥 Bewoners'], ['settings', '⚙️ Instellingen']];
    $app.innerHTML = `
      <div class="hello no-print">
        <h1>Begeleiding</h1>
        <button class="btn secondary small" data-logout>🔒 Afsluiten</button>
      </div>
      <div class="tabs no-print" role="group">
        ${tabs.map(([k, l]) => `<button class="tab" data-tab="${k}" aria-pressed="${state.staffTab === k}">${l}</button>`).join('')}
      </div>
      <div id="staffBody"></div>`;
    $app.querySelector('[data-logout]').onclick = () => go({ view: 'pick', staff: false });
    $app.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => go({ staffTab: b.dataset.tab }); });
    const body = $app.querySelector('#staffBody');
    ({ activities: staffActivities, residents: staffResidents, settings: staffSettings })[state.staffTab](body);
  }

  /* ---- Activiteiten beheren ---- */
  function staffActivities(body) {
    const today = todayIso();
    const list = db.activities.filter((a) => state.showPast || a.date >= today).sort(byDateTime);
    const pastCount = db.activities.filter((a) => a.date < today).length;
    body.innerHTML = `
      <div class="btn-row no-print" style="margin-bottom:16px">
        <button class="btn" data-new>➕ Nieuwe activiteit</button>
        <button class="btn secondary" data-copyweek>📋 Kopieer komende week naar de week erna</button>
        <button class="btn secondary" data-printall>🖨️ Afdrukken</button>
      </div>
      <div class="panel">
        <table>
          <thead><tr><th>Wanneer</th><th>Activiteit</th><th>Plaats</th><th>Deelnemers</th><th class="no-print"></th></tr></thead>
          <tbody>
            ${list.map((a) => {
              const names = signupsFor(a.id).map((id) => resident(id)?.name).filter(Boolean);
              return `<tr>
                <td>${esc(cap(longDate(a.date)))}<br><strong>${esc(a.time)}</strong></td>
                <td>${esc(a.icon)} <strong>${esc(a.title)}</strong></td>
                <td>${esc(a.location)}</td>
                <td><strong>${names.length}${a.capacity ? ` / ${a.capacity}` : ''}</strong>
                  ${names.length ? `<div class="names">${names.map(esc).join(', ')}</div>` : ''}</td>
                <td class="no-print"><div class="td-actions">
                  <button class="btn secondary" data-people="${a.id}">👥 Deelnemers</button>
                  <button class="btn secondary" data-edit="${a.id}">✏️ Wijzig</button>
                  <button class="btn danger" data-del="${a.id}">🗑️</button>
                </div></td>
              </tr>`;
            }).join('') || '<tr><td colspan="5">Geen activiteiten gepland.</td></tr>'}
          </tbody>
        </table>
      </div>
      ${pastCount ? `<label class="no-print" style="flex-direction:row;align-items:center;gap:10px">
        <input type="checkbox" data-past ${state.showPast ? 'checked' : ''} style="min-height:auto;width:24px;height:24px">
        Toon ook voorbije activiteiten (${pastCount})</label>` : ''}
    `;
    body.querySelector('[data-new]').onclick = () => editActivity(null);
    body.querySelector('[data-printall]').onclick = () => window.print();
    body.querySelector('[data-copyweek]').onclick = copyWeek;
    body.querySelector('[data-past]')?.addEventListener('change', (e) => go({ showPast: e.target.checked }));
    body.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => editActivity(b.dataset.edit); });
    body.querySelectorAll('[data-people]').forEach((b) => { b.onclick = () => editParticipants(b.dataset.people); });
    body.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const a = activity(b.dataset.del);
        if (!(await confirmBox('Activiteit verwijderen?', `"${a.title}" op ${longDate(a.date)} wordt verwijderd, samen met de inschrijvingen.`, 'Verwijderen', true))) return;
        db.activities = db.activities.filter((x) => x.id !== a.id);
        delete db.signups[a.id];
        save(); render(); toast('Activiteit verwijderd.');
      };
    });
  }

  async function copyWeek() {
    const today = parseDate(todayIso());
    const end = isoDate(addDays(today, 7));
    const src = db.activities.filter((a) => a.date >= todayIso() && a.date < end);
    if (!src.length) { toast('Er zijn geen activiteiten in de komende 7 dagen.'); return; }
    if (!(await confirmBox('Week kopiëren?', `${src.length} activiteiten van de komende 7 dagen worden een week later opnieuw ingepland (zonder inschrijvingen).`, 'Kopiëren'))) return;
    let added = 0;
    src.forEach((a) => {
      const date = isoDate(addDays(parseDate(a.date), 7));
      const exists = db.activities.some((x) => x.date === date && x.time === a.time && x.title === a.title);
      if (!exists) { db.activities.push({ ...a, id: uid(), date }); added++; }
    });
    save(); render();
    toast(added ? `${added} activiteiten toegevoegd.` : 'Die week was al ingepland.');
  }

  function editActivity(id) {
    const a = id ? activity(id) : { title: '', icon: '🎨', date: todayIso(), time: '14:00', location: '', capacity: 0, description: '' };
    openDialog(`
      <h2>${id ? 'Activiteit wijzigen' : 'Nieuwe activiteit'}</h2>
      <form class="grid" id="actForm">
        <label class="full">Naam<input name="title" required value="${esc(a.title)}" placeholder="bv. Bingo"></label>
        <div class="full"><span style="font-size:.85rem;font-weight:700">Pictogram</span>
          <div class="icon-pick">${ICONS.map((ic) => `<button type="button" data-icon="${ic}" aria-pressed="${ic === a.icon}">${ic}</button>`).join('')}</div>
        </div>
        <label>Datum<input type="date" name="date" required value="${esc(a.date)}"></label>
        <label>Uur<input type="time" name="time" required value="${esc(a.time)}"></label>
        <label>Plaats<input name="location" required value="${esc(a.location)}" placeholder="bv. Cafetaria"></label>
        <label>Max. deelnemers (0 = geen limiet)<input type="number" min="0" name="capacity" value="${Number(a.capacity) || 0}"></label>
        <label class="full">Korte uitleg<textarea name="description" placeholder="Wat gaan we doen?">${esc(a.description)}</textarea></label>
        ${id ? '' : '<label class="full">Herhaal wekelijks (aantal weken)<input type="number" min="1" max="26" name="repeat" value="1"></label>'}
        <div class="btn-row full">
          <button class="btn" type="submit">💾 Bewaren</button>
          <button class="btn secondary" type="button" data-cancel>Annuleren</button>
        </div>
      </form>`, (d) => {
      let icon = a.icon;
      d.querySelectorAll('[data-icon]').forEach((b) => {
        b.onclick = () => {
          icon = b.dataset.icon;
          d.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        };
      });
      d.querySelector('[data-cancel]').onclick = closeDialog;
      d.querySelector('#actForm').onsubmit = (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target));
        const data = {
          title: f.title.trim(), icon, date: f.date, time: f.time, location: f.location.trim(),
          capacity: Math.max(0, parseInt(f.capacity, 10) || 0), description: f.description.trim(),
        };
        if (id) Object.assign(a, data);
        else {
          const n = Math.min(26, Math.max(1, parseInt(f.repeat, 10) || 1));
          for (let i = 0; i < n; i++) db.activities.push({ ...data, id: uid(), date: isoDate(addDays(parseDate(data.date), 7 * i)) });
        }
        save(); closeDialog(); render(); toast('Bewaard.');
      };
    });
  }

  function editParticipants(aid) {
    const a = activity(aid);
    const list = signupsFor(aid);
    const people = [...db.residents].sort((x, y) => x.name.localeCompare(y.name, 'nl'));
    openDialog(`
      <h2>${esc(a.icon)} ${esc(a.title)}</h2>
      <p class="meta">${esc(cap(longDate(a.date)))} om ${esc(a.time)} · ${esc(a.location)}${a.capacity ? ` · max. ${a.capacity}` : ''}</p>
      <p>Vink aan wie meedoet (bv. voor bewoners die het niet zelf kunnen).</p>
      <form id="pForm" style="max-height:50vh;overflow:auto;display:grid;gap:6px;margin-bottom:16px">
        ${people.map((r) => `<label style="flex-direction:row;align-items:center;gap:12px;font-weight:400;font-size:1rem">
          <input type="checkbox" value="${r.id}" ${list.includes(r.id) ? 'checked' : ''} style="min-height:auto;width:26px;height:26px">
          ${esc(r.name)} <span class="names">kamer ${esc(r.room)}</span></label>`).join('')}
      </form>
      <div class="btn-row">
        <button class="btn" data-ok>💾 Bewaren</button>
        <button class="btn secondary" data-cancel>Annuleren</button>
      </div>`, (d) => {
      d.querySelector('[data-cancel]').onclick = closeDialog;
      d.querySelector('[data-ok]').onclick = () => {
        const chosen = [...d.querySelectorAll('input:checked')].map((i) => i.value);
        if (a.capacity && chosen.length > a.capacity) { toast(`Te veel deelnemers: maximum is ${a.capacity}.`); return; }
        db.signups[aid] = chosen;
        save(); closeDialog(); render(); toast('Deelnemers bewaard.');
      };
    });
  }

  /* ---- Bewoners beheren ---- */
  function staffResidents(body) {
    const list = [...db.residents].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    const today = todayIso();
    body.innerHTML = `
      <div class="btn-row no-print" style="margin-bottom:16px">
        <button class="btn" data-new>➕ Nieuwe bewoner</button>
      </div>
      <div class="panel">
        <table>
          <thead><tr><th>Naam</th><th>Kamer</th><th>Komende activiteiten</th><th class="no-print"></th></tr></thead>
          <tbody>
            ${list.map((r) => {
              const acts = db.activities.filter((a) => a.date >= today && isJoined(a.id, r.id)).sort(byDateTime);
              return `<tr>
                <td><strong>${esc(r.name)}</strong></td>
                <td>${esc(r.room)}</td>
                <td>${acts.length ? `<div class="names">${acts.map((a) => `${esc(a.icon)} ${esc(a.title)} (${esc(longDate(a.date))})`).join('<br>')}</div>` : '<span class="names">—</span>'}</td>
                <td class="no-print"><div class="td-actions">
                  <button class="btn secondary" data-edit="${r.id}">✏️ Wijzig</button>
                  <button class="btn danger" data-del="${r.id}">🗑️</button>
                </div></td>
              </tr>`;
            }).join('') || '<tr><td colspan="4">Nog geen bewoners.</td></tr>'}
          </tbody>
        </table>
      </div>`;
    body.querySelector('[data-new]').onclick = () => editResident(null);
    body.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => editResident(b.dataset.edit); });
    body.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const r = resident(b.dataset.del);
        if (!(await confirmBox('Bewoner verwijderen?', `${r.name} wordt verwijderd, samen met alle inschrijvingen.`, 'Verwijderen', true))) return;
        db.residents = db.residents.filter((x) => x.id !== r.id);
        Object.keys(db.signups).forEach((k) => { db.signups[k] = db.signups[k].filter((x) => x !== r.id); });
        save(); render(); toast('Bewoner verwijderd.');
      };
    });
  }

  function editResident(id) {
    const r = id ? resident(id) : { name: '', room: '' };
    openDialog(`
      <h2>${id ? 'Bewoner wijzigen' : 'Nieuwe bewoner'}</h2>
      <form class="grid" id="rForm">
        <label class="full">Naam<input name="name" required value="${esc(r.name)}" placeholder="Voornaam Achternaam"></label>
        <label class="full">Kamer<input name="room" value="${esc(r.room)}" placeholder="bv. 112"></label>
        <div class="btn-row full">
          <button class="btn" type="submit">💾 Bewaren</button>
          <button class="btn secondary" type="button" data-cancel>Annuleren</button>
        </div>
      </form>`, (d) => {
      d.querySelector('input').focus();
      d.querySelector('[data-cancel]').onclick = closeDialog;
      d.querySelector('#rForm').onsubmit = (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.target));
        const data = { name: f.name.trim(), room: f.room.trim() };
        if (id) Object.assign(r, data); else db.residents.push({ id: uid(), ...data });
        save(); closeDialog(); render(); toast('Bewaard.');
      };
    });
  }

  /* ---- Instellingen ---- */
  function staffSettings(body) {
    body.innerHTML = `
      <div class="panel">
        <h2 style="margin-top:0">Pincode wijzigen</h2>
        <form id="pinChange" class="grid">
          <label>Nieuwe pincode (4–8 cijfers)<input name="pin" inputmode="numeric" pattern="[0-9]{4,8}" required></label>
          <div class="full"><button class="btn" type="submit">Pincode opslaan</button></div>
        </form>
      </div>
      <div class="panel">
        <h2 style="margin-top:0">Back-up</h2>
        <p class="meta">De gegevens staan enkel op dit toestel. Maak geregeld een back-up of zet ze over naar een ander toestel.</p>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn secondary" data-export>⬇️ Back-up downloaden</button>
          <label class="btn secondary" style="flex-direction:row">⬆️ Back-up terugzetten
            <input type="file" accept="application/json,.json" data-import hidden></label>
        </div>
      </div>
      <div class="panel">
        <h2 style="margin-top:0">Opnieuw beginnen</h2>
        <p class="meta">Wist alle bewoners, activiteiten en inschrijvingen en laadt de voorbeeldgegevens opnieuw.</p>
        <button class="btn danger" data-reset style="margin-top:12px">Alles wissen</button>
      </div>`;
    body.querySelector('#pinChange').onsubmit = (e) => {
      e.preventDefault();
      db.pin = new FormData(e.target).get('pin');
      save(); e.target.reset(); toast('Nieuwe pincode opgeslagen.');
    };
    body.querySelector('[data-export]').onclick = () => {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: `terloo-activiteiten-${todayIso()}.json` });
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    body.querySelector('[data-import]').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.residents) || !Array.isArray(data.activities)) throw new Error('ongeldig');
        if (!(await confirmBox('Back-up terugzetten?', 'De huidige gegevens op dit toestel worden vervangen.', 'Terugzetten', true))) return;
        db = { version: 1, pin: data.pin || db.pin, residents: data.residents, activities: data.activities, signups: data.signups || {} };
        save(); render(); toast('Back-up teruggezet.');
      } catch (err) { toast('Dit bestand is geen geldige back-up.'); }
      e.target.value = '';
    };
    body.querySelector('[data-reset]').onclick = async () => {
      if (!(await confirmBox('Alles wissen?', 'Dit kan niet ongedaan gemaakt worden.', 'Alles wissen', true))) return;
      db = seed(); save(); render(); toast('Voorbeeldgegevens geladen. Pincode is weer 1234.');
    };
  }

  render();
})();
