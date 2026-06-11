# ADR-0055: Agrupar especialidades por categorias clínicas no setup de perfil

## Status

Accepted

## Task relacionada

TASK-46

## Contexto

A edição de perfil do profissional exibia o campo de Especialidades de forma plana, com pouca legibilidade para a lista extensa de opções. A evolução recente solicitou uma organização por categorias com grupos de contexto clínico e demográfico.

Em 2026-06-11, a taxonomia foi revisada novamente pelo produto para trocar a segmentação anterior por 15 categorias clínicas/temáticas: Ansiedade e Transtornos Relacionados, Humor e Saúde Mental, Relacionamentos, Autoestima e Desenvolvimento Pessoal, Trabalho e Carreira, Neurodivergências, Infância e Adolescência, Sexualidade e Diversidade, Alimentação e Corpo, Dependências, Luto e Transições da Vida, Saúde da Mulher e Maternidade, Saúde e Doenças, Violência e Direitos Humanos e Temas Gerais.

## Decisão

Implementar a organização visual de "Especialidades" em categorias na tela de setup do perfil, com base na taxonomia enviada pelo produto.

Também será garantido, em migração, que as especialidades citadas nessas categorias existam no catálogo persistido (upsert por `slug`). A revisão de 2026-06-11 passa a curar o catálogo ativo para essa taxonomia: opções antigas que não pertencem à lista enviada ficam inativas no catálogo, preservando linhas e relacionamentos existentes no banco.

## Arquitetura/implementação

- No frontend, a lógica de montagem do dropdown de Especialidades passa a usar metadados de categoria (`SPECIALTY_CATEGORIES`) e renderizar seções com título.
- Continua reutilizando o mesmo contrato da API (`profile.data.catalogs.specialties`) e os mesmos limites por plano (`specialty_limit`).
- A seção "Outras" foi removida para que o dropdown do setup mostre somente as categorias e opções aprovadas na nova taxonomia.
- No backend, a migration inicial (`20260611140000_add_specialty_catalog_options`) permanece histórica e a migration complementar (`20260611160000_update_specialty_taxonomy_categories`) aplica `INSERT ... ON CONFLICT (slug) DO UPDATE` para inserir/normalizar as 87 especialidades da nova lista e inativar especialidades fora do catálogo ativo atual.

## Consequências

- Especialidades do perfil passam a ficar mais fáceis de localizar por tema clínico.
- A ordem dos itens segue o catálogo localmente ordenado por categoria, sem mudar contrato de dados nem comportamento de seleção.
- A base de dados recebe os itens de referência (se não existentes) preservando idempotência via upsert.
- Perfis que ainda possuírem relações com especialidades antigas mantêm os registros no banco, mas essas especialidades deixam de aparecer como opções ativas enquanto não forem reativadas por nova decisão de produto.

## Validação

- `pnpm --dir backend db:migrate` — executado em 2026-06-11; bloqueado por drift/checksum preexistente na migration `20260611140000_add_specialty_catalog_options`, sem reset destrutivo.
- `pnpm --dir backend exec prisma migrate deploy` — aplicou as migrations pendentes `20260611150000_rename_orientacao_vocacional_service_to_profissional` e `20260611160000_update_specialty_taxonomy_categories`.
- `pnpm --dir backend exec prisma migrate status`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Consulta direta ao catálogo confirmou 87 especialidades ativas e nomes com acentos corretos para amostras como "Síndrome do Pânico", "TEA (Autismo)", "Separação e Divórcio" e "Saúde Mental".
- HTTP local em `/app/professional/profile/setup` respondeu 307 sem sessão, mantendo a proteção da rota privada; validação visual autenticada fica limitada por não haver sessão real disponível ao agente sem criar mock.

Observação operacional de 2026-06-11: o ambiente local já apresentava drift/checksum na migration `20260611140000_add_specialty_catalog_options`; por isso, `pnpm --dir backend db:migrate` deve ser executado, mas não deve ser resolvido com reset sem aprovação explícita do usuário.
