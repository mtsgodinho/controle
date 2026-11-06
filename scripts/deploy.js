import { spawnSync } from 'node:child_process';
import { firebaseConfig } from '../public/firebase-config.js';
const check = spawnSync(process.execPath, ['scripts/check-config.js'], { stdio: 'inherit' });
if (check.status !== 0) process.exit(check.status || 1);
if (process.argv.includes('--check')) process.exit(0);
// O destino é sempre o mesmo projeto incorporado ao aplicativo.
const result = spawnSync(process.execPath, ['node_modules/firebase-tools/lib/bin/firebase.js', 'deploy', '--project', firebaseConfig.projectId, '--only', 'hosting,firestore:rules'], { stdio: 'inherit' });
process.exit(result.status || (result.error ? 1 : 0));
