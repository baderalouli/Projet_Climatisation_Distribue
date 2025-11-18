/** Modern UI interactions for Climatisation monitoring **/

(function(){
  const roomsContainer = document.getElementById('rooms-container');
  const roomCardTemplate = document.getElementById('room-card-template');
  const inputName = document.getElementById('roomNameInput');
  const btnAdd = document.getElementById('btn-add-room');
  const btnCreate = document.getElementById('btn-create');

  const detail = document.getElementById('detail');
  const detailBack = document.getElementById('detail-back');
  const detailTitle = document.getElementById('detail-title');
  const dTemp = document.getElementById('d-temp');
  const dHum = document.getElementById('d-hum');
  const dPres = document.getElementById('d-pres');
  const dTempTime = document.getElementById('d-temp-time');
  const dHumTime = document.getElementById('d-hum-time');
  const dPresTime = document.getElementById('d-pres-time');
  const dTarget = document.getElementById('d-target');

  const statTotal = document.getElementById('stat-total');
  const statAC = document.getElementById('stat-ac');
  const statAvg = document.getElementById('stat-avg');

  let currentRooms = {};
  let selectedId = null;

  function formatValue(value, unit){
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return `${value.toFixed(1)}${unit}`;
    const n = parseFloat(value); return isNaN(n) ? '—' : `${n.toFixed(1)}${unit}`;
  }

  function formatTime(ts){
    if (!ts) return '—';
    return new Date(ts*1000).toLocaleTimeString();
  }

  function latestTs(room){
    let t = 0; ['temperature','humidite','pression'].forEach(k=>{ if(room[k]?.timestamp>t) t=room[k].timestamp; });
    return t || null;
  }

  function updateStats(){
    const rooms = Object.values(currentRooms);
    statTotal.textContent = rooms.length;
    const ac = rooms.filter(r=>r.climatisation_active).length; statAC.textContent = ac;
    const temps = rooms.map(r=>r.temperature?.valeur).filter(v=>typeof v === 'number');
    statAvg.textContent = temps.length? (temps.reduce((a,b)=>a+b,0)/temps.length).toFixed(1)+"°C" : '—';
  }

  function setupEvents(card, id){
    const plusBtn = card.querySelector('.temp-plus');
    const minusBtn = card.querySelector('.temp-minus');
    const acToggle = card.querySelector('.ac-toggle');
    const autoToggle = card.querySelector('.auto-toggle');
    const exploreBtn = card.querySelector('.btn-explorer');

    plusBtn.addEventListener('click', ()=> adjustTarget(id, +0.5));
    minusBtn.addEventListener('click', ()=> adjustTarget(id, -0.5));

    acToggle.addEventListener('change', ()=> updateAC(id, acToggle.checked));
    autoToggle.addEventListener('change', ()=> updateAuto(id, autoToggle.checked));

    exploreBtn.addEventListener('click', ()=> openDetail(id));
  }

  function renderCard(id, data){
    let card = document.querySelector(`.room-card[data-room-id="${id}"]`);
    if (!card){
      const tpl = roomCardTemplate.content.cloneNode(true);
      card = tpl.querySelector('.room-card');
      card.dataset.roomId = id;
      card.querySelector('.room-name').textContent = id;
      roomsContainer.appendChild(card);
      setupEvents(card, id);
    }

    // Status
    const chip = card.querySelector('.chip');
    const statusText = card.querySelector('.status-text');
    if (data.climatisation_active){
      chip.classList.remove('chip--off');
      chip.classList.add('chip--on');
      statusText.textContent = 'Clim ON';
    } else {
      chip.classList.remove('chip--on');
      chip.classList.add('chip--off');
      statusText.textContent = 'Clim OFF';
    }

    // Metrics
    const tempEl = card.querySelector('.temperature-value');
    const humEl = card.querySelector('.humidity-value');
    const presRow = card.querySelector('.pressure-row');
    const presEl = card.querySelector('.pressure-value');

    if (data.temperature){ tempEl.textContent = formatValue(data.temperature.valeur, data.temperature.unite); } else { tempEl.textContent = '—'; }
    if (data.humidite){ humEl.textContent = formatValue(data.humidite.valeur, data.humidite.unite); } else { humEl.textContent = '—'; }
    if (data.pression){ presRow.style.display='grid'; presEl.textContent = formatValue(data.pression.valeur, data.pression.unite); } else { presRow.style.display='none'; }

    // Target
    const targetEl = card.querySelector('.target-temp-value');
    targetEl.textContent = formatValue(data.temperature_cible, '°C');

    // Toggles
    const acToggle = card.querySelector('.ac-toggle');
    const autoToggle = card.querySelector('.auto-toggle');
    acToggle.checked = !!data.climatisation_active;
    autoToggle.checked = !!data.mode_automatique;
    acToggle.disabled = !!data.mode_automatique;

    // Last update
    const timeEl = card.querySelector('.update-time');
    const ts = latestTs(data);
    timeEl.textContent = formatTime(ts);

    // Auto badge visibility
    const badge = card.querySelector('.badge');
    badge.style.display = data.mode_automatique ? 'inline-flex' : 'none';

    card.classList.add('fade-in');
    setTimeout(()=>card.classList.remove('fade-in'), 300);
  }

  async function adjustTarget(id, delta){
    const current = currentRooms[id]?.temperature_cible ?? 21;
    const next = Math.max(15, Math.min(30, Math.round((current+delta)*2)/2));
    await fetch(`/api/pieces/${id}/temperature-cible`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ temperature: next }) });
  }

  async function updateAC(id, active){
    const res = await fetch(`/api/pieces/${id}/climatisation`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active }) });
    if (!res.ok) console.error('Erreur MAJ Climatisation');
  }

  async function updateAuto(id, auto){
    const res = await fetch(`/api/pieces/${id}/mode-automatique`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ auto }) });
    if (!res.ok) console.error('Erreur MAJ Mode auto');
  }

  // Detail view
  function openDetail(id){
    selectedId = id;
    detail.classList.remove('hidden');
    detailTitle.textContent = id;
    renderDetail();
  }

  function closeDetail(){
    selectedId = null; detail.classList.add('hidden');
  }

  detailBack.addEventListener('click', closeDetail);

  function renderDetail(){
    if (!selectedId) return;
    const d = currentRooms[selectedId]; if (!d) return;

    if (d.temperature){ dTemp.textContent = formatValue(d.temperature.valeur, d.temperature.unite); dTempTime.textContent = formatTime(d.temperature.timestamp); } else { dTemp.textContent = '—'; dTempTime.textContent='—'; }
    if (d.humidite){ dHum.textContent = formatValue(d.humidite.valeur, d.humidite.unite); dHumTime.textContent = formatTime(d.humidite.timestamp); } else { dHum.textContent = '—'; dHumTime.textContent='—'; }
    if (d.pression){ dPres.textContent = formatValue(d.pression.valeur, d.pression.unite); dPresTime.textContent = formatTime(d.pression.timestamp); } else { dPres.textContent = '—'; dPresTime.textContent='—'; }

    dTarget.textContent = formatValue(d.temperature_cible, '°C');

    // Wire detail toggles + temp
    const detailNode = detail.querySelector('.detail__content');
    const plus = detailNode.querySelector('.temp-plus');
    const minus = detailNode.querySelector('.temp-minus');
    const acT = detailNode.querySelector('.ac-toggle');
    const autoT = detailNode.querySelector('.auto-toggle');

    plus.onclick = ()=> adjustTarget(selectedId, +0.5);
    minus.onclick = ()=> adjustTarget(selectedId, -0.5);
    acT.onchange = ()=> updateAC(selectedId, acT.checked);
    autoT.onchange = ()=> updateAuto(selectedId, autoT.checked);

    acT.checked = !!d.climatisation_active;
    autoT.checked = !!d.mode_automatique;
    acT.disabled = !!d.mode_automatique;

    // Sensor list
    const list = document.getElementById('d-sensors');
    list.innerHTML = '';
    const items = [
      { name:'Température', value: d.temperature? formatValue(d.temperature.valeur, d.temperature.unite) : '—', time: d.temperature?.timestamp },
      { name:'Humidité', value: d.humidite? formatValue(d.humidite.valeur, d.humidite.unite) : '—', time: d.humidite?.timestamp },
      { name:'Pression', value: d.pression? formatValue(d.pression.valeur, d.pression.unite) : '—', time: d.pression?.timestamp },
    ];
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'sensor-row';
      row.innerHTML = `
        <div class="sensor-row__icon">🔹</div>
        <div class="sensor-row__name">${it.name}</div>
        <div class="sensor-row__value">${it.value} <span class="sensor-row__time">${it.time? formatTime(it.time) : '—'}</span></div>
      `;
      list.appendChild(row);
    })
  }

  // Create new room
  async function createRoom(){
    const name = inputName.value.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/capteurs/pieces', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ nom_piece: name })
      });
      if (!res.ok) throw new Error('Erreur lors de la création');
      const payload = await res.json();
      const newId = payload?.piece_id || name;

      // Clear input and remove focus for feedback
      inputName.value = '';
      inputName.blur();
      btnAdd.blur();

      // "Touch" the room in backend so it exists in GestionnairePieces immediately
      await fetch(`/api/pieces/${encodeURIComponent(newId)}/mode-automatique`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ auto: true })
      }).catch(()=>{});

      // Refresh list
      const list = await fetch('/api/pieces').then(r=>r.json()).catch(()=>({}));

      // If backend doesn't expose the room yet, inject a placeholder
      const hasNew = !!list && Object.prototype.hasOwnProperty.call(list, newId);
      currentRooms = list && typeof list === 'object' ? list : {};
      if (!hasNew) {
        currentRooms[newId] = {
          id: newId,
          temperature: null,
          humidite: null,
          pression: null,
          temperature_cible: 21,
          climatisation_active: false,
          mode_automatique: true,
        };
      }

      updateStats();
      roomsContainer.innerHTML = '';
      Object.entries(currentRooms).forEach(([id, d])=> renderCard(id, d));
    } catch (e){
      console.error(e);
    }
  }
  btnAdd.addEventListener('click', createRoom);
  btnCreate.addEventListener('click', ()=> inputName.focus());
  inputName.addEventListener('keypress', e=>{ if(e.key==='Enter') createRoom(); });

  // Initial load and SSE stream
  function init(){
    fetch('/api/pieces').then(r=>r.json()).then(data=>{
      roomsContainer.innerHTML='';
      currentRooms = data; updateStats();
      Object.entries(currentRooms).forEach(([id, d])=> renderCard(id, d));
    });

    const es = new EventSource('/api/stream');
    es.onmessage = evt => {
      const data = JSON.parse(evt.data);
      currentRooms = data; updateStats();
      Object.entries(currentRooms).forEach(([id, d])=> renderCard(id, d));
      if (selectedId) renderDetail();
    }
    es.onerror = _ => { console.warn('SSE error. Retrying in 5s...'); setTimeout(()=>{ es.close(); init(); }, 5000); };
  }

  init();
})();
