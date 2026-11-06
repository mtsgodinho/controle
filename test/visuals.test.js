import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDays, calendarPanel, weeklyTotals, financeChart, categoryPanel, taskProgress } from '../src/visuals.js';
const money = value => `${value / 100} reais`;
test('calendário respeita início da semana, tamanho do mês e ano bissexto', () => {
  const february = calendarDays(new Date(2028, 1, 1));
  assert.equal(february.length, 42);
  assert.equal(february.filter(Boolean).length, 29);
  assert.equal(february[0], null);
  assert.equal(february[1], '2028-02-01');
  assert.ok(february.includes('2028-02-29'));
  const november = calendarDays(new Date(2026, 10, 1));
  assert.equal(november[6], '2026-11-01');
  assert.equal(november.filter(Boolean).length, 30);
});
test('receitas e despesas são agrupadas nas semanas corretas sem contar tarefas', () => {
  const result = weeklyTotals([
    {kind:'income',date:'2026-11-01',amount:10000},
    {kind:'expense',date:'2026-11-07',amount:1000},
    {kind:'expense',date:'2026-11-08',amount:2000},
    {kind:'income',date:'2026-11-29',amount:3000},
    {kind:'task',date:'2026-11-15',amount:0}
  ]);
  assert.deepEqual(result, [{income:10000,expense:1000},{income:0,expense:2000},{income:0,expense:0},{income:0,expense:0},{income:3000,expense:0}]);
  assert.match(financeChart([],money),/primeira movimentação/);
  assert.doesNotMatch(financeChart([],money),/NaN|Infinity/);
});
test('calendário marca data selecionada e conta eventos do dia', () => {
  const html = calendarPanel(new Date(2026,10,1),[{date:'2026-11-06'},{date:'2026-11-06'}],'2026-11-06','2026-11-06');
  assert.match(html,/is-today is-selected/);
  assert.match(html,/06\/11\/2026 — 2 compromissos/);
  assert.match(html,/data-day="all"/);
});
test('categorias escapam texto e participação reflete os valores reais', () => {
  const html = categoryPanel([{kind:'expense',category:'<img onerror=bad>',amount:300},{kind:'expense',category:'Casa',amount:100},{kind:'income',category:'Salário',amount:100000}],money);
  assert.ok(html.includes('&lt;img onerror=bad&gt;'));
  assert.ok(html.includes('75% das despesas'));
  assert.ok(html.includes('25% das despesas'));
  assert.ok(!html.includes('Salário'));
});
test('progresso de tarefas usa os registros concluídos e lida com lista vazia', () => {
  assert.match(taskProgress([{done:true},{done:false},{done:false},{done:true}]),/50<span>%/);
  assert.match(taskProgress([]),/0<span>%/);
  assert.doesNotMatch(taskProgress([]),/NaN|Infinity/);
});
