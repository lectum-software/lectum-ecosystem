# ADR-0422: Agrupar especialidades por categorias clinicas no setup de perfil

## Status

Accepted

## Task relacionada

TASK-46

## Contexto

A edicao de perfil do profissional exibia o campo de Especialidades de forma plana, com pouca legibilidade para a lista extensa de opcoes. A evolucao recente solicitou uma organizacao por categorias com grupos de contexto clinico e demografico.

Em 2026-06-11, a taxonomia foi revisada novamente pelo produto para trocar a segmentacao anterior por 15 categorias clinicas/tematicas: Ansiedade e Transtornos Relacionados, Humor e Saude Mental, Relacionamentos, Autoestima e Desenvolvimento Pessoal, Trabalho e Carreira, Neurodivergencias, Infancia e Adolescencia, Sexualidade e Diversidade, Alimentacao e Corpo, Dependencias, Luto e Transicoes da Vida, Saude da Mulher e Maternidade, Saude e Doencas, Violencia e Direitos Humanos e Temas Gerais.

Em continuidade, foi solicitado reativar/ajustar itens dentro das categorias atuais para incluir:
- Separação dos pais
- Comportamento infantil
- Transição de gênero
- Aceitação familiar

## Decisao

Implementar a organizacao visual de "Especialidades" em categorias na tela de setup do perfil, com base na taxonomia enviada pelo produto.

Tambem sera garantido, em migracao, que as especialidades citadas nessas categorias existam no catalogo persistido (upsert por `slug`). A revisao de 2026-06-11 passa a curar o catalogo ativo para essa taxonomia: opcoes antigas que nao pertencem a lista enviada ficam inativas no catalogo, preservando linhas e relacionamentos existentes no banco.

## Arquitetura/implementacao

- No frontend, a logica de montagem do dropdown de Especialidades passa a usar metadados de categoria (`SPECIALTY_CATEGORIES`) e renderizar secoes com titulo.
- Continua reutilizando o mesmo contrato da API (`profile.data.catalogs.specialties`) e os mesmos limites por plano (`specialty_limit`).
- A secao "Outras" foi removida para que o dropdown do setup mostre somente as categorias e opcoes aprovadas na nova taxonomia.
- No backend, a migration inicial (`20260611140000_add_specialty_catalog_options`) permanece historica e a migration complementar (`20260611160000_update_specialty_taxonomy_categories`) aplica `INSERT ... ON CONFLICT (slug) DO UPDATE` para inserir/normalizar as especialidades da nova lista e inativar especialidades fora do catalogo ativo atual.
- A migration `20260611170000_reactivate_specialty_catalog_items_for_profile_filters` reativa e/ou atualiza os nomes destes itens em `specialties` (`separacao-dos-pais`, `comportamento-infantil`, `processo-de-transicao-de-genero`, `aceitacao-familiar`).

## Consequencias

- Especialidades do perfil passam a ficar mais facies de localizar por tema clinico.
- A ordem dos itens segue o catalogo localmente ordenado por categoria, sem mudar contrato de dados nem comportamento de selecao.
- A base de dados recebe os itens de referencia (se nao existentes) preservando idempotencia via upsert, ou os reativa com novo texto quando necessario.
- Perfis que ainda possuam relacoes com especialidades antigas mantem os registros no banco, mas essas especialidades deixam de aparecer como opcoes ativas enquanto nao forem reativadas por nova decisao de produto.

## Validacao

- `pnpm --dir backend db:migrate` — executado em 2026-06-11 e novamente nesta task; em ambiente atual o comando ainda encontra bloqueio conhecido de drift/checksum preexistente na migration `20260611140000_add_specialty_catalog_options`, sem reset destrutivo.
- `pnpm --dir backend exec prisma migrate deploy` — aplica as migrations pendentes, incluindo `20260611170000_reactivate_specialty_catalog_items_for_profile_filters`.
- `pnpm --dir backend exec prisma migrate status`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

Observacao operacional: se a base local for resetada, manter o alinhamento de checksum das migrations e reaplicar todas as migracoes antes de deploy.
