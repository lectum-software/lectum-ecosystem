# ADR-0300: Diagnostico de Engajamento em comunidades ativas no Admin

## Status

Accepted

## Task relacionada

TASK-57 e TASK-61

## Contexto

As abas **Estatisticas** dos detalhes administrativos de psicologos e pacientes ja exibiam o bloco **Comunidades ativas**, mas a leitura ainda dependia somente de contagens isoladas. O produto solicitou um indicador chamado **Diagnostico de Engajamento** com os rotulos **Muito ativo**, **Ativo**, **Pouco ativo** e **Sem base**.

Tambem foi solicitado separar votos em **Upvotes** e **Downvotes** para entender se a pessoa tem mais habito de incentivar conteudos da comunidade ou registrar sinal negativo. Para essa leitura, o voto considerado no bloco e a acao feita pela pessoa na comunidade, nao apenas o voto recebido em conteudo autorado por ela.

## Decisao

- O contrato real dos blocos **Comunidades ativas** foi expandido sem migration:
  - psicologos: `upvotes`, `downvotes`, `interactions` e `engagement_diagnosis`;
  - pacientes: `upvotes`, `downvotes` e `engagement_diagnosis`, preservando `votes` como total.
- Comunidades sem atividade real no periodo nao sao retornadas na relacao:
  - para psicologos, atividade e post, resposta, upvote ou downvote realizado;
  - para pacientes, atividade e post, comentario, upvote, downvote ou salvamento realizado.
- O diagnostico e derivado deterministicamente por comunidade a partir de interacoes reais do periodo, sem comparar o desempenho da pessoa em uma comunidade com outra:
  - menos de 3 interacoes: **Sem base**;
  - de 3 a 5 interacoes: **Pouco ativo**;
  - de 6 a 11 interacoes: **Ativo**;
  - 12+ interacoes: **Muito ativo**.
- A logica ficou em `backend/src/utils/admin-community-engagement-diagnosis.ts` para manter a mesma regra em psicologos e pacientes.
- A UI mostra a coluna **Diagnostico de Engajamento** e substitui/expande votos agregados por **Upvotes** e **Downvotes**.

## Consequencias

- Administradores conseguem avaliar intensidade e direcao de participacao sem abrir cada post.
- Comunidades apenas seguidas, mas sem atividade no periodo, deixam de poluir a lista.
- **Sem base** nao significa ausencia de atividade; significa amostra insuficiente para classificar com justica.
- Os limiares absolutos sao uma regra V1 e devem ser recalibrados quando houver volume real maior ou decisao de normalizar por baseline interno da propria comunidade.

## Validacao

- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Smoke HTTP local:
  - `GET http://localhost:3002/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas` retornou `200`;
  - `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou `200`.
- Validacao direta de service:
  - `showAdminPsychologistStatistics({ period: "all" })` retornou comunidades com `upvotes`, `downvotes`, `interactions` e `engagement_diagnosis`;
  - `showAdminPatient({ period: "all" })` retornou comunidades ativas de paciente real com votos separados e diagnostico, e pacientes sem atividade retornaram lista vazia.

## Pendencias

- Nenhuma dependencia externa.

## Ajuste visual 2026-07-21

- No detalhe administrativo do psicologo, a tabela **Comunidades ativas** deixou de exibir **Upvotes** e **Downvotes** como colunas para reduzir largura e ruido visual.
- A coluna **Diagnostico de Engajamento** foi renomeada para **Engajamento** apenas na UI; o contrato permanece `engagement_diagnosis`.
- O status **Seguindo**/**Nao seguindo** passou a aparecer junto ao nome da comunidade, e a ordem visual passou a ser **Comunidade**, **Ranking**, **Posts**, **Respostas**, **Cobertura** e **Engajamento**.
- A decisao nao remove os campos de votos do backend, pois eles seguem uteis para API, pacientes e leituras futuras.

## Ajuste visual paciente 2026-07-21

- No detalhe administrativo do paciente, a tabela **Comunidades ativas** deixou de exibir as colunas **Interacoes** e **Status** para reduzir ruido visual.
- O status de participacao passou a aparecer como **Seguindo**/**Nao seguindo** junto ao nome da comunidade, usando o booleano real `is_member`.
- A coluna **Diagnostico de Engajamento** foi renomeada para **Engajamento** apenas na UI; o contrato permanece `engagement_diagnosis`.
- A decisao nao remove `interactions` nem `is_member` do backend, pois seguem necessarios para ordenacao, compatibilidade e futuras leituras operacionais.

## Ajuste de regra 2026-07-27

- Pedido do usuario: cada comunidade deve ser analisada individualmente; o resultado de engajamento do psicologo em uma comunidade nao pode depender do engajamento em outra.
- A regra compartilhada removeu a dependencia de `maxInteractions` da pessoa no periodo. O diagnostico agora usa apenas o total real de interacoes daquela comunidade no recorte selecionado.
- As faixas passam a ser absolutas e independentes: **Sem base** para 0 a 2 interacoes, **Pouco ativo** para 3 a 5, **Ativo** para 6 a 11 e **Muito ativo** para 12 ou mais.
- A mudanca preserva o contrato `engagement_diagnosis`, os ids/labels existentes, as fontes first-party reais e a ordenacao por interacoes; nao ha endpoint paralelo, schema Prisma, migration, package novo, mock, seed ou backfill.
