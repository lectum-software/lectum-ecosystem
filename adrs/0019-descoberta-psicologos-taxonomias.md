# ADR-0019: Descoberta real de psicólogos com filtros por taxonomia

## Status

Accepted

## Task relacionada

TASK-13: Psicólogos: listagem e filtros.

## Contexto

A tela `/app/psychologists` é a entrada principal de descoberta para pacientes e deve consultar o backend real, sem cards hardcoded, mocks ou seeds artificiais. O `DATA-MODEL.md` define que a descoberta de psicólogos é leitura caller-neutra sob `/api/private/directory/*`, protegida apenas por `_auth`, enquanto `/api/private/psychologist/*` fica reservado para autogestão do psicólogo com `requireRole("psicologo")`.

As referências visuais consultadas foram as imagens locais:

- `_product/proto/Psicólogos.jpg`;
- `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg`.

Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; por isso a validação visual usou o fallback auditável das imagens exportadas.

## Decisão

- Criar `GET /api/private/directory/psychologists` como endpoint real de listagem paginada (`page`/`limit`, default 20 e máximo 50), busca e filtros.
- Montar a rota com apenas `_auth` dentro do próprio módulo, sem `requireRole`, preservando a separação definida na ADR-0002.
- Retornar somente psicólogos com `psychologist_profile.published = true`, `psychologist_profile.deleted = false`, `user.active = true` e `user.deleted = false`.
- Criar as tabelas de catálogo e joins previstas no `DATA-MODEL.md`:
  - `specialty`, `service`, `approach`;
  - `psychologist_specialty`, `psychologist_service`, `psychologist_approach`.
- Manter `psychologist_id` dos joins apontando para `user.id`, pois o perfil público usa o usuário como identificador canônico nas rotas `/app/psychologist/[id]`.
- Não criar seed de categorias nesta task. Sem dados reais persistidos, filtros e lista retornam vazios de forma honesta.
- Retornar `filters` junto da resposta paginada para que a tela use apenas o endpoint esperado da task e liste opções reais de catálogo, sem endpoint paralelo nem dados estáticos.
- Expor apenas campos public-safe: `user.id`, `user.name`, `user.avatar`, `headline`, `bio`, `crp`, `modality`, `languages`, `rating_avg`, `rating_count`, `verified` e taxonomias. `cpf`, `whatsapp`, e-mail e dados de conta não são retornados.
- Implementar a tela mobile-first em `/app/psychologists` dentro do `PrivateTemplate`, usando React Query, query keys dedicadas e a fundação da TASK-02 (`useFormList` + controllers) para busca e filtros avançados.

## Consequências

- A descoberta fica pronta para dados reais assim que perfis forem publicados por tasks futuras, sem precisar substituir mocks.
- A ausência atual de psicólogos publicados ou catálogos aparece como estado vazio, não como falha de produto.
- A resposta paginada ganha o campo adicional `filters`; clientes devem continuar usando `data/page/pages/count` para paginação e tratar `filters` como metadado de UI.
- A TASK-15 pode reutilizar o mesmo identificador público (`user.id`) para abrir `/app/psychologist/[id]`.
- A curadoria/seed real de especialidades, serviços e abordagens permanece fora desta task e deve ser decidida sem inventar categorias permanentes.

## Validação

- `pnpm --dir backend db:migrate --name add_directory_taxonomies`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke de API real: cadastro temporário de paciente via `POST /api/public/user/store`, chamada autenticada a `GET /api/private/directory/psychologists?page=1&limit=20&verified=true`, resposta `success=true`, paginação válida, filtros reais vazios e remoção do usuário temporário.
- Browser local headless em viewport mobile `390x844`: `/app/psychologists` renderizou com cookie real, sessão hidratada, título da tela, estado vazio/lista real, bottom nav e sem erro de sessão. Usuário temporário removido ao final.

## Pendências

- Curadoria ou ingestão real dos catálogos `specialty`, `service` e `approach`.
- Publicação/edição de perfis profissionais com taxonomias nas tasks de perfil do psicólogo.
- Detalhe do perfil público em `/app/psychologist/[id]` será implementado na TASK-15.
