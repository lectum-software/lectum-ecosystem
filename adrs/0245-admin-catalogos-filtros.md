# ADR-0245: Catalogos administrativos para filtros e perfil profissional

## Status

Aceita

## Contexto

A TASK-65 remove a dependencia de listas hardcoded do frontend para filtros de psicologos e formularios de perfil profissional. Especialidades precisam ser administradas por categorias persistidas, como `Ansiedade e Transtornos Relacionados` e `Humor e Saude Mental`, preservando a busca publica agrupada e evitando divergencia entre busca, setup profissional e Admin.

O modelo existente ja possuia `specialty`, `approach`, `service` e vinculos com psicologos. Idiomas e publico atendido, por outro lado, eram salvos em campos JSON do perfil profissional e nao tinham tabela de catalogo propria.

## Decisao

- Criar `specialty_category` e vincular cada `specialty` a exatamente uma categoria na V1.
- Adicionar `position` aos catalogos `specialty`, `approach` e `service` para suportar ordenacao administravel sem instalar pacote de drag-and-drop.
- Criar `profile_catalog_option` para opcoes administraveis de `language` e `target_audience`, mantendo os campos JSON existentes em `psychologist_profile` para nao quebrar perfis ja criados.
- Consumidores de catalogo devem receber itens ativos e ordenados pelo backend; itens inativos ficam ocultos para novas selecoes, mas vinculos historicos continuam preservados.
- O Admin de configuracoes usa endpoints privados reais para listar, criar, editar, ativar/inativar, reordenar e restaurar padroes.
- Restaurar padroes exige confirmacao forte `RESTAURAR PADROES`, e idempotente, reativa/atualiza padroes oficiais e nao apaga opcoes customizadas.
- O valor dos idiomas enviado ao perfil profissional permanece como nome de exibicao, pois perfis existentes usam JSON com valores como `Portugues`/`Ingles`. Publico atendido usa as opcoes persistidas do backend para novas selecoes.
- A UI de reordenacao usa botoes acessiveis de mover para cima/baixo em vez de um novo pacote de drag-and-drop.

## Consequencias

- A busca publica, o setup/edicao profissional e os filtros Admin passam a consumir a mesma fonte de verdade no backend.
- Alteracoes de catalogo feitas no Admin refletem imediatamente nas opcoes disponiveis para novas selecoes de usuarios finais.
- Itens inativos nao aparecem em dropdowns novos, mas dados historicos continuam rastreaveis e sem exclusao fisica.
- Categorias sem mapeamento legado sao tratadas por fallback honesto `Outras especialidades` somente durante migracao/compatibilidade.
- Como idiomas e publico atendido continuam em JSON no perfil, futuras regras fortes de integridade podem exigir uma task propria de normalizacao.

## Validacao

- `pnpm --dir backend exec prisma generate`
- `pnpm --dir backend exec prisma migrate status`
- `pnpm --dir backend exec prisma migrate deploy`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Admin `/configuracoes` e `/settings` validados em servidor local.
- Frontend `/psychologists` e `/app/professional/profile/setup` validados em servidor local de producao.

## Observacao operacional

`pnpm --dir backend db:migrate` foi acionado durante a task, mas o `prisma migrate dev` ficou preso no `schema-engine`/advisory lock do ambiente. Nao foi executado reset nem comando destrutivo. A migration foi confirmada como aplicada e sem pendencias por `prisma migrate status` e `prisma migrate deploy`.
