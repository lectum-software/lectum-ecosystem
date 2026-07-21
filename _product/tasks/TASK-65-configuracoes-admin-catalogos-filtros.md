# TASK-65: Configurações administrativas de catálogos e filtros

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-65 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Configurações |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-13, TASK-18A |
| ADR alvo | ADR sobre catálogos administráveis, especialidades por categoria e restauração de padrões |

## Contexto

A tela **Configurações** do Admin usa como referência `_product/proto/admin/Configurações.png`.

Esta tela não é uma configuração genérica da conta Admin. Ela gerencia as opções de filtros disponíveis na busca de psicólogos e nos formulários de perfil profissional.

Catálogos existentes no backend:

- `specialty`;
- `approach`;
- `service`;
- vínculos `psychologist_specialty`, `psychologist_approach`, `psychologist_service`.

Ponto central definido em conversa: **especialidades são segmentadas por categorias**, não uma lista plana. As categorias são agrupamentos como:

- `Ansiedade e Transtornos Relacionados`;
- `Humor e Saúde Mental`;
- demais categorias clínicas/temáticas já usadas no dropdown público de especialidades.

Atualmente, a segmentação das especialidades aparece hardcoded no frontend em:

- `frontend/src/app/app/psychologists/filter-options.ts`;
- `frontend/src/app/app/professional/profile/setup/logic.tsx`.

A task deve migrar essa segmentação para uma fonte administrável, sem criar inconsistência entre busca pública e cadastro/edição profissional.

## Objetivo

Criar a tela Admin de configurações de catálogos/filtros, permitindo gerenciar especialidades por categoria, abordagens, serviços, idiomas e público atendido, com persistência real, reordenação, ativação/inativação e restauração segura de padrões.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-13 concluída: busca/filtros de psicólogos.
- TASK-18A concluída: perfil profissional gratuito sem CRP e catálogos usados no setup.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Configurações.png` como referência visual local.
- Validar o schema atual antes de criar tabelas novas.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar `pnpm --dir backend db:migrate`.

## Escopo frontend

- Criar rota protegida:
  - `/settings` ou rota equivalente definida no Admin.
- Renderizar seções conforme referência:
  - Especialidades;
  - Abordagens;
  - Serviços;
  - Idiomas;
  - Público.
- Especialidades:
  - exibir e gerenciar categorias;
  - exibir e gerenciar itens dentro de cada categoria;
  - permitir adicionar/editar/inativar categoria;
  - permitir adicionar/editar/inativar especialidade dentro da categoria;
  - permitir reordenar categorias;
  - permitir reordenar itens dentro da categoria.
- Demais catálogos:
  - adicionar item;
  - editar nome;
  - inativar/reativar item;
  - reordenar opções.
- Categorias/seções:
  - permitir ativar/desativar categoria inteira quando fizer sentido;
  - se a categoria inteira for inativada, seus itens não devem aparecer para usuários finais.
- Botão **Restaurar padrões**:
  - abrir modal de confirmação forte;
  - explicar que altera filtros da busca e do perfil;
  - não executar ação destrutiva silenciosa.
- Reordenação:
  - suportar drag visual se já houver padrão/pacote permitido;
  - caso contrário, usar botões acessíveis "mover para cima/baixo" sem instalar pacote novo.

## Escopo backend

- Criar endpoints admin privados para gerenciar catálogos:
  - `GET /api/admin/private/settings/catalogs`;
  - `POST /api/admin/private/settings/catalogs/specialty-categories`;
  - `PUT /api/admin/private/settings/catalogs/specialty-categories/:id`;
  - `POST /api/admin/private/settings/catalogs/specialties`;
  - `PUT /api/admin/private/settings/catalogs/specialties/:id`;
  - endpoints equivalentes para `approaches`, `services`, `languages` e `target-audiences`;
  - endpoint de reordenação por tipo/categoria;
  - endpoint de restauração de padrões com confirmação.
- Atualizar endpoints públicos/privados de catálogo usados por:
  - busca de psicólogos;
  - setup/edição de perfil profissional;
  - Admin de psicólogos;
  - filtros do Admin.
- Garantir que o dropdown público de especialidade continue agrupado por categoria.
- Garantir que catálogos inativos não apareçam para usuários finais, mas continuem preservados para vínculos históricos.

## Fora do escopo

- Configurações de conta do Admin.
- Gestão de permissões/roles administrativas além da autenticação Admin.
- Feature flags globais.
- Configurações financeiras.
- Configurações de notificações.
- Excluir fisicamente item usado por psicólogos.
- Reset destrutivo de dados.
- Instalar pacote de drag-and-drop sem validar `PACKAGES.md` e ADR.

## Contrato técnico detalhado

Modelagem esperada:

- Reaproveitar `specialty`, `approach` e `service`.
- Adicionar estrutura de categoria para especialidades, por exemplo:
  - `specialty_category`;
  - `specialty.category_id`;
  - `position`/`sort_order`;
  - `active`;
  - `deleted`/`deletedAt` conforme padrão do projeto.
- Adicionar ordenação aos catálogos existentes se ainda não houver:
  - `specialty.position`;
  - `approach.position`;
  - `service.position`.
- Para idiomas e público atendido:
  - verificar o estado atual antes de criar estrutura;
  - hoje `psychologist_profile.languages` e `psychologist_profile.target_audience` são JSON;
  - se não existir catálogo próprio, criar configuração administrável de opções permitidas e documentar em ADR;
  - não quebrar perfis existentes que já possuem valores em JSON.

Regras de especialidades por categoria:

- Categorias são entidades administráveis.
- Itens de especialidade pertencem a exatamente uma categoria ativa por vez na V1.
- A busca pública deve receber especialidades já agrupadas pela categoria persistida.
- Remover os arrays hardcoded `SPECIALTY_CATEGORIES` do fluxo público/profissional quando a API real estiver pronta.
- Se houver especialidades sem categoria após migração, agrupá-las em `Outras especialidades` somente como fallback honesto.

Regras de exclusão/inativação:

- Se um item estiver vinculado a algum psicólogo:
  - não excluir fisicamente;
  - permitir inativar para ocultar em novos filtros/cadastros;
  - manter exibição histórica nos perfis que já usam o item quando necessário.
- Se um item não estiver vinculado:
  - ainda preferir soft delete para manter rastreabilidade.
- Inativar categoria:
  - oculta a categoria e seus itens para usuários finais;
  - não remove vínculos existentes.

Restauração de padrões:

- Deve restaurar os catálogos base da Lectum:
  - categorias de especialidades;
  - especialidades dentro das categorias;
  - abordagens;
  - serviços;
  - idiomas;
  - público atendido.
- Deve ser idempotente:
  - reativar padrões ausentes/inativos;
  - atualizar nomes/ordem oficiais;
  - não apagar opções customizadas sem decisão explícita.
- Deve exigir confirmação no Admin.
- Deve registrar o admin responsável se a fundação Admin tiver auditoria.

Endpoints públicos/privados de consumo:

- A resposta de catálogos para busca/perfil deve incluir:
  - especialidades agrupadas por categoria;
  - `id`, `slug`, `name`, `position`, `active`;
  - categorias com `id`, `slug`, `name`, `position`, `active`;
  - abordagens/serviços/idiomas/públicos ordenados.
- Usuários finais não devem receber itens inativos para seleção nova.

Frontend esperado:

- Reutilizar shell Admin e tokens existentes.
- Usar React Hook Form, Zod e controllers da TASK-02 nos formulários de adicionar/editar.
- Mobile-first:
  - seções empilhadas;
  - ações acessíveis por item;
  - reordenação funcional sem depender só de drag em touch.
- Não usar `<img>` cru.
- Nenhum mock: listas devem vir da API real.

## Critérios de aceite

- [x] Rota Configurações só abre para admin autenticado.
- [x] `_product/proto/admin/Configurações.png` foi citada como referência visual.
- [x] Especialidades são gerenciadas por categoria, não como lista plana.
- [x] Categorias como `Ansiedade e Transtornos Relacionados` e `Humor e Saúde Mental` vêm do backend, não de array hardcoded do frontend.
- [x] Busca pública e setup/edição profissional exibem especialidades agrupadas pela categoria persistida.
- [x] Abordagens, serviços, idiomas e público atendido são administráveis por dados reais.
- [x] Adicionar/editar/inativar/reordenar persiste no backend.
- [x] Itens vinculados a psicólogos não são excluídos fisicamente.
- [x] Restaurar padrões exige confirmação e é idempotente.
- [x] Itens/categorias inativos não aparecem para seleção nova de usuários finais.
- [x] Formulários usam React Hook Form, Zod e controllers.
- [x] UI mobile-first validada.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi acionado e a migration foi validada sem pendências por `migrate status`/`migrate deploy` (ver Execução).
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate` se houver schema/migration.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local:
  - Admin `/settings`;
  - busca pública de psicólogos com dropdown agrupado;
  - setup/edição profissional com especialidades agrupadas;
  - restaurar padrões em ambiente local com confirmação.

## Execu??o

- Refer?ncia visual usada: `_product/proto/admin/Configura??es.png`. Builder/Quick Copy n?o esteve dispon?vel como ferramenta neste ambiente; a implementa??o foi guiada pela imagem local, registrando esta limita??o.
- Criada persist?ncia real para categorias de especialidades, ordena??o de especialidades/abordagens/servi?os e op??es administr?veis de idiomas e p?blico atendido.
- Criados endpoints privados do Admin para listar, criar, editar, ativar/inativar, reordenar e restaurar padr?es dos cat?logos.
- Atualizados os consumidores reais da busca p?blica, setup/edi??o profissional e Admin de psic?logos para usar cat?logos vindos do backend.
- A restaura??o de padr?es exige confirma??o forte `RESTAURAR PADROES`, ? idempotente e n?o remove op??es customizadas.
- N?o foi instalado pacote novo de drag-and-drop; a reordena??o usa bot?es acess?veis de mover para cima/baixo.
- `pnpm --dir backend db:migrate` foi acionado conforme exigido por mudan?a Prisma, por?m o `prisma migrate dev` ficou preso no `schema-engine`/advisory lock do ambiente. N?o houve reset nem comando destrutivo. A aplica??o da migration foi validada sem pend?ncias por `pnpm --dir backend exec prisma migrate status` e `pnpm --dir backend exec prisma migrate deploy`.

## Valida??o executada

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
- Browser local/HTTP: Admin `/configuracoes` e `/settings`; frontend `/psychologists` e `/app/professional/profile/setup` em servidor de produ??o local.

## Ajuste complementar 2026-07-21 - Layout piloto premium em Configurações

- Pedido do usuário: aplicar o layout piloto na página Admin **Configurações**.
- O escopo `admin-premium-pilot` foi estendido para `/configuracoes` e `/settings`, reaproveitando a sidebar clara, tokens azuis Lectum, bordas/sombras sutis e pesos tipográficos mais leves já validados em Psicólogos, Comunidades e Pacientes.
- O header da página deixou de expor `TASK-65` e passou a usar card mobile-first com label **Catálogos e filtros**, título **Configurações**, subtítulo e CTA **Restaurar padrões** no padrão do piloto.
- Cards de contagem, botões de catálogo, botões de mover/editar e overlays de modal foram alinhados aos tokens do piloto sem alterar endpoints, contratos, dados persistidos, Prisma/migrations, packages, formulários ou regras de restauração.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual auditável usada foi `_product/proto/admin/Configurações.png` e a captura enviada pelo usuário.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/configuracoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/configuracoes` retornou `200`.

## Ajuste complementar 2026-07-21 - Catalogos recolhidos e drag visual

- Pedido do usuario: remover slugs visiveis, trocar as setas de reordenacao por blocos arrastaveis como nas regras das comunidades e manter secoes/categorias recolhidas por padrao.
- Os slugs continuam preservados nos contratos e no backend, mas deixam de ser renderizados na UI administrativa de Configuracoes para reduzir ruido visual.
- As setas de mover para cima/baixo foram removidas; categorias de especialidades e itens de catalogo passam a usar drag-and-drop nativo sobre os blocos, com icone de arraste e persistencia pelo endpoint real de reordenacao existente.
- Todas as secoes principais (**Especialidades**, **Abordagens**, **Servicos**, **Idiomas** e **Publico**) iniciam recolhidas com seta de expansao.
- Ao expandir **Especialidades**, cada categoria tambem inicia recolhida e revela suas especialidades somente pela seta da propria categoria.
- Nao houve alteracao de backend, Prisma/migrations, packages, contratos HTTP, formularios RHF/Zod ou dados persistidos.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a referencia auditavel permaneceu `_product/proto/admin/Configuracoes.png` e as capturas enviadas pelo usuario.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/configuracoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/configuracoes` retornou `200`.

## Ajuste complementar 2026-07-21 - Drag animado sem toast de ordem

- Pedido do usuario: melhorar o clique e arraste das opcoes com animacao de deslocamento do bloco arrastado e dos blocos ao redor, alem de remover a tag verde de confirmacao de atualizacao de ordem.
- O drag-and-drop nativo por `draggable` foi substituido por interacao por Pointer Events, seguindo o padrao das regras de Comunidades: o card arrastado acompanha o cursor e os demais cards se deslocam com `translate3d` durante a operacao.
- A reordenacao usa estado otimista por escopo de catalogo ate a persistencia real concluir, mantendo a UI no destino escolhido sem depender de mock ou pacote novo.
- O toast verde **Ordem atualizada** foi removido somente para reordenacao; erros continuam exibindo feedback e as demais acoes de catalogo preservam seus feedbacks existentes.
- Nao houve alteracao de backend, Prisma/migrations, packages, contratos HTTP, formularios RHF/Zod ou dados persistidos.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/configuracoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/configuracoes` retornou `200`.
