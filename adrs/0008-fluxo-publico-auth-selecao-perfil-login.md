# ADR-0008: Fluxo publico de auth, selecao de perfil e login

## Status

Accepted

## Task relacionada

TASK-04: Selecao de perfil e login.

## Contexto

A entrada publica do Lectum precisa permitir que um usuario nao-dev abra a aplicacao,
entenda se esta entrando como paciente ou psicologo, e faca login sem criar fluxo
paralelo de sessao. A arquitetura existente ja usa cookie de token, Redux Persist,
`useUserSet`, `proxy.ts`, React Query e os endpoints reais:

- `POST /api/public/auth/login`;
- `GET /api/public/google/login/:deviceId`;
- `GET /api/public/google/me`;
- `GET /api/private/auth/hidrate`.

O modelo de produto tambem exige `user.role` (`"paciente" | "psicologo"`) para orientar
a UX privada, mas a seguranca por papel continua sendo responsabilidade do servidor
conforme ADR-0002.

## Decisao

- A rota inicial publica passa a ser `/auth/profile-selection`.
- `/auth/profile-selection` mostra os dois perfis usando os prototipos exportados como
  referencia visual, mas sem aceitar codigo gerado automaticamente.
- `/auth/login` continua sendo o ponto unico de login por e-mail/senha e Google.
- `useUserSet` permanece o unico caminho de gravacao de usuario/token no frontend.
- `callbackUrl` continua tendo prioridade no pos-login; quando nao existir, o frontend
  resolve o destino pelo `user.role`.
- Enquanto a shell privada segmentada da TASK-12 nao existir, paciente e psicologo
  redirecionam para `/dashboard`; a ramificacao fica centralizada para evoluir sem
  recriar auth.
- `user.role` foi adicionado ao schema real com default `"paciente"` e indice
  `[role, deleted]`.
- O Google OAuth preserva `role` recebido no `state` apenas ao criar usuario novo.
  Para usuarios existentes, o papel salvo no banco e a fonte de verdade.

## Consequencias

- A tela publica nao depende de mock, seed ou endpoint simulado.
- Login comum e Google continuam usando os endpoints reais e o token por device.
- A UX ja fica preparada para separar destinos por papel quando a TASK-12 criar shells
  privadas distintas.
- A protecao de rotas por papel nao foi implementada aqui; ela permanece escopo da
  TASK-12 conforme ADR-0002.
- As futuras tasks de cadastro (`TASK-07` e `TASK-09`) devem reutilizar o `role` ja
  existente em `user` e nao adicionar outro campo ou endpoint paralelo.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local nas rotas `/auth/profile-selection` e `/auth/login`

## Atualizacao em 2026-06-05: seletor de conta no Google OAuth

### Contexto

Ao clicar em Google no login, cadastro de paciente ou cadastro de psicologo, o navegador
reaproveitava automaticamente a sessao Google ativa. Isso impedia o usuario de revisar
a conta ou escolher outro e-mail antes de concluir o OAuth.

### Decisao

- O endpoint real `GET /api/public/google/login/:deviceId` passa a enviar
  `prompt: "select_account"` para o Passport Google OAuth.
- A decisao fica no backend porque os tres fluxos publicos usam o mesmo endpoint:
  login, cadastro de paciente e cadastro de psicologo.
- O fluxo continua preservando `role`, `terms_accepted` e `terms_version` via `state`;
  nao foi criado endpoint, sessao ou autenticacao paralela.

### Consequencias

- O Google deve abrir o seletor/confirmacao de conta mesmo quando ja houver uma conta
  Google autenticada no navegador.
- O usuario pode trocar o e-mail antes de permitir o acesso ao perfil/e-mail Google.
- O comportamento e um pouco menos automatico para quem tem apenas uma conta ativa, mas
  evita cadastro/login acidental com e-mail errado.

## Atualizacao em 2026-06-05: captura de nome e foto no Google OAuth

### Contexto

Os fluxos de login/cadastro com Google precisam disponibilizar nome e foto de perfil do
usuario para uso posterior no produto, sem criar autenticacao paralela nem endpoint novo.

### Decisao

- O callback Google continua usando `GET /api/public/google/login/:deviceId` -> callback
  -> `/api/public/google/me`.
- Novos usuarios Google sao criados com `user.name` a partir de `profile.displayName` e
  `user.avatar` a partir de `profile.photos[0].value`.
- Usuarios existentes autenticados por Google recebem atualizacao controlada de
  identidade: `name` quando ausente ou quando o provider ja e Google, `avatar` quando
  ausente ou quando o provider ja e Google, e `provider="google"` para registrar o vinculo.
- O `role` salvo no banco continua sendo a fonte de verdade para usuarios existentes;
  o `state` de role segue valendo apenas para criacao de novo usuario.

### Consequencias

- Login, cadastro de paciente e cadastro de psicologo passam a compartilhar a mesma
  captura de nome/foto Google.
- Dados de perfil basicos ficam disponiveis para tasks futuras sem schema novo.
- A escolha de conta Google com `prompt="select_account"` permanece ativa.

### Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm check`
- Redirect OAuth local continua incluindo `prompt=select_account`; a persistencia de
  nome/foto foi validada por typecheck/build do callback real, sem mockar perfil Google.

## Atualizacao em 2026-06-16: fallback pós-login em `/app/psychologists`

### Contexto

Após os ajustes de comunidade, o fallback autenticado havia ficado em `/app/community`. O produto passou a exigir que o destino padrão de login volte a ser a descoberta de psicólogos, mantendo a comunidade apenas quando o usuário navegar manualmente ou quando um destino explícito for informado.

### Decisão

- O fallback padrão do fluxo de auth passa a ser `/app/psychologists`.
- `redirectTo` é tratado como parâmetro explícito prioritário de pós-login.
- `callbackUrl` permanece aceito como compatibilidade com o proxy que envia usuários desautenticados para login a partir de uma rota privada.
- O início de login Google copia `redirectTo`/`callbackUrl` para o estado OAuth já existente, permitindo que `/auth/redirect` respeite o destino após hidratar a sessão.
- O proxy redireciona usuários com token que tentarem abrir rotas públicas de auth diretamente para `/app/psychologists`.
- A rota `/app` também usa `/app/psychologists` como fallback para paciente e psicólogo; navegação manual para demais rotas não foi alterada.

### Consequências

- Login inicial, retorno de OAuth e retorno a `/auth/login` com sessão ativa ficam consistentes no mesmo destino padrão.
- Deep links continuam funcionando por `redirectTo` e por `callbackUrl` legado.
- Rotas manuais como `/app/community`, `/app/profile` e demais páginas privadas permanecem acessíveis quando o usuário navega até elas.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local: `/auth/login` e `/auth/redirect` com cookie `lectum.token` retornaram `307` para `/app/psychologists`.
- Browser local via Chrome/CDP: abrir `/auth/login` com cookie de sessão navegou para `/app/psychologists`.

## Atualizacao em 2026-06-17: escala visual unificada do fluxo de auth

### Contexto

O fluxo publico de autenticacao havia acumulado escalas diferentes entre login,
selecao de perfil, cadastro, recuperacao de senha, redefinicao e confirmacao de e-mail.
No login, a logo estava visualmente grande e, no desktop, a combinacao de logo, card,
espacamentos e footer podia deixar a tela com sensacao de excesso vertical em relacao ao
restante da plataforma.

### Decisao

- Centralizar a compactacao no `AuthTemplate` e no `AuthCard`, usando `min-h-dvh`, menor
  padding vertical e footer discreto, sem alterar contratos de auth.
- Reduzir a logo do login para `148px` no mobile e `156px` no desktop, aplicando escala
  semelhante aos demais fluxos publicos.
- Ajustar cadastro de paciente, cadastro de psicologo, recuperacao, redefinicao,
  confirmacao de e-mail, erro de auth e retorno Google com tipografia, icones e
  espacos mais proximos do restante da Lectum.
- Preservar a legibilidade dos campos e CTAs principais: a compactacao ficou concentrada
  em logo, areas de respiro, icones decorativos e footers.
- Nao criar package, store, endpoint, layout paralelo ou fluxo novo de autenticacao.

### Consequencias

- `/auth/login` cabe em viewport desktop `1366x768` sem scroll vertical, mantendo o card
  centralizado e a hierarquia premium.
- As telas publicas de auth passam a usar uma escala mais consistente entre si e com as
  areas privadas da plataforma.
- Formulario, React Hook Form/Zod, Google OAuth, recovery/reset reais, `useUserSet` e
  redirecionamentos existentes nao foram alterados.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/auth/login` desktop `1366x768` confirmou ausencia de
  scroll vertical e logo com `156px`.
- Browser local via Chrome/CDP em auth mobile `390x844` confirmou ausencia de overflow
  horizontal em login, selecao de perfil, recuperacao e redefinicao de senha.

## Atualizacao em 2026-06-28: logo completa nas telas com marca Lectum

### Contexto

O produto recebeu um novo asset oficial de marca para substituir a logo anterior nas
telas de cadastro e login. O arquivo original foi fornecido fora do workspace como
`Logo completa.png`, com simbolo e wordmark em proporcao horizontal mais larga.

### Decisao

- Substituir os assets `frontend/public/logo-light.png` e
  `frontend/public/logo-dark.png` pela logo completa fornecida, redimensionada para
  `1280x260` para manter nitidez sem carregar o arquivo bruto de 3840px.
- Manter o componente compartilhado `Logo` baseado em `next/image`, sem introduzir
  `<img>` ou componente paralelo.
- Ajustar as larguras de exibicao nas telas publicas de auth para preservar altura
  visual semelhante a escala anterior, ja que a nova logo tem proporcao mais larga.
- Reutilizar o mesmo componente `Logo` tambem nos pontos restantes de marca visual:
  sidebar desktop do `PrivateTemplate`, boas-vindas do paciente e rodape da tela de
  carregamento CFP.
- Usar o mesmo asset para claro e escuro enquanto nao houver variante cromatica separada
  aprovada para tema escuro.

### Consequencias

- Login, selecao de perfil, cadastro de paciente, cadastro de psicologo, recuperacao e
  retorno Google exibem a nova marca completa com layout mobile-first preservado.
- Telas privadas com sidebar desktop e telas auxiliares de onboarding deixam de renderizar
  marca manual por letra/texto e passam a herdar a logo oficial.
- Nao houve alteracao de fluxo, formulario, endpoint, sessao, pacote ou regra de dominio.

### Validacao

- `NODE_OPTIONS=--max-old-space-size=4096 pnpm --dir frontend check`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm --dir frontend build`
- Browser local em viewport mobile `390x844` nas rotas de login e cadastro.
- Chrome/CDP confirmou `/auth/login`, `/auth/register/patient` e
  `/auth/register/psychologist` com `innerWidth=390`, `docScrollWidth=390` e logo
  `200x41`.
- Chrome/CDP confirmou a sidebar desktop em `/app/psychologists` com logo oficial
  `156x32`, `innerWidth=1280` e `docScrollWidth=1280`.
- `/patient/welcome` e o estado de carregamento de `/psychologist/cfp` sao telas
  protegidas/condicionais; a troca nesses pontos foi validada por inspeção de componente,
  `check` e `build`, sem criar token ou sessao simulados.

## Atualizacao em 2026-06-29: escala premium da marca, icone recolhido e favicon

### Contexto

A logo completa oficial trouxe uma proporcao mais larga que a marca anterior. Em alguns
pontos ela passou a competir visualmente com o conteudo principal. Alem disso, quando a
sidebar desktop ficava recolhida, o wordmark era comprimido/cortado em vez de usar a
assinatura iconica da marca. O usuario tambem forneceu `Logo icon.svg` como asset
oficial para o favicon.

### Decisao

- Reduzir a escala da logo completa nas telas publicas de auth, onboarding auxiliar,
  erro 404 e sidebar expandida para uma presenca mais premium e menos dominante.
- Criar `LogoIcon` no mesmo componente compartilhado de marca, ainda usando
  `next/image`, sem introduzir `<img>` nem componente paralelo fora da fundacao atual.
- Usar `LogoIcon` apenas no estado recolhido da sidebar desktop, mantendo a logo
  completa na sidebar expandida.
- Salvar o asset oficial como `frontend/public/logo-icon.svg` e gerar dele o
  `frontend/src/app/favicon.ico` e `frontend/public/icon.png`, preservando fundo
  transparente e sem adicionar pacote novo.

### Consequencias

- A marca fica menor e mais alinhada ao layout mobile-first/premium das telas Lectum.
- A sidebar recolhida deixa de exibir wordmark cortado e passa a usar somente o simbolo.
- O favicon passa a refletir o icone oficial fornecido, sem alterar rotas, sessao,
  formularios, endpoints ou dependencias.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local/headless em `/auth/login` confirmou logo com `148px` no mobile e sem
  overflow horizontal.
- Browser local/headless em `/app/psychologists` confirmou sidebar recolhida com icone
  quadrado da marca, sem wordmark cortado.

## Atualizacao em 2026-06-29: logo no topo da selecao de perfil

### Contexto

Na tela `/auth/profile-selection`, a logo completa ainda ficava dentro do mesmo bloco
central do titulo e dos cards. Com a nova marca horizontal, isso deixava a assinatura
visual grande e proxima demais do texto, competindo com a pergunta "Qual o seu perfil?".

### Decisao

- Manter a selecao de perfil como tela sem card de auth, mas mover a logo para o topo da
  viewport, centralizada e menor (`126px` no mobile, `144px` em telas maiores).
- Criar uma extensao pequena no `AuthTemplate` (`contentClassName`) para permitir que a
  selecao de perfil use alinhamento de conteudo proprio, sem criar template paralelo e
  sem alterar o comportamento padrao de login/cadastro/recuperacao.
- Separar a marca do bloco decisorio e adicionar a microcopy "Escolha como deseja
  continuar" abaixo do titulo para reforcar o contexto da escolha.
- Preservar `Logo` baseado em `next/image`, os links reais de cadastro/login e a
  propagacao de `redirectTo`/`callbackUrl`.

### Consequencias

- A marca passa a assinar a tela no topo em vez de competir com o titulo.
- A mudanca fica restrita a `/auth/profile-selection`; demais telas de auth continuam
  usando o alinhamento central padrao do `AuthTemplate`.
- O novo prop do template e intencionalmente generico para pequenas variacoes de layout,
  evitando a criacao de um segundo shell publico.

### Validacao

- Referencia visual consultada: `_product/proto/Seleção de Perfil.jpg` e capturas
  atuais enviadas pelo usuario. Builder/Quick Copy nao apareceu como ferramenta
  disponivel nesta sessao, entao a validacao visual usou a imagem local.
- `pnpm --dir frontend exec biome check src/app/auth/profile-selection/logic.tsx src/templates/auth/index.tsx`
- `pnpm --dir frontend lint` (2 warnings preexistentes em `hooks/notification`)
- `pnpm --dir frontend typecheck`
- `pnpm --dir frontend build`
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou `innerWidth=390`,
  `docScrollWidth=390`, logo em `126x26` posicionada no topo (`y=41`) e cards com
  `360px` de largura sem overflow horizontal.

## Atualizacao em 2026-06-29: escala consistente da logo nas telas de auth

### Contexto

O ajuste anterior havia tratado primeiro a selecao de perfil, mas a decisao visual de
reduzir dominancia da marca precisava valer para todas as telas publicas que exibem logo:
login, cadastro de paciente, cadastro de psicologo, recuperacao de senha e retorno Google.

### Decisao

- Padronizar a logo em telas de auth com escala compacta:
  - `132px` mobile / `144px` desktop para telas centralizadas de login, recovery e
    retorno Google;
  - `136px` mobile / `148px` desktop para headers de cadastro dentro do card;
  - `126px` mobile / `144px` desktop para a selecao de perfil, por ficar no topo da
    viewport e nao dentro de um card.
- Aumentar o respiro logo -> titulo nas telas em que a logo e o titulo ficam no mesmo
  bloco, usando `mt-7` no titulo principal.
- No cadastro de psicologo, manter o badge "Para Psicologos", mas reduzir sua escala no
  mobile para que ele nao compacte a logo nem dispute hierarquia.
- Nao adicionar logo em telas que ja usam outro padrao visual intencional, como
  verificacao de e-mail e redefinicao de senha, para evitar mudanca de fluxo/altura sem
  necessidade.

### Consequencias

- Todas as telas publicas de auth que exibem a marca passam a ter assinatura visual mais
  leve e respiro consistente.
- O fluxo, formularios, OAuth, redirects e contracts existentes permanecem inalterados.

### Validacao

- `pnpm --dir frontend exec biome check src/app/auth/login/logic.tsx src/app/auth/register/patient/logic.tsx src/app/auth/register/psychologist/logic.tsx src/app/auth/recovery/logic.tsx src/app/auth/redirect/logic.tsx src/app/auth/profile-selection/logic.tsx src/templates/auth/index.tsx`
- `pnpm --dir frontend lint`
- `pnpm --dir frontend typecheck`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou
  `docScrollWidth=390` e logo compacta em `/auth/profile-selection`, `/auth/login`,
  `/auth/register/patient`, `/auth/register/psychologist` e `/auth/recovery`.

## Atualizacao em 2026-06-29: cadastro com e-mail expansivel

### Contexto

Nas telas de cadastro, o CTA Google e o CTA azul de criar conta por e-mail apareciam no
mesmo nivel visual. Isso criava conflito de prioridade: para cadastro com Google, o
botao azul final do formulario nao era necessario antes da escolha do metodo e aumentava
a altura inicial do card no mobile.

### Decisao

- Tratar Google como acao primaria imediata nas telas `/auth/register/patient` e
  `/auth/register/psychologist`, com texto "Criar conta com Google".
- Usar microcopy curta abaixo de "Cadastre-se" no cadastro de paciente:
  "Encontre psicologos e salve favoritos.".
- Encurtar a microcopy do cadastro profissional para uma frase direta:
  "Receba contatos de pessoas que procuram psicologos online.".
- Manter o cadastro por e-mail real, mas recolhido atras de um expansor acessivel com
  `aria-expanded`/`aria-controls`, exibindo os campos React Hook Form/Zod somente quando
  o usuario escolhe "Cadastrar com e-mail".
- Mover o aviso de aceite de termos do fluxo Google para perto do CTA Google, mas em
  versao compacta: "Ao continuar, voce aceita os Termos e a Privacidade."; o checkbox de
  termos segue dentro do formulario de e-mail.
- Renomear o CTA azul do formulario para "Criar conta com e-mail", reduzindo ambiguidade
  entre os dois metodos de cadastro.
- Implementar o expansor sem pacote novo, sem mock, sem endpoint paralelo e mantendo
  `next/image` para o icone Google.

### Consequencias

- A primeira dobra mobile fica mais limpa e deixa claro que Google cria a conta sem
  depender do formulario de e-mail.
- As duas telas preservam contexto de valor, mas com menos linhas de texto antes da
  escolha entre Google e e-mail.
- O formulario por e-mail continua disponivel e validado pela fundacao da TASK-02, mas
  deixa de competir visualmente com o CTA Google.
- O cadastro de psicologo acompanha o mesmo padrao do cadastro de paciente, preservando o
  texto profissional e o badge existente.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em viewport mobile `390x844` capturou e inspecionou
  `/auth/register/patient` e `/auth/register/psychologist` nos estados recolhido e
  expandido do formulario por e-mail.
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou a microcopy abaixo
  de "Cadastre-se" em `/auth/register/patient`, com `docScrollWidth=390`.
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou as microcopies
  compactas e o aviso legal curto em `/auth/register/patient` e
  `/auth/register/psychologist`, com `docScrollWidth=390`.

## Atualizacao em 2026-06-29: logo fora do card em login e cadastros

### Contexto

Mesmo apos reduzir escala e texto, login e cadastros ainda mantinham a marca dentro do
card. Isso deixava o card com topo mais pesado e desperdicava o fundo cinza, que podia
funcionar como area de assinatura visual da Lectum.

### Decisao

- Mover a logo completa para fora do card nas telas `/auth/login`,
  `/auth/register/patient` e `/auth/register/psychologist`, centralizada no fundo cinza.
- Remover os headers internos com borda dos cadastros, fazendo o card iniciar direto no
  conteudo da acao: titulo, microcopy e metodo de cadastro.
- Manter o login usando `AuthTemplate`/`AuthCard`, apenas envelopando o card com a logo
  externa para nao criar shell paralelo.
- Manter o selo "Para Psicologos" no cadastro profissional, mas dentro do card e proximo
  do titulo, evitando disputa com a marca.
- Preservar `Logo` com `next/image`, formularios reais, Google OAuth real, accordion de
  e-mail, redirects e contratos existentes.

### Consequencias

- A marca passa a assinar o fluxo no fundo cinza, sem competir com o conteudo do card.
- Os cards de login e cadastro ficam mais limpos e com menos divisorias internas.
- O cadastro profissional preserva sinalizacao de publico sem acoplar o selo ao logo.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou logo antes do card,
  sem overflow horizontal (`docScrollWidth=390`), nas rotas `/auth/login`,
  `/auth/register/patient` e `/auth/register/psychologist`.
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou os estados
  expandidos dos accordions de e-mail de paciente e psicologo, com formulario real
  presente e sem overflow horizontal.

## Atualizacao em 2026-06-29: rodape institucional sem selos de confiança

### Contexto

Apos mover a logo para fora do card, os selos abaixo dos cadastros ("Seguro e
Criptografado", "Configuracao em 2 minutos" e variacao de perfil protegido) ficaram
visualmente soltos, pequenos e com baixo contraste, adicionando ruido depois do card.

### Decisao

- Remover os selos de confianca abaixo dos cards em `/auth/register/patient` e
  `/auth/register/psychologist`.
- Manter apenas o rodape institucional "© 2026 Lectum. Todos os direitos reservados.",
  alinhando os cadastros ao padrao ja usado por `/auth/login` via `AuthTemplate`.
- Nao alterar formularios, OAuth, accordion, rotas, endpoints, packages ou contratos de
  autenticacao.

### Consequencias

- As telas de cadastro ficam mais limpas e premium, com menor ruido visual abaixo do
  card.
- O rodape institucional passa a ser consistente entre login e cadastros.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou copyright presente,
  selos ausentes e `docScrollWidth=390` em `/auth/login`, `/auth/register/patient` e
  `/auth/register/psychologist`.

## Atualizacao em 2026-06-29: rodape no fim da viewport e microcopy de paciente

### Contexto

O rodape institucional dos cadastros ja havia substituido os selos de confianca, mas ainda
ficava visualmente proximo do card em telas com pouca altura de conteudo. Alem disso, a
microcopy do cadastro de paciente precisava comunicar melhor as acoes que justificam a
conta: participar da comunidade e salvar psicologos favoritos.

### Decisao

- Aplicar `mt-auto` aos rodapes dos cadastros e reduzir o padding inferior dos shells de
  auth/cadastro para posicionar o copyright no fim visual da viewport quando houver
  espaco livre.
- Ajustar `AuthTemplate` para manter o rodape de login tambem mais proximo da base da
  tela, preservando o comportamento responsivo das demais telas que usam o template.
- Alterar a microcopy do cadastro de paciente para: "Publique gratuitamente na
  comunidade e salve seus psicologos favoritos.".
- Preservar formularios reais, Google OAuth, accordion de e-mail, `redirectTo`,
  `callbackUrl`, `next/image`, rotas e contratos existentes.

### Consequencias

- O copyright deixa de parecer parte do card e passa a funcionar como rodape de tela.
- A proposta de valor para paciente fica mais concreta, destacando publicacao gratuita na
  comunidade e favoritos.
- Quando o formulario de e-mail expande e a pagina precisa rolar, o rodape continua apos
  o conteudo, sem fixar sobre o formulario.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou footer na base da
  viewport (`footerBottom=840`) em `/auth/login`, `/auth/register/patient` e
  `/auth/register/psychologist`, sem overflow horizontal.
- Browser local via Chrome/CDP confirmou a microcopy nova em `/auth/register/patient` e
  os accordions expandidos dos cadastros com formulario real presente e sem overflow
  horizontal.

## Atualizacao em 2026-06-29: tag CRP ativo no cadastro profissional

### Contexto

A tag do cadastro profissional dizia apenas "Para Psicologos". O produto precisava
explicitar que o fluxo se destina a profissionais com registro profissional ativo,
alinhando a comunicacao ao requisito de validacao profissional.

### Decisao

- Alterar a tag azul do cadastro de psicologo para "Para psicologos com CRP ativo".
- Manter a tag dentro do card, acima do titulo, sem alterar formulario, OAuth, rotas,
  endpoints ou validacoes existentes.

### Consequencias

- O escopo do cadastro profissional fica mais claro antes da criacao de conta.
- A tag permanece compacta e sem quebrar no viewport mobile base.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local via Chrome/CDP em viewport mobile `390x844` confirmou a tag presente,
  largura de aproximadamente `164px`, `docScrollWidth=390` e rodape institucional
  presente em `/auth/register/psychologist`.
