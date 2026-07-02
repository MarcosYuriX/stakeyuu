/* ===== StakeYuu - app.js ===== */

/* ============================================================
   CONFIG DA NUVEM (Supabase) — aqui voce ira colar os dados do seu projeto
   (Supabase → Settings → API). Deixando em branco, o app funciona
   no modo local (seus dados ficaram somente no navegador).
   A "anon key" é pública a segurança vem das
   políticas RLS criadas pelo supabase.sql.
   ============================================================ */
const SUPABASE_URL = 'https://rbziuqdcpahumyxttuvc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieml1cWRjcGFodW15eHR0dXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTc0MjQsImV4cCI6MjA5ODUzMzQyNH0.UxJAD4y4rzLO6jzklM_tXubCNnXB5Gf9Hq-EHTYZWc8';

const NUVEM = !!(SUPABASE_URL && SUPABASE_KEY);
let sb = null;

const STORAGE_KEY = 'yuutracker_v1';

let state = {
  config: { bancaNome: 'Banca principal', bancaInicial: 0 },
  bets: []
};

let chart = null;
let mesAtivo = ''; // '' = todos, ou 'AAAA-MM'

/* ---------- Persistência ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
  } catch (e) { console.error('Erro ao carregar dados:', e); }
}
function save() {
  if (!NUVEM) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- Utilidades ---------- */
const fmtBRL = v => (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = v => (v >= 0 ? '+' : '') + v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function fmtData(iso) {
  const [y, m, d] = iso.split('-');
  const dt = new Date(+y, +m - 1, +d);
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return `${dias[dt.getDay()]}, ${d}/${m}/${y}`;
}

function lucroDa(bet) {
  const valor = +bet.valor || 0;
  const odd = +bet.cotacao || 0;
  switch (bet.estado) {
    case 'ganha': return valor * (odd - 1);
    case 'perdida': return -valor;
    case 'cashout': return (+bet.retorno || 0) - valor;
    case 'anulada': return 0;
    default: return 0; // pendente
  }
}
function ganhoDa(bet) {
  const valor = +bet.valor || 0;
  switch (bet.estado) {
    case 'ganha': return valor * (+bet.cotacao || 0);
    case 'cashout': return +bet.retorno || 0;
    case 'anulada': return valor;
    case 'perdida': return 0;
    default: return 0;
  }
}
const resolvida = b => ['ganha', 'perdida', 'cashout', 'anulada'].includes(b.estado);

/* ---------- Filtros ---------- */
function apostasFiltradas(ignorarMes) {
  const casa = fCasa.value, tip = fTipster.value, esp = fEsporte.value, est = fEstado.value;
  const de = fDe.value, ate = fAte.value;
  return state.bets.filter(b =>
    (ignorarMes || !mesAtivo || b.data.slice(0, 7) === mesAtivo) &&
    (!casa || b.casa === casa) &&
    (!tip || b.tipster === tip) &&
    (!esp || b.esporte === esp) &&
    (!est || b.estado === est) &&
    (!de || b.data >= de) &&
    (!ate || b.data <= ate)
  );
}

function popularFiltros() {
  const setOpts = (sel, values, placeholder) => {
    const atual = sel.value;
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      [...values].sort().map(v => `<option>${escapeHtml(v)}</option>`).join('');
    sel.value = atual;
  };
  setOpts(fCasa, new Set(state.bets.map(b => b.casa).filter(Boolean)), 'Todas');
  setOpts(fTipster, new Set(state.bets.map(b => b.tipster).filter(Boolean)), 'Todos');
  setOpts(fEsporte, new Set(state.bets.map(b => b.esporte).filter(Boolean)), 'Todos');

  listCasas.innerHTML = [...new Set(state.bets.map(b => b.casa).filter(Boolean))].map(v => `<option value="${escapeHtml(v)}">`).join('');
  listTipsters.innerHTML = [...new Set(state.bets.map(b => b.tipster).filter(Boolean))].map(v => `<option value="${escapeHtml(v)}">`).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Estatísticas ---------- */
function renderStats(bets) {
  const res = bets.filter(resolvida);
  const lucro = res.reduce((s, b) => s + lucroDa(b), 0);
  const stake = res.reduce((s, b) => s + (+b.valor || 0), 0);
  const roi = stake > 0 ? (lucro / stake) * 100 : 0;
  const ganhas = res.filter(b => b.estado === 'ganha').length;
  const perdidas = res.filter(b => b.estado === 'perdida').length;
  const pendentes = bets.filter(b => b.estado === 'pendente').length;
  const banca = +state.config.bancaInicial || 0;
  const prog = banca > 0 ? (lucro / banca) * 100 : null;
  const oddMedia = res.length ? res.reduce((s, b) => s + (+b.cotacao || 0), 0) / res.length : 0;

  stApostas.textContent = bets.length;
  stPendentes.textContent = pendentes ? `${pendentes} pendente${pendentes > 1 ? 's' : ''}` : '';

  stLucro.textContent = fmtBRL(lucro);
  stLucro.className = 'stat-value ' + (lucro > 0 ? 'pos' : lucro < 0 ? 'neg' : '');
  stStake.textContent = `Total apostado: ${fmtBRL(stake)}`;

  stRoi.textContent = fmtPct(roi);
  stRoi.className = 'stat-value ' + (roi > 0 ? 'pos' : roi < 0 ? 'neg' : '');
  stOddMedia.textContent = oddMedia ? `Odd média: ${oddMedia.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}` : '';

  if (prog === null) {
    stProg.textContent = '—';
    stProg.className = 'stat-value';
    stBanca.textContent = 'Configure a banca inicial';
  } else {
    stProg.textContent = fmtPct(prog);
    stProg.className = 'stat-value ' + (prog > 0 ? 'pos' : prog < 0 ? 'neg' : '');
    stBanca.textContent = `Banca atual: ${fmtBRL(banca + lucro)}`;
  }

  const decididas = ganhas + perdidas;
  stAcerto.textContent = decididas ? (ganhas / decididas * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—';
  stAcerto.className = 'stat-value';
  stPlacar.textContent = decididas ? `${ganhas}G · ${perdidas}P` : '';
}

/* ---------- Gráfico ---------- */
function renderChart(bets) {
  const res = bets.filter(resolvida)
    .slice()
    .sort((a, b) => (a.data + (a.hora || '')) < (b.data + (b.hora || '')) ? -1 : 1);

  const labels = [], data = [];
  let acc = 0;
  for (const b of res) {
    acc += lucroDa(b);
    const [y, m, d] = b.data.split('-');
    labels.push(`${d}/${m}`);
    data.push(+acc.toFixed(2));
  }

  chartInfo.textContent = res.length ? `${res.length} apostas resolvidas` : 'Sem apostas resolvidas no período';

  if (typeof Chart === 'undefined') {
    chartInfo.textContent = 'Gráfico indisponível (sem conexão com a internet)';
    return;
  }

  const ctx = document.getElementById('chartLucro').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 280);
  grad.addColorStop(0, 'rgba(139,92,246,.35)');
  grad.addColorStop(1, 'rgba(139,92,246,0)');

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Lucro acumulado',
        data,
        borderColor: '#a78bfa',
        backgroundColor: grad,
        fill: true,
        tension: .35,
        pointRadius: data.length > 60 ? 0 : 3,
        pointBackgroundColor: '#a78bfa',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1d1838',
          borderColor: '#2a2350',
          borderWidth: 1,
          callbacks: { label: c => 'Lucro: ' + fmtBRL(c.parsed.y) }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#948fb0', maxTicksLimit: 12 } },
        y: {
          grid: { color: 'rgba(255,255,255,.06)' },
          ticks: { color: '#948fb0', callback: v => fmtBRL(v) }
        }
      }
    }
  });
}

/* ---------- Lista ---------- */
const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const nomeMes = ym => { const [y, m] = ym.split('-'); return `${NOMES_MES[+m - 1]} ${y}`; };

function renderMeses() {
  const meses = [...new Set(state.bets.map(b => b.data.slice(0, 7)))].sort().reverse();
  if (mesAtivo && !meses.includes(mesAtivo)) mesAtivo = '';
  mesBar.innerHTML = meses.length < 2 && !mesAtivo ? '' :
    `<button class="mes-chip ${!mesAtivo ? 'ativo' : ''}" onclick="setMes('')">Todos</button>` +
    meses.map(m => `<button class="mes-chip ${mesAtivo === m ? 'ativo' : ''}" onclick="setMes('${m}')">${nomeMes(m)}</button>`).join('');
}
function setMes(m) { mesAtivo = m; render(); }

function renderLista(bets) {
  const cont = document.getElementById('listaApostas');
  emptyState.hidden = state.bets.length > 0;
  if (!bets.length) { cont.innerHTML = state.bets.length ? '<p class="hint" style="text-align:center;padding:30px">Nenhuma aposta encontrada com esses filtros.</p>' : ''; return; }

  const porDia = {};
  for (const b of bets) (porDia[b.data] ||= []).push(b);
  const dias = Object.keys(porDia).sort().reverse();

  let mesCorrente = null;
  let html = '';
  for (const dia of dias) {
    const mes = dia.slice(0, 7);
    if (mes !== mesCorrente) {
      mesCorrente = mes;
      const doMes = bets.filter(b => b.data.slice(0, 7) === mes && resolvida(b));
      const totalMes = doMes.reduce((s, b) => s + lucroDa(b), 0);
      const cls = totalMes > 0 ? 'pos' : totalMes < 0 ? 'neg' : 'zero';
      html += `<div class="mes-head"><span>${nomeMes(mes)}</span><span class="dia-total ${cls}">${fmtBRL(totalMes)}</span></div>`;
    }
    const lista = porDia[dia].slice().sort((a, b) => (b.hora || '') < (a.hora || '') ? -1 : 1);
    const total = lista.filter(resolvida).reduce((s, b) => s + lucroDa(b), 0);
    const cls = total > 0 ? 'pos' : total < 0 ? 'neg' : 'zero';
    html += `
      <div class="dia-grupo">
        <div class="dia-head">
          <span>${fmtData(dia)}</span>
          <span class="dia-total ${cls}">${fmtBRL(total)}</span>
        </div>
        ${lista.map(rowHtml).join('')}
      </div>`;
  }
  cont.innerHTML = html;
}

function rowHtml(b) {
  const lucro = lucroDa(b), ganho = ganhoDa(b);
  const lucroCls = !resolvida(b) ? 'mut' : lucro > 0 ? 'pos' : lucro < 0 ? 'neg' : 'mut';
  const estados = { pendente: 'Pendente', ganha: 'Ganha', perdida: 'Perdida', anulada: 'Anulada', cashout: 'Cashout' };
  return `
    <div class="aposta-row">
      <div class="aposta-info">
        <span class="aposta-titulo" title="${escapeHtml(b.titulo || '')}">${escapeHtml(b.titulo || '(sem título)')}</span>
        <div class="aposta-tags">
          ${b.hora ? `<span class="tag">${b.hora}</span>` : ''}
          ${b.casa ? `<span class="tag casa">${escapeHtml(b.casa)}</span>` : ''}
          ${b.tipster ? `<span class="tag tipster">${escapeHtml(b.tipster)}</span>` : ''}
          ${b.esporte ? `<span class="tag">${escapeHtml(b.esporte)}</span>` : ''}
        </div>
      </div>
      <div class="celula"><span class="v">${(+b.cotacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span><span class="l">Cotação</span></div>
      <div class="celula"><span class="v">${fmtBRL(+b.valor || 0)}</span><span class="l">Valor</span></div>
      <div class="celula"><span class="v ${ganho > 0 ? 'pos' : 'mut'}">${fmtBRL(ganho)}</span><span class="l">Ganho</span></div>
      <div class="celula"><span class="v ${lucroCls}">${resolvida(b) ? fmtBRL(lucro) : '—'}</span><span class="l">Lucro</span></div>
      <div class="estado-badge estado-${b.estado}">${estados[b.estado] || b.estado}</div>
      <div class="row-actions">
        <button class="icon-btn" title="Editar" onclick="editarAposta('${b.id}')">✎</button>
        <button class="icon-btn del" title="Excluir" onclick="excluirAposta('${b.id}')">🗑</button>
      </div>
    </div>`;
}

/* ---------- Render geral ---------- */
function render() {
  popularFiltros();
  renderMeses();
  const bets = apostasFiltradas();          // respeita a aba de mês (cards e lista)
  const betsGrafico = apostasFiltradas(true); // gráfico: sempre evolução geral
  renderStats(bets);
  renderLista(bets);
  try { renderChart(betsGrafico); } catch (e) { console.error('Erro no gráfico:', e); }
}

/* ---------- Modal de aposta ---------- */
function abrirModal(bet) {
  modalTitulo.textContent = bet ? 'Editar aposta' : 'Adicionar aposta';
  btnSalvar.textContent = bet ? 'Salvar alterações' : 'Salvar aposta';
  inpId.value = bet ? bet.id : '';
  const agora = new Date();
  inpData.value = bet ? bet.data : agora.toISOString().slice(0, 10);
  inpHora.value = bet ? (bet.hora || '') : agora.toTimeString().slice(0, 5);
  inpCasa.value = bet ? (bet.casa || '') : '';
  inpTitulo.value = bet ? (bet.titulo || '') : '';
  inpEsporte.value = bet ? (bet.esporte || '') : 'Futebol';
  inpEstado.value = bet ? bet.estado : 'pendente';
  inpCotacao.value = bet ? bet.cotacao : '';
  inpValor.value = bet ? bet.valor : '';
  inpRetorno.value = bet ? (bet.retorno || '') : '';
  inpTipster.value = bet ? (bet.tipster || '') : '';
  inpComentario.value = bet ? (bet.comentario || '') : '';
  toggleCashout();
  document.getElementById('ocrStatus').textContent = 'Cole o print com Ctrl+V ou arraste aqui';
  modalAposta.hidden = false;
  inpTitulo.focus();
}
function fecharModal() { modalAposta.hidden = true; }
function toggleCashout() { fieldCashout.hidden = inpEstado.value !== 'cashout'; }

function parseNum(v) {
  if (typeof v !== 'string') return +v || 0;
  v = v.trim().replace(/[^\d.,-]/g, '');
  const uv = v.lastIndexOf(','), up = v.lastIndexOf('.');
  if (uv > -1 && up > -1) {
    if (uv > up) v = v.replace(/\./g, '').replace(',', '.');   // BR: 1.251,00
    else v = v.replace(/,/g, '');                              // US: 1,251.00
  } else if (uv > -1) {
    v = v.split(',').length > 2 ? v.replace(/,/g, '') : v.replace(',', '.');
  }
  return +v || 0;
}

function betParaDb(bet) {
  return {
    data: bet.data, hora: bet.hora || null, casa: bet.casa || null,
    titulo: bet.titulo || null, esporte: bet.esporte || null, estado: bet.estado,
    cotacao: bet.cotacao ?? null, valor: bet.valor ?? null, retorno: bet.retorno ?? null,
    tipster: bet.tipster || null, comentario: bet.comentario || null
  };
}
function dbParaBet(r) {
  return {
    id: r.id, data: r.data, hora: r.hora || '', casa: r.casa || '',
    titulo: r.titulo || '', esporte: r.esporte || '', estado: r.estado,
    cotacao: +r.cotacao || 0, valor: +r.valor || 0,
    retorno: r.retorno == null ? undefined : +r.retorno,
    tipster: r.tipster || '', comentario: r.comentario || ''
  };
}

async function salvarAposta() {
  const valor = parseNum(inpValor.value);
  const cotacao = parseNum(inpCotacao.value);
  if (!inpData.value) { alert('Informe a data da aposta.'); return; }
  if (valor <= 0) { alert('Informe o valor apostado (ex: 50 ou 25,50).'); return; }
  if (cotacao < 1) { alert('Informe uma cotação válida, mínimo 1 (ex: 2,50).'); return; }
  if (inpEstado.value === 'cashout' && inpRetorno.value.trim() === '') { alert('Informe o retorno do cashout.'); return; }

  const bet = {
    id: inpId.value || (NUVEM ? '' : uid()),
    data: inpData.value,
    hora: inpHora.value,
    casa: inpCasa.value.trim(),
    titulo: inpTitulo.value.trim(),
    esporte: inpEsporte.value.trim(),
    estado: inpEstado.value,
    cotacao: cotacao,
    valor: valor,
    retorno: inpEstado.value === 'cashout' ? parseNum(inpRetorno.value) : undefined,
    tipster: inpTipster.value.trim(),
    comentario: inpComentario.value.trim()
  };

  if (NUVEM) {
    btnSalvar.disabled = true;
    try {
      if (bet.id) {
        const { error } = await sb.from('apostas').update(betParaDb(bet)).eq('id', bet.id);
        if (error) throw error;
        const idx = state.bets.findIndex(b => b.id === bet.id);
        if (idx >= 0) state.bets[idx] = bet;
      } else {
        const { data, error } = await sb.from('apostas').insert(betParaDb(bet)).select().single();
        if (error) throw error;
        state.bets.push(dbParaBet(data));
      }
    } catch (e) {
      alert('Erro ao salvar na nuvem: ' + (e.message || e) + '\nVerifique sua internet e tente de novo.');
      btnSalvar.disabled = false;
      return;
    }
    btnSalvar.disabled = false;
  } else {
    const idx = state.bets.findIndex(b => b.id === bet.id);
    if (idx >= 0) state.bets[idx] = bet; else state.bets.push(bet);
    save();
  }

  fecharModal();
  render();
}

function editarAposta(id) {
  const bet = state.bets.find(b => b.id === id);
  if (bet) abrirModal(bet);
}
async function excluirAposta(id) {
  const bet = state.bets.find(b => b.id === id);
  if (!bet) return;
  if (!confirm(`Excluir a aposta "${bet.titulo || 'sem título'}"?`)) return;
  if (NUVEM) {
    const { error } = await sb.from('apostas').delete().eq('id', id);
    if (error) { alert('Erro ao excluir na nuvem: ' + error.message); return; }
  }
  state.bets = state.bets.filter(b => b.id !== id);
  save();
  render();
}

/* ---------- Modal de banca ---------- */
function abrirModalBanca() {
  inpBancaNome.value = state.config.bancaNome || '';
  inpBancaInicial.value = state.config.bancaInicial || '';
  inpOcrIgnorar.value = state.config.ocrIgnorar || '';
  modalBanca.hidden = false;
}
function fecharModalBanca() { modalBanca.hidden = true; }
async function salvarBanca() {
  state.config.bancaNome = inpBancaNome.value.trim() || 'Banca principal';
  state.config.bancaInicial = parseNum(inpBancaInicial.value);
  state.config.ocrIgnorar = inpOcrIgnorar.value.trim();
  if (NUVEM) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('config').upsert({
      user_id: user.id,
      banca_nome: state.config.bancaNome,
      banca_inicial: state.config.bancaInicial,
      ocr_ignorar: state.config.ocrIgnorar
    });
    if (error) { alert('Erro ao salvar na nuvem: ' + error.message); return; }
  }
  save();
  fecharModalBanca();
  render();
}

/* ---------- Exportar / Importar ---------- */
function exportarJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stakeyuu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importarJSON(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const dados = JSON.parse(reader.result);
      if (!dados.bets || !Array.isArray(dados.bets)) throw new Error('Formato inválido');
      if (NUVEM) {
        if (!confirm(`Adicionar ${dados.bets.length} apostas do backup à sua conta?`)) return;
        const { error } = await sb.from('apostas').insert(dados.bets.map(betParaDb));
        if (error) { alert('Erro ao importar: ' + error.message); return; }
        await carregarNuvem();
      } else {
        if (!confirm(`Importar ${dados.bets.length} apostas? Isso substitui os dados atuais.`)) return;
        state = { config: dados.config || state.config, bets: dados.bets };
        save();
      }
      render();
    } catch (e) {
      alert('Arquivo inválido. Use um backup exportado pelo StakeYuu.');
    }
  };
  reader.readAsText(file);
}

/* ---------- Eventos ---------- */
document.getElementById('btnAdd').addEventListener('click', () => abrirModal());
document.getElementById('btnBankroll').addEventListener('click', abrirModalBanca);
document.getElementById('btnExport').addEventListener('click', exportarJSON);
document.getElementById('btnImport').addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', e => { if (e.target.files[0]) importarJSON(e.target.files[0]); e.target.value = ''; });
inpEstado.addEventListener('change', toggleCashout);
document.getElementById('btnLimparFiltros').addEventListener('click', () => {
  fCasa.value = fTipster.value = fEsporte.value = fEstado.value = fDe.value = fAte.value = '';
  render();
});
[fCasa, fTipster, fEsporte, fEstado, fDe, fAte].forEach(el => el.addEventListener('change', render));
document.querySelectorAll('.modal-backdrop').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) m.hidden = true; })
);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { modalAposta.hidden = true; modalBanca.hidden = true; } });

/* ---------- OCR (leitura de print) ---------- */
const CASAS_CONHECIDAS = ['Betano', 'Bet365', 'Betfair', 'Superbet', 'Esportes da Sorte', 'KTO', 'Estrela Bet', 'Sportingbet', 'Pixbet', 'Betwarrior', 'HiperBet', 'Stake', 'Novibet', 'BetMGM', 'Betsson', 'F12', 'Vaidebet', 'BateuBet', 'Br4bet', 'Seubet', '7Games', 'Cassino Pix', 'MC Games', 'Rei do Pitaco', 'Betnacional'];

function carregarScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function lerPrint(imagem) {
  const status = document.getElementById('ocrStatus');
  const btn = document.getElementById('btnOcr');
  btn.disabled = true;
  try {
    if (typeof Tesseract === 'undefined') {
      status.textContent = 'Carregando leitor (só demora na 1ª vez)...';
      await carregarScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    }
    status.textContent = 'Lendo print... 0%';
    const { data } = await Tesseract.recognize(imagem, 'por', {
      logger: m => {
        if (m.status === 'recognizing text') status.textContent = `Lendo print... ${Math.round(m.progress * 100)}%`;
      }
    });
    console.log('=== TEXTO OCR ===');
    console.log(data.text);
    const ok = aplicarOcr(data.text);
    status.textContent = ok ? '✓ Preenchido! Confira os valores antes de salvar.' : 'Não achei odd/valor no print. Preencha manualmente.';
  } catch (e) {
    console.error('Erro no OCR:', e);
    status.textContent = 'Não consegui ler o print (precisa de internet na 1ª vez).';
  }
  btn.disabled = false;
}

function aplicarOcr(texto) {
  let achouAlgo = false;
  const linhasArr = texto.split('\n');
  const RE_MOEDA = /(?:R\$|BRL|US\$|\$)\s*([\d][\d.,]*)/gi;

  // Valores monetários com o contexto da linha onde aparecem
  const moedas = [...texto.matchAll(RE_MOEDA)].map(m => {
    const nLinha = (texto.slice(0, m.index).match(/\n/g) || []).length;
    return { valor: parseNum(m[1]), ctx: (linhasArr[nLinha] || '').toLowerCase() };
  }).filter(o => o.valor > 0);

  // 1º: tenta pelas palavras da linha; 2º: pela ordem (primeiro = apostado, último = ganho)
  let stake = (moedas.find(o => /apostado|apostada|stake|valor da aposta/.test(o.ctx)) || {}).valor || 0;
  let ganho = (moedas.find(o => /ganho|retorno|potencial|payout/.test(o.ctx)) || {}).valor || 0;
  if (!stake && moedas.length) stake = moedas[0].valor;
  if (!ganho && moedas.length > 1) ganho = moedas[moedas.length - 1].valor;

  // Odds: números decimais que NÃO são valores monetários
  // (também ignora números de linha de mercado, ex: "Mais de 3.5", "Over 2.5")
  const textoSemMoeda = texto.replace(RE_MOEDA, ' ');
  const textoOdds = textoSemMoeda.replace(/(mais de|menos de|acima de|abaixo de|over|under)\s*\d{1,3}[.,]?\d{0,3}/gi, ' ');
  const odds = [...textoOdds.matchAll(/\b(\d{1,3}[.,]\d{2,3})\b/g)]
    .map(m => parseNum(m[1])).filter(v => v >= 1.01 && v <= 500);

  let odd = 0;
  // Prioridade máxima: odd com símbolo @ (ex: @9.5, @2,50)
  const arroba = textoSemMoeda.match(/@\s*(\d{1,3}(?:[.,]\d{1,3})?)\b/);
  if (arroba) {
    const v = parseNum(arroba[1]);
    if (v >= 1.01 && v <= 500) odd = v;
  }
  // Melhor caso: a odd que fecha a conta stake × odd ≈ ganho (resolve odds turbinadas: pega a nova, não a riscada)
  if (!odd && stake > 0 && ganho > stake) {
    odd = odds.find(o => Math.abs(stake * o - ganho) < ganho * 0.02) || 0;
    if (!odd) {
      const calc = ganho / stake;
      if (calc >= 1.01 && calc <= 500) odd = +calc.toFixed(2);
    }
  }
  // Odd turbinada sem valores no print: par "riscada ➜ nova" na mesma linha → pega a segunda
  if (!odd) {
    const par = textoOdds.match(/\b(\d{1,3}[.,]\d{2,3})\b[^\d\n]{1,8}\b(\d{1,3}[.,]\d{2,3})\b/);
    if (par) {
      const v = parseNum(par[2]);
      if (v >= 1.01 && v <= 500) odd = v;
    }
  }
  // Senão: linha com "odds"/"cotação"
  if (!odd) {
    const linhaOdd = linhasArr.find(l => /total de odds|cotaç|odds?\b/i.test(l) && !RE_MOEDA.test(l));
    if (linhaOdd) {
      const m = linhaOdd.match(/\b(\d{1,3}[.,]\d{2,3})\b/g);
      if (m) odd = parseNum(m[m.length - 1]); // última da linha (a turbinada, não a riscada)
    }
  }
  if (!odd && odds.length) odd = odds[0];

  if (stake > 0) { inpValor.value = String(stake).replace('.', ','); achouAlgo = true; }
  if (odd > 0) { inpCotacao.value = String(odd).replace('.', ','); achouAlgo = true; }

  // Estado: badge VENCEU / PERDEU no print
  if (/\bvenceu\b|\bganhou\b/i.test(texto)) inpEstado.value = 'ganha';
  else if (/\bperdeu\b|\bperdida\b/i.test(texto)) inpEstado.value = 'perdida';
  toggleCashout();

  // Casa de apostas conhecida
  const casa = CASAS_CONHECIDAS.find(c => new RegExp(c.replace(/\s/g, '\\s*'), 'i').test(texto));
  if (casa && !inpCasa.value) { inpCasa.value = casa; achouAlgo = true; }

  // Título: escolhe a melhor linha do print
  if (!inpTitulo.value) {
    // Termos promocionais/genéricos que nunca são o título da aposta
    const IGNORAR_PADRAO = ['super odds', 'odds turbinadas', 'turbinada', 'especiais do dia',
      'enhanced', 'combos', 'boost', 'ao vivo', 'criar aposta', 'cash out', 'cashout',
      'aposta simples', 'aposta múltipla', 'ganhos potenciais', 'retorno potencial',
      'possível retorno', 'apostar agora', 'bilhete', 'cupom', 'meus boletins',
      'total de odds', 'total apostado', 'ganho potencial', 'venceu', 'perdeu',
      'combinações melhoradas', 'combinacoes melhoradas'];
    // Palavras que o usuário configurou (⚙ Banca)
    const ignorarUsuario = (state.config.ocrIgnorar || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const ignorar = [...IGNORAR_PADRAO, ...ignorarUsuario];
    // Palavras típicas de mercado (indicam que a linha É o título da aposta)
    const MERCADO = ['marcar', 'marca', 'gol', 'gols', 'escanteio', 'cartõ', 'cartão', 'vencer',
      'vence', 'ganham', 'ganha', 'ambas', 'ambos', 'mais de', 'menos de', 'acima de',
      'handicap', 'dupla chance', 'empate', 'finaliza', 'chute', 'assistência', 'ponto', 'sets',
      'qualificar', 'classificar', 'defesa', 'rebote', 'jogador'];

    // 1) Limpa bolinhas/ícones lidos como letra no começo da linha (O, ©, •, etc)
    const cruas = texto.split('\n').map(x => x.trim().replace(/^[OoQ0©®•·º*@«»~_\-–—=]+\s+/, ''));

    // 2) Solta pares de números pendurados no fim da linha (odd riscada + turbinada à direita do texto)
    const soltas = [];
    for (const s of cruas) {
      const m = s.match(/^(.*[a-zA-ZÀ-ú])[\s:]+(\d[\d.,]*[\s>»~-]+\d[\d.,]*)\s*$/);
      if (m) { soltas.push(m[1].trim()); soltas.push(m[2].trim()); }
      else soltas.push(s);
    }

    // 3) Emenda linhas quebradas pelo OCR: termina em conectivo ou a próxima começa minúscula
    //    (pula linhas só de números no meio, tipo a linha das odds)
    const CONTINUA = /(?:^|\s)(e|de|da|do|dos|das|na|no|nas|nos|ou|com|por|para|a|o|à|ao|&)$|[:\-+,]$/i;
    const brutas = [];
    let idxTexto = -1;
    for (const s of soltas) {
      if (!s) { brutas.push(s); idxTexto = -1; continue; }
      const textual = /[a-zA-ZÀ-ú]{2,}/.test(s);
      if (textual && idxTexto >= 0) {
        const ant = brutas[idxTexto];
        if ((ant.length + s.length) < 120 && (CONTINUA.test(ant) || /^[a-zà-ú]/.test(s))) {
          brutas[idxTexto] = ant + ' ' + s;
          continue;
        }
      }
      brutas.push(s);
      if (textual) idxTexto = brutas.length - 1;
    }

    // 4) Gruda quantificadores ("Mais de 3.5", "2+") na seleção da linha de baixo, invertido:
    //    "Mais de 3.5" + "Portugal Escanteios" vira "Portugal Escanteios Mais de 3.5"
    const QUANT = /^(?:(?:mais|menos|acima|abaixo|over|under)\b.{0,10}\d[\d.,]*\+?|\d+[\d.,]*\s*\+)/i;
    for (let i = 0; i < brutas.length - 1; i++) {
      if (brutas[i] && brutas[i].length <= 18 && QUANT.test(brutas[i]) && /[a-zA-ZÀ-ú]{4,}/.test(brutas[i + 1] || '')) {
        const quant = brutas[i].replace(/[^\dA-Za-zÀ-ú+.,]+$/, '').trim();
        brutas[i + 1] = brutas[i + 1] + ' ' + quant;
        brutas[i] = '';
      }
    }
    const linhas = [];
    brutas.forEach((l, idxBruta) => {
      if (l.length >= 10 && /[a-zA-ZÀ-ú]{4,}/.test(l) && !/R\$/.test(l)
        && !CASAS_CONHECIDAS.some(c => l.toLowerCase() === c.toLowerCase())
        && !ignorar.some(p => l.toLowerCase().includes(p))) linhas.push({ l, idxBruta });
    });

    if (linhas.length) {
      const ehMercado = l => MERCADO.some(m => l.toLowerCase().includes(m));
      const doMercado = linhas.filter(o => ehMercado(o.l));

      if (doMercado.length >= 2) {
        // Aposta criada / múltipla: junta as seleções (linhas adjacentes viram uma só)
        const grupos = [];
        for (const o of doMercado) {
          const ultimo = grupos[grupos.length - 1];
          if (ultimo && o.idxBruta === ultimo.fim + 1) { ultimo.txt += ' ' + o.l; ultimo.fim = o.idxBruta; }
          else grupos.push({ txt: o.l, fim: o.idxBruta });
        }
        inpTitulo.value = grupos.map(g => g.txt).join(' + ').slice(0, 90);
        achouAlgo = true;
      } else {
        const pontuar = (o, idx) => {
          const low = o.l.toLowerCase();
          let p = Math.max(0, 10 - idx * 2);                 // linhas do topo valem mais
          if (ehMercado(o.l)) p += 15;                       // parece mercado de aposta
          if (/\s[x×]\s|\svs\.?\s/i.test(o.l)) p -= 8;       // parece nome de evento (Time x Time)
          if (o.l.length > 25) p += 2;
          return p;
        };
        const melhor = linhas
          .map((o, i) => ({ l: o.l, p: pontuar(o, i) }))
          .sort((a, b) => b.p - a.p)[0];
        inpTitulo.value = melhor.l.slice(0, 90);
        achouAlgo = true;
      }
    }
  }
  return achouAlgo;
}

/* Botão, colar (Ctrl+V) e arrastar print */
document.getElementById('btnOcr').addEventListener('click', () => fileOcr.click());
fileOcr.addEventListener('change', e => { if (e.target.files[0]) lerPrint(e.target.files[0]); e.target.value = ''; });

document.addEventListener('paste', e => {
  if (modalAposta.hidden) return;
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (item) { e.preventDefault(); lerPrint(item.getAsFile()); }
});

ocrBox.addEventListener('dragover', e => { e.preventDefault(); ocrBox.classList.add('drag'); });
ocrBox.addEventListener('dragleave', () => ocrBox.classList.remove('drag'));
ocrBox.addEventListener('drop', e => {
  e.preventDefault(); ocrBox.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) lerPrint(f);
});

/* ---------- Nuvem: login, carregamento e migração ---------- */
async function carregarNuvem() {
  const { data: rows, error } = await sb.from('apostas').select('*').order('data');
  if (error) { alert('Erro ao carregar apostas: ' + error.message); return; }
  state.bets = (rows || []).map(dbParaBet);
  const { data: cfg } = await sb.from('config').select('*').maybeSingle();
  if (cfg) state.config = {
    bancaNome: cfg.banca_nome || 'Banca principal',
    bancaInicial: +cfg.banca_inicial || 0,
    ocrIgnorar: cfg.ocr_ignorar || ''
  };
}

async function migrarDadosLocais() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const antigos = JSON.parse(raw);
    if (!antigos.bets || !antigos.bets.length) { localStorage.removeItem(STORAGE_KEY); return; }
    if (state.bets.length > 0) return; // conta já tem dados: não arrisca duplicar
    if (!confirm(`Encontrei ${antigos.bets.length} apostas salvas neste navegador.\nEnviar todas pra sua conta na nuvem?`)) return;
    const { error } = await sb.from('apostas').insert(antigos.bets.map(betParaDb));
    if (error) { alert('Erro ao migrar: ' + error.message); return; }
    if (antigos.config && (antigos.config.bancaInicial || antigos.config.ocrIgnorar)) {
      const { data: { user } } = await sb.auth.getUser();
      await sb.from('config').upsert({
        user_id: user.id,
        banca_nome: antigos.config.bancaNome || 'Banca principal',
        banca_inicial: antigos.config.bancaInicial || 0,
        ocr_ignorar: antigos.config.ocrIgnorar || ''
      });
    }
    localStorage.removeItem(STORAGE_KEY);
    await carregarNuvem();
    alert('Apostas migradas pra nuvem com sucesso! ✓');
  } catch (e) { console.error('Erro na migração:', e); }
}

function mostrarAuth(exibir) {
  authScreen.hidden = !exibir;
}

async function aoLogar(user) {
  mostrarAuth(false);
  btnSair.hidden = false;
  userEmail.hidden = false;
  userEmail.textContent = user.email;
  await carregarNuvem();
  await migrarDadosLocais();
  render();
}

async function entrar() {
  const email = authEmail.value.trim(), senha = authSenha.value;
  if (!email || !senha) { authMsg.textContent = 'Preencha e-mail e senha.'; return; }
  authMsg.textContent = 'Entrando...';
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) { authMsg.textContent = 'Erro: ' + error.message; return; }
  authMsg.textContent = '';
  aoLogar(data.user);
}

async function criarConta() {
  const email = authEmail.value.trim(), senha = authSenha.value;
  if (!email || !senha) { authMsg.textContent = 'Preencha e-mail e senha.'; return; }
  if (senha.length < 6) { authMsg.textContent = 'A senha precisa de pelo menos 6 caracteres.'; return; }
  authMsg.textContent = 'Criando conta...';
  const { data, error } = await sb.auth.signUp({ email, password: senha });
  if (error) { authMsg.textContent = 'Erro: ' + error.message; return; }
  if (data.session) { authMsg.textContent = ''; aoLogar(data.user); }
  else authMsg.textContent = 'Conta criada! Confirme o e-mail que enviamos e depois clique em Entrar.';
}

async function sair() {
  await sb.auth.signOut();
  state.bets = [];
  state.config = { bancaNome: 'Banca principal', bancaInicial: 0 };
  btnSair.hidden = true;
  userEmail.hidden = true;
  render();
  mostrarAuth(true);
}

async function initNuvem() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: { session } } = await sb.auth.getSession();
  if (session) aoLogar(session.user);
  else { mostrarAuth(true); render(); }
}

document.getElementById('btnEntrar').addEventListener('click', entrar);
document.getElementById('btnCriar').addEventListener('click', criarConta);
document.getElementById('btnSair').addEventListener('click', sair);
authSenha.addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });

/* ---------- Init ---------- */
if (NUVEM) {
  initNuvem();
} else {
  load();
  render();
}
