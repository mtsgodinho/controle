import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryData, friendlyError } from '../src/firebase-client.js';

test('valores financeiros são centavos inteiros e positivos', () => {
  const expense = entryData({ kind: 'expense', title: ' Mercado ', date: '2026-11-06', amount: 24050, category: 'Alimentação' });
  assert.equal(expense.amount, 24050);
  assert.equal(expense.title, 'Mercado');
  assert.equal(expense.done, false);
  for (const amount of [-1, 0, 1.5, Infinity, NaN, 100000000001]) assert.throws(() => entryData({ ...expense, amount }), /valor/);
});
test('datas e horários inválidos não são enviados ao banco', () => {
  const input = { kind: 'event', title: 'Consulta', date: '2026-11-06', time: '14:30' };
  assert.equal(entryData(input).time, '14:30');
  for (const date of ['2026-02-30', '2026-13-01', '', null]) assert.throws(() => entryData({ ...input, date }), /data/);
  for (const time of ['25:00', '09:61', '', undefined]) assert.throws(() => entryData({ ...input, time }), /horário/);
});
test('campos não financeiros são normalizados e descrições são limitadas', () => {
  assert.deepEqual(entryData({ kind: 'task', title: 'Estudar', date: '2026-11-06', amount: 999, time: '09:00', category: 'Lazer' }), { kind: 'task', title: 'Estudar', date: '2026-11-06', amount: 0, time: '', category: '', done: false });
  for (const title of ['', '   ', 'a'.repeat(121)]) assert.throws(() => entryData({ kind: 'task', title, date: '2026-11-06' }), /descrição/);
  assert.throws(() => entryData({ kind: 'invalid' }), /Tipo/);
});
test('erros comuns do Firebase são apresentados em português sem detalhes internos', () => {
  assert.equal(friendlyError({ code: 'auth/invalid-credential' }), 'E-mail ou senha incorretos.');
  assert.match(friendlyError({ code: 'permission-denied' }), /regras/);
  assert.equal(friendlyError({ code: 'internal', message: 'internal details' }), 'Não foi possível concluir. Tente novamente.');
});
