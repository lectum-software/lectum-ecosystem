# ADR-0055: Agrupar especialidades por categoria no setup de perfil

## Status

Accepted

## Task relacionada

TASK-46

## Contexto

A edição de perfil do profissional exibia o campo de Especialidades de forma plana, com pouca legibilidade para a lista extensa de opções. A evolução recente solicitou uma organização por categorias com grupos de contexto clínico e demográfico.

## Decisão

Implementar a organização visual de "Especialidades" em categorias na tela de setup do perfil, com base na taxonomia enviada pelo produto.

Também será garantido, em migração, que as especialidades citadas nessas categorias existam no catálogo persistido (upsert por `slug`), sem impedir que o backend já tenha outras opções previamente existentes.

## Arquitetura/implementação

- No frontend, a lógica de montagem do dropdown de Especialidades passa a usar metadados de categoria (`SPECIALTY_CATEGORIES`) e renderizar seções com título.
- Continua reutilizando o mesmo contrato da API (`profile.data.catalogs.specialties`) e os mesmos limites por plano (`specialty_limit`).
- Itens que não estiverem mapeados nas categorias continuam exibidos em uma seção "Outras" para não romper compatibilidade com dados já existentes.
- No backend, nova migration (`20260611140000_add_specialty_catalog_options`) aplica `INSERT ... ON CONFLICT (slug) DO UPDATE` para inserir/normalizar os nomes das especialidades requeridas.

## Consequências

- Especialidades do perfil passam a ficar mais fáceis de localizar por público-alvo.
- A ordem dos itens segue o catálogo localmente ordenado por categoria, sem mudar contrato de dados nem comportamento de seleção.
- A base de dados recebe os itens de referência (se não existentes) preservando idempotência via upsert.

## Validação

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
