const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function calendarDays(month) {
  const year = month.getFullYear(), index = month.getMonth();
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  const count = new Date(year, index + 1, 0).getDate();
  const prefix = `${year}-${String(index + 1).padStart(2, '0')}`;
  return Array.from({ length: 42 }, (_, cell) => {
    const day = cell - offset + 1;
    return day > 0 && day <= count ? `${prefix}-${String(day).padStart(2, '0')}` : null;
  });
}
export function calendarPanel(month, events, selectedDate, today) {
  return `<section class="card calendar-card"><div class="card-head"><div><span class="eyebrow">SEU TEMPO, VISUALIZADO</span><h2>Calendário do mês</h2></div><button data-day="all">Ver todos</button></div><div class="calendar-weekdays">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${calendarDays(month).map(date => {
    if (!date) return '<span class="calendar-spacer" aria-hidden="true"></span>';
    const count = events.filter(event => event.date === date).length;
    return `<button class="calendar-day ${date === today ? 'is-today' : ''} ${date === selectedDate ? 'is-selected' : ''}" data-day="${date}" aria-pressed="${date === selectedDate}" aria-label="${date.split('-').reverse().join('/')} — ${count} compromisso${count === 1 ? '' : 's'}"><span>${Number(date.slice(-2))}</span>${count ? `<small>${count}<span class="calendar-event-label"> ${count === 1 ? 'evento' : 'eventos'}</span></small>` : ''}</button>`;
  }).join('')}</div><p class="calendar-help">Selecione um dia para ver seus compromissos.</p></section>`;
}
export function weeklyTotals(entries) {
  const weeks = Array.from({length:5}, () => ({income:0,expense:0}));
  for (const entry of entries) if (['income','expense'].includes(entry.kind)) weeks[Math.min(4, Math.floor((Number(entry.date.slice(-2))-1)/7))][entry.kind] += entry.amount;
  return weeks;
}
export function financeChart(entries, money) {
  const weeks = weeklyTotals(entries);
  const max = Math.max(1, ...weeks.flatMap(week => [week.income, week.expense]));
  const hasData = weeks.some(week => week.income || week.expense);
  return `<section class="card cashflow-card"><div class="card-head"><div><span class="eyebrow">ENTRADAS × SAÍDAS</span><h2>O movimento do seu mês</h2></div><span class="panel-tag">Por semana</span></div><div class="chart-legend"><span><i class="income-dot"></i> Receitas</span><span><i class="expense-dot"></i> Despesas</span></div><svg class="cashflow-chart" viewBox="0 0 600 270" role="img" aria-label="Comparação de receitas e despesas nas cinco semanas do mês"><title>Movimentações por semana</title>${[0,1,2,3].map(step => `<path d="M90 ${30+step*60}H580" class="chart-gridline"/><text x="76" y="${34+step*60}" class="axis-value" text-anchor="end">${hasData ? escape(money(Math.round(max*(1-step/3)))) : '—'}</text>`).join('')}${weeks.map((week,index) => {
    const x = 115 + index * 96;
    return `<g><rect x="${x}" y="${210-(week.income/max*180)}" width="22" height="${week.income/max*180}" rx="4" class="bar-income"><title>Semana ${index+1}: receitas ${money(week.income)}</title></rect><rect x="${x+27}" y="${210-(week.expense/max*180)}" width="22" height="${week.expense/max*180}" rx="4" class="bar-expense"><title>Semana ${index+1}: despesas ${money(week.expense)}</title></rect><text x="${x+24}" y="243" class="axis-value" text-anchor="middle">Sem. ${index+1}</text></g>`;
  }).join('')}</svg>${!hasData ? '<p class="chart-empty">Seu gráfico ganha vida com a primeira movimentação.</p>' : ''}</section>`;
}
export function categoryPanel(entries, money) {
  const totals = new Map();
  for (const entry of entries) if (entry.kind === 'expense') totals.set(entry.category || 'Outros', (totals.get(entry.category || 'Outros') || 0) + entry.amount);
  const total = [...totals.values()].reduce((a,b) => a+b, 0);
  const sorted = [...totals].sort((a,b) => b[1]-a[1]);
  return `<section class="card category-card"><div class="card-head"><div><span class="eyebrow">MAPA DE DESPESAS</span><h2>Para onde vai o dinheiro</h2></div></div><div class="category-list">${sorted.length ? sorted.map(([category,amount]) => `<div class="category-row"><div><span>${escape(category)}</span><strong>${money(amount)}</strong></div><meter min="0" max="${total}" value="${amount}" aria-label="${escape(category)}: ${Math.round(amount/total*100)}% das despesas"></meter><small>${Math.round(amount/total*100)}% das despesas</small></div>`).join('') : '<div class="empty"><strong>Nenhuma despesa registrada.</strong>Veja aqui a distribuição por categoria.</div>'}</div></section>`;
}
export function taskProgress(tasks) {
  const done = tasks.filter(task => task.done).length;
  const percent = tasks.length ? Math.round(done/tasks.length*100) : 0;
  return `<section class="task-progress"><div><span class="eyebrow">CADA PASSO CONTA</span><h2>Seu ritmo neste mês</h2><p>${done} de ${tasks.length} tarefa${tasks.length === 1 ? '' : 's'} concluída${tasks.length === 1 ? '' : 's'}</p></div><div class="progress-detail"><strong>${percent}<span>%</span></strong><progress value="${done}" max="${tasks.length || 1}" aria-label="Tarefas concluídas"></progress></div><img src="./assets/tasks.svg" alt="Ilustração de cartões de tarefas em verde neon"></section>`;
}
