import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, inMemoryPersistence, setPersistence } from 'firebase/auth';

test('cadastro e acesso à mesma conta em duas sessões Firebase', async t => {
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Execute com npm run test:auth ou npm run test:firebase.');
  const apps = [];
  t.after(() => Promise.all(apps.map(deleteApp)));
  function client(name) {
    const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-vida-em-dia' }, name);
    apps.push(app);
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    return auth;
  }
  const pc = client('pc'), mobile = client('mobile');
  await Promise.all([setPersistence(pc, inMemoryPersistence), setPersistence(mobile, inMemoryPersistence)]);
  const email = `test-${Date.now()}@example.com`, password = 'temporary-test-12345';
  const created = await createUserWithEmailAndPassword(pc, email, password);
  await assert.rejects(signInWithEmailAndPassword(mobile, email, 'wrong-password'), error => ['auth/wrong-password', 'auth/invalid-credential'].includes(error.code));
  const loggedIn = await signInWithEmailAndPassword(mobile, email, password);
  assert.equal(loggedIn.user.uid, created.user.uid);
  await signOut(pc);
  assert.equal(pc.currentUser, null);
  assert.equal(mobile.currentUser.uid, created.user.uid);
});
