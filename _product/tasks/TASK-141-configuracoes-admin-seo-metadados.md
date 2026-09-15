# TASK-141: Configurações Admin de SEO e Metadados

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-141 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Configurações / SEO |
| Status | Completed |
| Dependências | TASK-39, TASK-40, TASK-45, TASK-46, TASK-65 |
| ADR alvo | ADR-0438 |

## Contexto

O Admin já possui a tela `/configuracoes` para catálogos e filtros, validada pela TASK-65 e alinhada ao layout piloto exibido em `_product/proto/admin/Configurações.png` e na captura enviada pelo usuário em 2026-08-02. O pedido atual é reorganizar o menu lateral de Configurações com submenu **Filtros**, **SEO / Metadados** e **Assinatura**, e criar uma tela real para configurar metadados usados por mecanismos de busca.

A TASK-39/TASK-40 já definiu rotas públicas indexáveis fora de `/app`. As áreas privadas continuam noindex e não devem ser abertas para busca.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Neste ambiente não há ferramenta Builder/Quick Copy callable; a referência visual auditável usada é `_product/proto/admin/Configurações.png` e a captura enviada pelo usuário.

## Objetivo

Adicionar o submenu solicitado em **Configurações** e entregar a tela Admin **SEO / Metadados**, com formulário real para título, descrição, palavras-chave, Open Graph, URL canônica e robots index/follow, persistindo no backend e aplicando os metadados nas páginas públicas via renderização server-side do Next.

## Pré-requisitos e bloqueios

- TASK-39 e TASK-40 concluídas para SEO/rotas públicas.
- TASK-45/TASK-46 concluídas para autenticação e shell Admin.
- TASK-65 concluída para tela Configurações/Filtros.
- Usar React Hook Form, Zod e controllers do Admin para campos.
- Alterações Prisma exigem `pnpm --dir backend db:migrate`.
- Não instalar packages novos.
- Não usar mocks nem endpoints simulados.

## Escopo frontend/admin

- Alterar `admin/src/components/admin-shell/nav.ts` para Configurações ter submenu:
  - **Filtros** -> `/configuracoes`;
  - **SEO / Metadados** -> `/configuracoes/seo-metadados`;
  - **Assinatura** -> `/configuracoes/assinatura`.
- Criar rota `/configuracoes/seo-metadados` mobile-first.
- Criar formulário com RHF/Zod/controllers.
- Criar rota `/configuracoes/assinatura` reaproveitando a tela real de assinaturas, evitando item de menu quebrado.
- Consumir API real do backend via `admin/src/api/req/settings`, callers e query keys.

## Escopo backend

- Criar modelo Prisma `site_seo_setting`.
- Criar migration com defaults reais das páginas públicas existentes.
- Criar endpoint Admin privado:
  - `GET /api/admin/private/settings/seo`;
  - `PUT /api/admin/private/settings/seo/:page_key`.
- Criar endpoint público seguro:
  - `GET /api/public/seo/metadata`.
- Registrar auditoria em `admin_activity_log` quando houver alteração real.
- Atualizar traduções.

## Escopo frontend público

- Criar helper de metadata pública server-side.
- Aplicar metadados configuráveis nas páginas públicas principais:
  - `/`;
  - `/psychologists`;
  - `/psychologists/[id]`;
  - `/community`;
  - `/community/[slug]`;
  - `/community/[slug]/post/[id]`;
  - `/community/[slug]/post/[id]/thread/[replyId]`;
  - `/community/top-mentors`.

## Fora do escopo

- Upload de imagem Open Graph.
- Editor avançado de JSON-LD/schema.org.
- Criação de páginas legais.
- Mudanças em robots/sitemap além do uso dos metadados configuráveis.
- Permissões granulares por admin.

## Critérios de aceite

- [x] Menu lateral exibe submenu de Configurações com Filtros, SEO / Metadados e Assinatura.
- [x] `/configuracoes/seo-metadados` abre somente no shell Admin autenticado.
- [x] Tela de SEO / Metadados é mobile-first e alinhada ao layout visual da tela Configurações.
- [x] Formulário usa React Hook Form, Zod e controllers; campos ocupam largura total e mantêm slot de erro.
- [x] Metadados são lidos e salvos em API real, sem mock.
- [x] Alteração gera auditoria em `admin_activity_log` quando há mudança real.
- [x] Endpoint público seguro expõe metadados sem dados sensíveis.
- [x] Páginas públicas renderizam metadata server-side a partir da configuração, com fallback honesto quando a API estiver indisponível.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum package novo foi instalado.
- [x] `pnpm --dir backend db:migrate` foi executado por mudança Prisma/migration.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Browser local validou a tela Admin.
- [x] ADR criado/atualizado.
- [x] Commit criado e push executado.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `/configuracoes/seo-metadados`

## Execução

Concluída em 2026-08-03.

- Submenu de Configurações adicionado com **Filtros**, **SEO / Metadados** e **Assinatura**.
- Criada a tela Admin `/configuracoes/seo-metadados` com layout mobile-first inspirado em `_product/proto/admin/Configurações.png` e na captura enviada, usando React Hook Form, Zod e controllers locais.
- Criada a rota `/configuracoes/assinatura` reaproveitando a tela real de assinaturas, sem placeholder.
- Criado modelo Prisma `site_seo_setting`, migration e repositório com defaults reais por chave de página.
- Criados endpoints reais `GET/PUT /api/admin/private/settings/seo` e `GET /api/public/seo/metadata`.
- Aplicados metadados configuráveis server-side nas páginas públicas principais do Next, preservando fallback quando a API estiver indisponível.
- Criado o ADR-0438 para registrar a decisão arquitetural.

### Validações executadas

- `pnpm --dir backend db:migrate` — primeira execução falhou por BOM no SQL da migration; arquivo regravado sem BOM e reexecutado com sucesso.
- `pnpm --dir backend exec prisma generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local: Chrome headless em viewport 390px abriu `http://localhost:3002/configuracoes/seo-metadados`, renderizando o gate do shell Admin autenticado; `GET` da rota retornou `200`.
- Smoke API público: `GET http://localhost:3001/api/public/seo/metadata` retornou `200` com os metadados persistidos.
