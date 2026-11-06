import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, collection, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

test('regras Firestore protegem os dados e validam as gravações', async t => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Execute com npm run test:firebase.');
  const env = await initializeTestEnvironment({ projectId: 'demo-vida-em-dia', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  t.after(() => env.cleanup());
  await env.clearFirestore();
  const owner = env.authenticatedContext('alice').firestore();
  const other = env.authenticatedContext('bob').firestore();
  const anonymous = env.unauthenticatedContext().firestore();
  const path = 'users/alice/entries/expense';
  const expense = { kind: 'expense', title: 'Mercado', date: '2026-11-06', amount: 24050, category: 'Alimentação', time: '', done: false };
  await t.test('visitantes não leem nem gravam', async () => {
    await assertFails(setDoc(doc(anonymous, path), expense));
    await assertFails(getDoc(doc(anonymous, path)));
  });
  await t.test('a conta proprietária cria e consulta o mês', async () => {
    await assertSucceeds(setDoc(doc(owner, path), expense));
    const result = await assertSucceeds(getDocs(query(collection(owner, 'users/alice/entries'), where('date', '>=', '2026-11-01'), where('date', '<', '2026-12-01'), orderBy('date'))));
    assert.equal(result.size, 1);
    assert.equal(result.docs[0].data().amount, 24050);
  });
  await t.test('outra conta não lê, grava, altera nem exclui', async () => {
    await assertFails(getDoc(doc(other, path)));
    await assertFails(getDocs(collection(other, 'users/alice/entries')));
    await assertFails(setDoc(doc(other, path), expense));
    await assertFails(updateDoc(doc(other, path), { amount: 1 }));
    await assertFails(deleteDoc(doc(other, path)));
  });
  await t.test('gravações adulteradas são rejeitadas', async () => {
    const invalid = [ { amount: -1 }, { amount: 1.5 }, { amount: 0 }, { amount: 100000000001 }, { kind: 'unknown' }, { date: '2026-13-99' }, { title: '' }, { title: '   ' }, { title: 'a'.repeat(121) }, { done: true }, { extra: 'invalid' } ];
    for (const change of invalid) await assertFails(setDoc(doc(owner, 'users/alice/entries/invalid'), { ...expense, ...change }));
  });
  await t.test('compromissos exigem horário válido e valor zero', async () => {
    const event = { ...expense, kind: 'event', amount: 0, category: '', time: '14:30' };
    await assertSucceeds(setDoc(doc(owner, 'users/alice/entries/event'), event));
    await assertFails(setDoc(doc(owner, 'users/alice/entries/event'), { ...event, time: '25:00' }));
    await assertFails(setDoc(doc(owner, 'users/alice/entries/event'), { ...event, amount: 1 }));
  });
  await t.test('somente a conclusão de tarefas pode ser atualizada', async () => {
    const task = doc(owner, 'users/alice/entries/task');
    await assertSucceeds(setDoc(task, { ...expense, kind: 'task', amount: 0, category: '' }));
    await assertSucceeds(updateDoc(task, { done: true }));
    await assertSucceeds(updateDoc(task, { done: false }));
    await assertFails(updateDoc(task, { title: 'Outra descrição' }));
    await assertFails(updateDoc(doc(owner, path), { done: true }));
  });
  await t.test('exclusão do próprio registro é permitida', async () => {
    await assertSucceeds(deleteDoc(doc(owner, path)));
    assert.equal((await getDoc(doc(owner, path))).exists(), false);
  });
});
