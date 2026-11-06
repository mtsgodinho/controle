import { firebaseConfig } from '../public/firebase-config.js';
if (!['apiKey', 'authDomain', 'projectId', 'appId'].every(key => typeof firebaseConfig[key] === 'string' && firebaseConfig[key].trim())) {
  console.error('Preencha public/firebase-config.js com a configuração pública do seu aplicativo Web no Firebase antes de publicar.');
  process.exit(1);
}
if (firebaseConfig.projectId.startsWith('demo-')) {
  console.error('Projetos demo são exclusivos para testes e não podem ser publicados.');
  process.exit(1);
}
console.log('Configuração pública preenchida. Confirme que o projeto de destino do deploy é:', firebaseConfig.projectId);
