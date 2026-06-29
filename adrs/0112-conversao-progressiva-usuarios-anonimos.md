# ADR 0112 - Conversao progressiva para usuarios anonimos

Data: 2026-06-17

Status: Aprovado

## Contexto

A Lectum precisa aumentar cadastro sem bloquear a descoberta inicial. O visitante deve poder explorar
psicologos, comunidades e posts antes de receber a solicitacao de criar conta. Ao mesmo tempo, a
plataforma precisa capturar sinais reais de interesse e preservar a acao original quando o usuario decide
se cadastrar.

Antes deste ajuste, parte das rotas internas e leituras de comunidade/post dependia de autenticacao dura,
o que impedia uma experiencia publica fluida e tornava impossivel aplicar gatilhos progressivos antes do
login.

## Decisao

- Adotar um provider global de conversao progressiva no frontend, montado no root layout dentro dos
  providers existentes de Redux/Query.
- Usar `sessionStorage` como persistencia de frequencia por sessao anonima:
  - `modal_exibida_na_sessao` evita repeticao da modal na mesma sessao;
  - contadores por sessao registram tempo acumulado, perfis visitados, posts abertos e cliques em WhatsApp;
  - `lectum.conversion.pending_intent` preserva a acao forte quando a modal foi efetivamente exibida.
- Registrar analytics client-side em `lectum.conversion.analytics` e emitir o evento
  `lectum:conversion-analytics` com os triggers definidos pelo produto. Isso deixa o fluxo pronto para
  envio futuro a um coletor persistente sem criar schema prematuro.
- Tornar publicas, com autenticacao opcional, as leituras necessarias de comunidade e posts:
  - `GET /api/private/community`, feed, detalhe e posts de comunidade;
  - `GET /api/private/posts/:id`, replies e thread.
- Manter todas as mutacoes protegidas por `privateAuth` no nivel da rota, mesmo com o mount opcional:
  criar post, seguir comunidade, votar, salvar, comentar, reportar, deletar e upload continuam exigindo usuario.
- Persistir intencoes fortes somente quando a modal e mostrada pela primeira vez na sessao. Se a modal ja foi
  dispensada, novos cliques nao criam replay invisivel.
- Reexecutar apos login, quando aplicavel:
  - favoritar psicologo;
  - salvar post;
  - salvar comentario/resposta;
  - focar composer de comentario/resposta;
  - abrir WhatsApp do segundo clique anonimo.
- Preservar `redirectTo`/`callbackUrl` nos links de selecao de perfil, login e cadastro para retornar ao
  contexto original.

## Atualizacao em 2026-06-29 - rotas com CTA proprio de autenticacao

As rotas publicas `/app/profile`, `/app/favorites` e `/app/notifications` passam a suprimir a modal de
conversao progressiva. Essas telas ja apresentam o convite contextual para criar conta ou fazer login no
proprio conteudo, entao repetir a modal global cria redundancia e aumenta friccao.

O tempo de navegacao nessas rotas tambem nao conta para o gatilho passivo de 90 segundos, evitando que o
visitante seja abordado imediatamente ao sair de uma tela que ja oferecia CTA de autenticacao.

## Atualizacao em 2026-06-29 - tentativa anonima de favoritar psicologo

Ao tentar favoritar um psicologo sem autenticacao, a modal de conversao passa a usar copy contextual:
informa que e necessario criar uma conta gratuita ou fazer login para salvar o profissional nos favoritos e
voltar ao perfil depois. Essa tentativa explicita de acao tambem pode abrir a modal mesmo que um gatilho
passivo ja tenha sido exibido na sessao, para evitar que o clique no favorito falhe sem feedback.

## Atualizacao em 2026-06-29 - seguir comunidade e criar post sem autenticacao

As tentativas anonimas de seguir uma comunidade e criar novo post passam a usar a mesma modal de conversao
com copy contextual. Seguir comunidade deixa de chamar a mutacao privada sem sessao e passa a orientar o
visitante a criar uma conta gratuita ou fazer login; quando o login retorna para a mesma comunidade, a
intencao pendente pode reexecutar o follow real. Criar post tambem bypassa o limite da modal por sessao por
ser uma acao explicita, mantendo o `returnTo` para a tela de publicacao.

## Atualizacao em 2026-06-29 - acoes de post e voto sem autenticacao

As tentativas anonimas de comentar, responder, salvar post, salvar resposta, upvote e downvote passam a
usar a modal de conversao com copy contextual e botao de login. Comentarios e salvamentos continuam podendo
preservar a intencao para reexecucao apos login quando o alvo ainda estiver disponivel.

Upvote e downvote permanecem autenticados. Embora seja tecnicamente possivel aceitar voto anonimo, isso
exigiria uma nova decisao de produto e seguranca para identidade de visitante, prevencao de duplicidade,
rate limit e mitigacao de abuso. Como o voto altera ranking, contadores e confiabilidade da comunidade, a
arquitetura atual mantem `POST /api/private/posts/:id/vote` protegido por `privateAuth`; o frontend apenas
troca a falha silenciosa por orientacao de cadastro/login.

## Consequencias

- Visitantes conseguem descobrir conteudo sem cadastro imediato.
- A modal aparece apenas apos interesse real: tempo, profundidade de scroll, visitas a perfis, posts,
  permanencia em comunidade ou intencao forte.
- O backend passa a diferenciar claramente leitura anonima opcional de mutacoes privadas, reduzindo risco de
  permissao acidental.
- O estado salvo/voto/associacao retorna neutro para anonimos, sem mockar usuario.
- A decisao evita criar tabela de analytics antes de existir pipeline de coleta; a camada de eventos no
  navegador preserva extensibilidade.
- Nao houve novo package nem alteracao de Prisma/migrations.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- API local sem cookie:
  - `GET /api/private/community?page=1&limit=1` retornou 200;
  - `GET /api/private/community/:slug/posts?page=1&limit=1` retornou 200;
  - `GET /api/private/posts/:id` retornou 200 com `saved=false`;
  - `GET /api/private/posts/:id/replies` retornou 200.
- Browser local headless em Chrome, viewport `390x844`:
  - `/app/psychologists` nao exibiu modal nos primeiros segundos;
  - com `--virtual-time-budget=95000`, a modal `Crie sua conta gratuita` foi exibida apos o gatilho de tempo.
