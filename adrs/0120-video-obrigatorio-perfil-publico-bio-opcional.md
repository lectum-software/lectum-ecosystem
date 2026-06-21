# ADR-0120: Video obrigatorio para perfil publico e Bio opcional

## Status

Accepted

## Task relacionada

TASK-18A

## Contexto

O setup profissional usa `headline` como campo visual `Bio` e `bio` como `Apresentacao de texto`. A regra anterior tratava os dois campos como obrigatorios para publicar o perfil, enquanto o video de apresentacao era exigido apenas para elegibilidade na listagem principal de psicologos.

Na validacao de produto em 2026-06-18, foi decidido que a presenca publica do psicologo deve depender do video de apresentacao, pois o feed/listagem e o perfil publico da Lectum valorizam prova de presenca e confianca visual. Ao mesmo tempo, a Bio curta e o texto de apresentacao nao devem bloquear publicacao: eles sao enriquecimento editorial, nao prerequisito estrutural. O idioma `Portugues`, ja selecionado por padrao no formulario, deve continuar satisfazendo a exigencia de idioma quando o usuario salvar.

## Decisao

- Tornar `psychologist_profile.video_url` obrigatorio para publicar/exibir publicamente o perfil profissional.
- Remover `headline` e `bio` da lista de campos obrigatorios para publicacao, mantendo validacao de tamanho minimo apenas quando esses campos forem preenchidos.
- Manter `languages.length > 0` como regra de backend, mas preservar `Portugues` como default real do formulario para que o valor seja enviado sem acao manual do psicologo.
- Aplicar a regra de video nas rotas que dependem de perfil publicado: detalhe publico, contato, elegibilidade de avaliacao por paciente, favoritos, seguindo e Top Mentor.
- Atualizar a tela `/app/professional/profile/setup` para marcar o bloco `Video de Apresentacao` como obrigatorio, retirar o indicador obrigatorio de Bio/Apresentacao de texto e impedir tentativa local de publicacao sem video.

## Consequencias

- Perfis publicados sem video deixam de ser exibidos nas superficies publicas/relacionais ate que o psicologo envie um video de apresentacao.
- Psicologos podem publicar sem preencher Bio curta ou Apresentacao de texto, reduzindo friccao e alinhando a nomenclatura visual do formulario com a regra de dominio.
- A API continua sendo a fonte autoritativa da publicacao; o frontend apenas antecipa a validacao para melhorar a UX.
- Nao houve alteracao de schema Prisma, migrations, storage, endpoints de upload, packages ou formato de resposta.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- API local real em `http://localhost:3001` com psicologos temporarios removidos ao final:
  - publicacao sem video retornou `400`;
  - publicacao com video retornou `200` e manteve `headline=null`/`bio=null`;
  - detalhe publico do perfil com video retornou `200`;
  - perfil forçado como publicado sem video retornou `404` no detalhe publico.
- Browser local via Chrome/CDP em `/app/professional/profile/setup`, com usuario psicologo temporario removido ao final:
  - mobile 390x844 e desktop 1024x768 sem overflow horizontal;
  - `Bio` e `Apresentacao de texto` sem indicador obrigatorio;
  - `Video de Apresentacao` com indicador obrigatorio e texto explicando que o video e necessario para publicar o perfil.


## Atualizacao 2026-06-20 - validacao interna do CPF no detalhe publico

### Contexto

O detalhe publico do perfil (`GET /api/private/directory/psychologists/:id`) reutiliza a mesma regra de publicacao da listagem. Essa regra exige CPF preenchido para considerar o perfil publicado, mas o `select` interno do detalhe nao carregava `cpf`. Como a validacao recebia `cpf` ausente, perfis validos na listagem retornavam `404` no detalhe.

### Decisao

- Carregar `psychologist_profile.cpf` apenas no `select` interno usado pela validacao de publicacao do detalhe.
- Manter o CPF fora do DTO retornado ao frontend, preservando a decisao de nao expor dado sensivel em perfil publico.

### Consequencias

- A listagem e o detalhe voltam a usar a mesma regra efetiva de publicacao.
- Perfis publicados com requisitos completos deixam de aparecer como invalidos ao abrir a pagina individual.
- Nao ha alteracao de schema, migration, endpoint, formato publico de resposta ou exposicao de CPF.

### Validacao

- Smoke local via repository confirmou `hasPublishedProfile=true`, detalhe existente e ausencia de `cpf` na resposta.
- Smoke HTTP local `GET http://localhost:3001/api/private/directory/psychologists/demo-psychologist-marcelo-pires` retornou `200` sem campo `cpf`.

## Atualizacao 2026-06-20 - campos sensiveis opcionais no formulario

### Contexto

Raça/cor e religiao ja nao fazem parte dos requisitos de publicacao do backend nem da lista de pendencias do perfil, mas o `SelectController` normaliza a opcao vazia de selects para `null`. O schema local do editor aceitava apenas `string` para esses dois campos, gerando `Invalid input` e bloqueando o salvamento antes da chamada de API.

### Decisao

- Tipar `race_color` e `religion` no formulario como `string | null`.
- Aceitar `null` no schema local desses campos, mantendo apenas o limite maximo quando houver valor preenchido.
- Preservar o envio como `null` para o backend quando o psicologo nao quiser informar dados sensiveis.

### Consequencias

- O psicologo consegue salvar e publicar o perfil sem preencher raça/cor ou religiao.
- Os campos continuam disponiveis para preenchimento opcional e continuam sujeitos a validacao de tamanho quando informados.
- Nao houve alteracao de schema Prisma, migration, endpoint, DTO ou regra de exibicao publica.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local `GET http://localhost:3000/app/professional/profile/setup` retornou `200`.
