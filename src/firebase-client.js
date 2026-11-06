import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence, connectAuthEmulator, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseConfig } from '../public/firebase-config.js';

const emulator = typeof __EMULATOR__ !== 'undefined' && __EMULATOR__;
let auth, db;
export async function initializeClient() {
  const config = emulator ? { apiKey: 'demo-key', projectId: 'demo-vida-em-dia', authDomain: 'demo-vida-em-dia.firebaseapp.com', appId: 'demo-app' } : firebaseConfig;
  if (!['apiKey', 'projectId', 'authDomain', 'appId'].every(key => typeof config[key] === 'string' && config[key].trim())) throw new Error('Aplicativo em preparação. Falta conectar o projeto Firebase.');
  if (emulator && !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('O modo de teste só funciona neste computador.');
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8085);
  }
  await setPersistence(auth, browserLocalPersistence);
}
export const observeAccount = callback => onAuthStateChanged(auth, callback);
export const registerAccount = (email, password) => createUserWithEmailAndPassword(auth, email.trim(), password);
export const login = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const logout = () => signOut(auth);
function entriesCollection() {
  if (!auth?.currentUser) throw new Error('Entre na sua conta para continuar.');
  return collection(db, 'users', auth.currentUser.uid, 'entries');
}
export function observeEntries(month, next, error) {
  // Uma assinatura por mês evita reler todo o histórico financeiro.
  const year = Number(month.slice(0, 4)), index = Number(month.slice(5, 7));
  const end = index === 12 ? `${year + 1}-01-01` : `${year}-${String(index + 1).padStart(2, '0')}-01`;
  const selected = query(entriesCollection(), where('date', '>=', `${month}-01`), where('date', '<', end), orderBy('date'));
  return onSnapshot(selected, snapshot => next(snapshot.docs.map(item => ({ ...item.data(), id: item.id })).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id))), error);
}
export function entryData(input) {
  const finance = ['income', 'expense'].includes(input.kind);
  const date = input.date;
  if (!['income', 'expense', 'task', 'event'].includes(input.kind)) throw new Error('Tipo inválido.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 120) throw new Error('Informe uma descrição de até 120 caracteres.');
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Informe uma data válida.');
  if (finance && (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 100000000000)) throw new Error('Informe um valor positivo válido.');
  if (input.kind === 'event' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time || '')) throw new Error('Informe um horário válido.');
  return { kind: input.kind, title: input.title.trim(), date, amount: finance ? input.amount : 0, category: finance ? String(input.category || '').slice(0, 60) : '', time: input.kind === 'event' ? input.time : '', done: false };
}
export const addEntry = input => addDoc(entriesCollection(), entryData(input));
export const removeEntry = id => deleteDoc(doc(entriesCollection(), id));
export const completeTask = (id, done) => updateDoc(doc(entriesCollection(), id), { done });
export function friendlyError(error) {
  const messages = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já tem uma conta. Tente entrar.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/weak-password': 'Escolha uma senha mais forte, com pelo menos 10 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'auth/network-request-failed': 'Sem conexão. Confira sua internet e tente novamente.',
    'auth/operation-not-allowed': 'O cadastro por e-mail ainda não foi habilitado neste aplicativo.',
    'auth/unauthorized-domain': 'Este endereço ainda não foi autorizado para login.',
    'auth/invalid-api-key': 'A conexão com o Firebase precisa ser configurada.',
    'permission-denied': 'Não foi possível acessar os dados. Confira sua conta ou as regras do projeto.',
    'unavailable': 'O serviço está indisponível. Confira sua conexão e tente novamente.',
    'resource-exhausted': 'O limite de uso do serviço foi atingido. Tente novamente mais tarde.'
  };
  return messages[error.code] || (error.code ? 'Não foi possível concluir. Tente novamente.' : error.message);
}
