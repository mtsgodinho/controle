# Vida em dia — Firebase

Finanças pessoais, agenda e tarefas em português, com interface para PC e celular. Login por Firebase Authentication e registros no Cloud Firestore, separados por conta. As alterações do mês selecionado são sincronizadas em tempo real entre dispositivos conectados.

## Preparar o Firebase gratuito

1. Acesse https://console.firebase.google.com e crie um projeto no plano **Spark**. O Google Analytics é opcional e pode ficar desativado. Não é necessário ativar faturamento para os recursos usados aqui, dentro das cotas gratuitas.
2. Em Configurações do projeto → Geral, adicione um aplicativo **Web** (ícone `</>`). Copie os campos do objeto `firebaseConfig` para `public/firebase-config.js`. Esses identificadores são públicos; não use chave privada nem conta de serviço.
3. Em Authentication → Método de login, habilite **E-mail/senha**. Em Configurações → Política de senha, configure mínimo de **10 caracteres**, conforme a interface. Revise os domínios autorizados e inclua o domínio publicado se necessário; adicione `localhost` apenas se quiser desenvolver localmente contra o projeto real.
4. Em Firestore Database, crie o banco **(default)** em modo de produção, escolhendo a região com cuidado (por exemplo, São Paulo, se disponível). Não selecione o modo de teste com acesso aberto. A região não pode ser alterada depois sem migração.
5. Publique as regras de `firestore.rules` junto com o site, pelo comando abaixo. Elas permitem leitura, criação e exclusão somente pelo dono dos registros. Atualizações ficam limitadas à conclusão de tarefas. Campos, tipos e limites são validados no banco.

Usamos **Firebase Hosting clássico**, não App Hosting nem Cloud Functions. O projeto não usa Storage, SMS ou outros recursos pagos. O plano gratuito tem cotas; se elas forem atingidas, o serviço pode ser limitado. Confira os limites atuais no console. Mantenha o plano Spark se não desejar habilitar cobranças.

## Instalação e desenvolvimento

Requer Node.js 24+. Os testes completos com Firestore também precisam de Java 21+.

```sh
npm ci
npm start
```

O servidor local usa a porta 3000. `PORT` e `HOST` podem ser definidos no processo. Ele serve apenas os arquivos compilados; Authentication e Firestore são acessados diretamente pelo SDK oficial. `npm run dev` recompila e inicia; reinicie esse comando após alterar o código. `dist/` é gerado e não deve ser editado.

Sem configuração Firebase preenchida, a página mostra um aviso e desativa o login; ela não usa credenciais inventadas ou dados fictícios. A configuração é incorporada ao JavaScript no build. Depois de alterá-la, compile novamente. O CSS e os scripts usam caminhos relativos; a prévia do HTML de `public/` também requer `npm run build`, que gera `public/app.js`.

## Testes

```sh
npm test
npm run test:auth
npm run test:firebase
```

- `npm test`: valida valores em centavos, dados de entrada e mensagens de erro.
- `npm run test:auth`: testa cadastro, login simultâneo em duas sessões e saída no emulador de Authentication.
- `npm run test:firebase`: inclui os testes de autenticação e das regras Firestore, com bloqueio de acesso cruzado, visitantes e gravações adulteradas.

Os testes com emuladores usam **demo-vida-em-dia**, nunca o projeto real. O Firestore Emulator é baixado pelo CLI oficial de `storage.googleapis.com`; mantenha a verificação de integridade e o TLS habilitados. É preciso permitir esse domínio na rede. Para guardar o emulador fora do checkout no ambiente de nuvem:

```sh
FIREBASE_EMULATORS_PATH=/workspace/.cache/firebase/emulators npm run test:firebase
```

Para testar a interface com dados descartáveis localmente:

```sh
npm run emulators
```

Esse comando compila com a configuração demo e inicia Authentication, Firestore e Hosting locais (portas 9099, 8085 e 5000). O build de emuladores funciona apenas em localhost/127.0.0.1. Recompile com `npm run build` ao terminar; nunca publique `build:emulator`.

## Publicar

No seu computador, com acesso à sua conta Google e depois de preencher `firebase-config.js`:

```sh
npm ci
npx firebase login
npm run deploy
```

O comando de deploy usa explicitamente o ID presente em `firebaseConfig.projectId`, verifica a configuração, recompila sem modo demo e publica apenas Hosting e regras Firestore. Não publique antes de revisar as regras e confirmar o projeto de destino. Não rode `firebase init` sobrescrevendo estes arquivos.

O CLI informará o endereço HTTPS quando a publicação terminar. Acesse esse mesmo endereço no PC e celular e crie uma conta. Somente uma publicação bem-sucedida confirma que o site está disponível; o build local não comprova isso.

## Estado desta adaptação e limites

A configuração pública do projeto `vida-em-dia-b344f` está preenchida. Ainda falta confirmar a ativação de Authentication e Firestore, publicar as regras e o site e validar a conexão com o projeto real. O banco SQLite da versão anterior, se existir em `data/`, foi preservado, mas contas e registros antigos não são migrados automaticamente para Firebase. Não envie o banco ao Git nem publique dados pessoais em Hosting.

Esta versão tem receitas/despesas por mês, categorias, saldo, compromissos, tarefas e exclusão. Ainda não tem edição (exclua e cadastre novamente), recorrência, notificações, integração bancária, recuperação de senha ou verificação de e-mail na interface. Os compromissos usam a data e o horário local informados, sem conversão de fuso.

O SDK mantém a sessão neste navegador até sair; saia em aparelhos compartilhados. O cache de registros fica em memória, sem persistência offline habilitada. O cadastro por e-mail fica aberto; não há lista de convidados. Para uso público mais amplo, avalie verificação de e-mail, App Check e monitoramento de uso. As regras de isolamento continuam necessárias mesmo com essas medidas.
