# ADR-0217: Data de nascimento obrigatoria no perfil privado do psicologo

## Status

Accepted

## Task relacionada

TASK-18A

## Contexto

O usuario solicitou que a edicao do perfil profissional em `/app/professional/profile/setup` passe a coletar **Data de Nascimento** como campo obrigatorio dentro de `Informacoes basicas`.

O campo nao existia no `psychologist_profile` em `DATA-MODEL.md` nem no schema Prisma. Como ja existem perfis profissionais em producao/desenvolvimento, tornar a coluna `NOT NULL` imediatamente exigiria backfill com valor artificial ou reset de dados, o que violaria a regra de nao criar dados fake.

A referencia visual ativa continua sendo `_product/proto/Editar Perfil - Psicologo.jpg` e o print enviado pelo usuario. Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.

## Decisao

- Adicionar `psychologist_profile.birthdate DateTime?` ao modelo de dados e ao Prisma.
- Manter a coluna nullable no banco para compatibilidade com perfis legados ate a proxima edicao real.
- Tornar `birthdate` obrigatorio no contrato de atualizacao do perfil gratuito/profissional privado, com validacao no frontend e no backend.
- Persistir a data como `DateTime` normalizado a partir de `YYYY-MM-DD`, rejeitando datas invalidas, futuras ou anteriores a 1900.
- Expor `profile.birthdate` apenas no endpoint privado `/api/private/psychologist/free-profile`; nao publicar a data nas rotas publicas de descoberta/perfil.
- Renderizar o campo com a fundacao da TASK-02 (`calendar` controller dentro de `useFormList`) logo apos CPF em `Informacoes basicas`, mantendo a tela mobile-first.

## Consequencias

- Profissionais existentes continuam com `birthdate=null` no banco ate editarem o perfil, sem backfill artificial.
- Qualquer novo salvamento do perfil privado exige Data de Nascimento valida.
- A informacao fica disponivel para futuras regras de LGPD/idade/seguranca sem exposicao publica.
- A migration e aditiva e nao destrutiva.

## Validacao

- `pnpm --dir backend db:migrate` foi executado. A primeira tentativa falhou por BOM no SQL da migration; o arquivo foi regravado sem BOM e a execucao final concluiu com schema em sincronia.
- Demais checks/builds registrados na TASK-18A desta execucao.

## Pendencias

- Nenhuma pendencia externa.

## Ajuste complementar em 2026-08-10 - entrada digitavel PT-BR

O usuario reportou que, no celular, o campo ainda abria o seletor/calendario nativo. Para atender ao uso mobile-first, a UI do perfil do psicologo deixou de renderizar este campo como `input type="date"` no caso especifico da Data de Nascimento.

Decisao complementar:

- Manter o controller `calendar` da fundacao TASK-02 como ponto unico de campo de data, sem criar componente paralelo.
- Adicionar uma opcao `dateDisplayFormat="pt-BR"` no contrato do campo para renderizar `type="text"`, `inputMode="numeric"`, `maxLength=10` e placeholder `00/00/0000`.
- Preservar o comportamento nativo atual como padrao do controller para outros usos de calendario.
- Converter a entrada visual `DD/MM/AAAA` para payload `YYYY-MM-DD` antes de chamar a API real, mantendo a validacao contra datas invalidas, futuras ou anteriores a 1900.

Consequencias:

- O celular passa a abrir teclado numerico para Data de Nascimento, sem calendario nativo.
- O backend, o Prisma, as migrations, os contratos publicos, os dados persistidos, os packages e as envs nao foram alterados neste ajuste.
- O rollback e simples: remover `dateDisplayFormat="pt-BR"` do campo e voltar a enviar o valor nativo `YYYY-MM-DD`.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check:version`
- Smoke local do frontend 0.1.27: `/version` respondeu `200`; `/app/profissional/perfil/configurar` respondeu `307` sem sessao, preservando a protecao da rota privada.
