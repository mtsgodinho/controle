import { initializeClient, observeAccount, registerAccount, login, logout as signOutAccount, observeEntries, addEntry, removeEntry, completeTask, friendlyError } from './firebase-client.js';
const $ = selector => document.querySelector(selector);
const money = value => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shortDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let entries = [], view = 'overview', month = new Date(new Date().getFullYear(), new Date().getMonth(), 1), register = false, noticeTimer, unsubscribeEntries, accountVersion = 0;
function notice(message) {
  $('#notice').textContent = message;
  $('#notice').classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $('#notice').classList.remove('visible'), 6000);
}
function showAuth() {
  unsubscribeEntries?.();
  unsubscribeEntries = undefined;
  accountVersion++;
  $('#app').hidden = true;
  $('#auth').hidden = false;
  $('#entry-dialog').close();
  entries = [];
  $('#content').replaceChildren();
}
function showApp(account) {
  $('#auth').hidden = true;
  $('#app').hidden = false;
  $('#account-email').textContent = account.email;
  watchMonth();
}
function watchMonth() {
  unsubscribeEntries?.();
  const version = ++accountVersion;
  entries = [];
  render();
  $('#sync-status').textContent = 'Carregando seus registros…';
  unsubscribeEntries = observeEntries(dateKey(month).slice(0, 7), records => {
    if (version !== accountVersion) return;
    entries = records;
    render();
    $('#sync-status').textContent = 'Registros atualizados. Alterações aparecem nos seus dispositivos.';
  }, error => {
    if (version !== accountVersion) return;
    $('#sync-status').textContent = friendlyError(error);
    notice(friendlyError(error));
  });
}
const views = {
  overview: ['Sua vida, em dia.', 'Um pouco de organização para aproveitar melhor o que importa.', 'Um olhar para a sua rotina'],
  finance: ['Seu dinheiro, com clareza.', 'Acompanhe o que entra e o que sai, sem complicar.', 'Movimentações do mês'],
  agenda: ['Tempo para o que importa.', 'Seus compromissos reunidos em um só lugar.', 'Compromissos do mês'],
  tasks: ['Um passo de cada vez.', 'Tire os planos da cabeça e abra espaço para fazer.', 'Tarefas do mês']
};
function item(entry) {
  const finance = ['income', 'expense'].includes(entry.kind), task = entry.kind === 'task';
  const overdue = task && !entry.done && entry.date < dateKey();
  return `<div class="entry ${entry.done ? 'done' : ''}">${task ? `<input class="check-task" type="checkbox" data-task="${entry.id}" aria-label="Concluir ${escape(entry.title)}" ${entry.done ? 'checked' : ''}>` : `<span class="entry-icon" aria-hidden="true">${entry.kind === 'event' ? '▦' : entry.kind === 'income' ? '+' : '−'}</span>`}<div class="entry-info"><div class="entry-title">${escape(entry.title)}</div><div class="entry-meta ${overdue ? 'overdue' : ''}">${shortDate(entry.date)}${entry.time ? ` · ${escape(entry.time)}` : ''}${finance ? ` · ${escape(entry.category)}` : ''}${overdue ? ' · Atrasada' : ''}</div></div>${finance ? `<span class="entry-amount ${entry.kind === 'income' ? 'positive' : 'negative'}">${entry.kind === 'expense' ? '−' : '+'} ${money(entry.amount)}</span>` : ''}<button class="delete" data-delete="${entry.id}" aria-label="Excluir ${escape(entry.title)}">×</button></div>`;
}
function card(title, records, emptyTitle, emptyMessage, type, full = false) {
  return `<section class="card ${full ? 'full-width' : ''}"><div class="card-head"><h2>${title}</h2><button data-add="${type}">+ Adicionar</button></div>${records.length ? records.map(item).join('') : `<div class="empty"><strong>${emptyTitle}</strong>${emptyMessage}</div>`}</section>`;
}
function render() {
  $('.stats').hidden = view !== 'finance';
  const prefix = dateKey(month).slice(0, 7);
  const current = entries.filter(entry => entry.date.startsWith(prefix));
  const income = current.filter(entry => entry.kind === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expense = current.filter(entry => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
  $('#balance').textContent = money(income - expense);
  $('#income').textContent = money(income);
  $('#expense').textContent = money(expense);
  $('#month-label').textContent = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  $('#today-label').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  const [title, description, section] = views[view];
  $('#page-title').textContent = title;
  $('#page-description').textContent = description;
  $('#section-label').textContent = section;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  const finances = current.filter(entry => ['income', 'expense'].includes(entry.kind)).reverse();
  const events = current.filter(entry => entry.kind === 'event');
  const tasks = current.filter(entry => entry.kind === 'task').sort((a, b) => a.done - b.done || a.date.localeCompare(b.date));
  const upcoming = events.filter(entry => `${entry.date}T${entry.time}` >= `${dateKey()}T${new Date().toTimeString().slice(0, 5)}`);
  let html = '';
  if (view === 'overview') {
    html = `<div class="overview-grid">${card('Na sua agenda', upcoming.slice(0, 4), 'Sua agenda tem espaço.', 'Adicione os próximos compromissos deste mês.', 'event')}${card('Seus próximos passos', tasks.filter(entry => !entry.done).slice(0, 4), 'Uma coisa a menos na cabeça.', 'Anote uma tarefa para começar.', 'task')}${card('Últimas movimentações', finances.slice(0, 5), 'Vamos começar pelo básico?', 'Registre uma receita ou despesa para acompanhar seu dinheiro.', 'expense', true)}<div class="gentle-note full-width"><b aria-hidden="true">✳</b><p><strong>Não precisa resolver tudo hoje.</strong>Escolha uma pequena tarefa e comece por ela. O resto vem com o tempo.</p></div></div>`;
  } else if (view === 'finance') html = card('Receitas e despesas', finances, 'Seu mês começa aqui.', 'Adicione sua primeira movimentação.', 'expense');
  else if (view === 'agenda') html = card('Seus compromissos', events, 'Espaço para novos planos.', 'Adicione um compromisso com data e horário.', 'event');
  else html = card('Sua lista de tarefas', tasks, 'Organize seus próximos passos.', 'Adicione uma tarefa com a data em que pretende fazê-la.', 'task');
  $('#content').innerHTML = html;
}
function fields() {
  const kind = $('#entry-form').elements.kind.value;
  const finance = ['income', 'expense'].includes(kind);
  $('#amount-field').hidden = !finance;
  $('#category-field').hidden = !finance;
  $('#time-field').hidden = kind !== 'event';
  $('#entry-form').elements.amount.required = finance;
  $('#entry-form').elements.amount.disabled = !finance;
  $('#entry-form').elements.time.required = kind === 'event';
  $('#entry-form').elements.time.disabled = kind !== 'event';
}
function openEntry(kind) {
  const form = $('#entry-form');
  form.reset();
  form.elements.kind.value = kind || ({ agenda: 'event', tasks: 'task' }[view] || 'expense');
  form.elements.date.value = dateKey(month).slice(0, 7) === dateKey().slice(0, 7) ? dateKey() : dateKey(month);
  fields();
  $('#entry-dialog').showModal();
  form.elements.title.focus();
}
$('#auth-toggle').addEventListener('click', () => {
  register = !register;
  $('#auth-title').textContent = register ? 'Comece uma rotina mais leve.' : 'Bom ter você por aqui.';
  $('#auth-description').textContent = register ? 'Crie sua conta para guardar seus planos.' : 'Entre para organizar o seu dia.';
  $('#auth-submit').textContent = register ? 'Criar minha conta' : 'Entrar';
  $('#auth-toggle').textContent = register ? 'Já tenho conta. Entrar' : 'Primeira vez? Criar minha conta';
  $('#auth-form').elements.password.autocomplete = register ? 'new-password' : 'current-password';
});
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#auth-submit');
  button.disabled = true;
  try {
    const { email, password } = Object.fromEntries(new FormData(event.target));
    await (register ? registerAccount(email, password) : login(email, password));
    event.target.reset();
  }
  catch (error) { notice(friendlyError(error)); } finally { button.disabled = false; }
});
async function logout() {
  try { await signOutAccount(); showAuth(); } catch (error) { notice(friendlyError(error)); }
}
$('#logout').addEventListener('click', logout);
// Also expose logout on small screens where the sidebar becomes bottom navigation.
const mobileLogout = document.createElement('div');
mobileLogout.className = 'mobile-account';
const logoutButton = document.createElement('button');
logoutButton.textContent = 'Sair da conta';
logoutButton.addEventListener('click', logout);
mobileLogout.append(logoutButton);
$('main').prepend(mobileLogout);
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view; render(); }));
$('#prev-month').addEventListener('click', () => { month.setMonth(month.getMonth() - 1); watchMonth(); });
$('#next-month').addEventListener('click', () => { month.setMonth(month.getMonth() + 1); watchMonth(); });
$('#new-entry').addEventListener('click', () => openEntry());
$('#close-dialog').addEventListener('click', () => $('#entry-dialog').close());
$('#entry-form').elements.kind.addEventListener('change', fields);
$('#entry-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(event.target));
  input.amount = Math.round(Number(input.amount || 0) * 100);
  const button = event.target.querySelector('[type=submit]');
  button.disabled = true;
  try {
    await addEntry(input);
    const changedMonth = dateKey(month).slice(0, 7) !== input.date.slice(0, 7);
    month = new Date(`${input.date.slice(0, 7)}-01T12:00:00`);
    $('#entry-dialog').close();
    notice('Registro salvo.');
    if (changedMonth) watchMonth();
  } catch (error) { notice(friendlyError(error)); } finally { button.disabled = false; }
});
$('#content').addEventListener('click', async event => {
  const add = event.target.closest('[data-add]');
  if (add) return openEntry(add.dataset.add);
  const remove = event.target.closest('[data-delete]');
  if (!remove || !confirm('Excluir este registro? Essa ação não pode ser desfeita.')) return;
  remove.disabled = true;
  try { await removeEntry(remove.dataset.delete); notice('Registro excluído.'); }
  catch (error) { notice(friendlyError(error)); remove.disabled = false; }
});
$('#content').addEventListener('change', async event => {
  const check = event.target.closest('[data-task]');
  if (!check) return;
  check.disabled = true;
  try { await completeTask(check.dataset.task, check.checked); }
  catch (error) { check.checked = !check.checked; check.disabled = false; notice(friendlyError(error)); }
});
async function start() {
  $('#auth-submit').disabled = true;
  $('#auth-toggle').disabled = true;
  try {
    await initializeClient();
    observeAccount(account => {
      if (account) showApp(account); else showAuth();
      $('#auth-submit').disabled = false;
      $('#auth-toggle').disabled = false;
    });
  } catch (error) {
    showAuth();
    $('#auth-error').textContent = friendlyError(error);
    $('#auth-error').hidden = false;
  }
}
start();
