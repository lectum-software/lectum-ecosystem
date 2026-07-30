# TASK-101 - Label Video sem view na matriz Conversao x Visibilidade do Admin

## Status

Completed

## Contexto

A matriz **Conversao x Visibilidade** exibia a coluna **Sem Video** para a faixa `no_video`.
Apesar de tecnicamente representar ausencia de tempo assistido no video de apresentacao no periodo,
o termo podia sugerir que o psicologo nao possui video cadastrado. A nomenclatura precisa comunicar
que se trata de ausencia de view/audiencia no periodo selecionado.

## Escopo

- Trocar o label da categoria `no_video` de **Sem Video** para **Vídeo sem view**.
- Manter o identificador tecnico `no_video` e toda a regra de classificacao sem alteracao.
- Garantir que os donuts/matrizes que consomem o contrato real passem a exibir o novo label.

## Fora do escopo

- Alterar pesos, percentis, tracking, schema Prisma, migrations, API shape ou ranking publico.
- Criar novo package, mock, seed ou endpoint simulado.
- Alterar layout da matriz alem do texto exibido.

## Criterios de aceite

- [x] A coluna/fatia antes exibida como **Sem Video** passa a aparecer como **Vídeo sem view**.
- [x] A semantica permanece: 0 tempo assistido no video de apresentacao no periodo selecionado.
- [x] O id tecnico `no_video` permanece estavel para nao quebrar contratos e filtros internos.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] ADR relevante atualizado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Browser/API local validaram o novo label no dashboard Admin.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a referencia local do Admin e o screenshot enviado pelo
  usuario.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- API local autenticada em `/api/admin/private/psychologists/dashboard?period=all` validou a coluna
  `no_video` com label **Vídeo sem view**.
- Browser local em `/psicologos` validou o novo label **Vídeo sem view** na opcao **Conversao x Visibilidade**.

## Observacoes

- A mudanca e apenas de copy de dominio. O label novo evita confundir ausencia de audiencia no video
  com ausencia do arquivo de video no perfil.
- Nao houve alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` nao se aplica.

