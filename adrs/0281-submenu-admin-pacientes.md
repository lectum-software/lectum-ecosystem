# ADR-0281: Submenu Admin de pacientes com âncora para lista existente

## Status

Accepted

## Task relacionada

Ajuste pós-feedback do Admin Pacientes, relacionado à TASK-46 e TASK-60.

## Contexto

O menu lateral do Admin já usa grupos expansíveis para Comunidades e Psicólogos. A seção Pacientes ainda era um item simples, apesar de a tela `/pacientes` conter dois blocos operacionais distintos: a visão geral do dashboard e a seção **Lista de pacientes**.

Não existe, neste momento, um endpoint/contrato dedicado para uma rota administrativa completa `/pacientes/lista` com paginação e filtros próprios de pacientes. Criar essa rota agora poderia sugerir uma listagem completa que o contrato atual não garante.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual auditável usada foi `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.

## Decisão

Transformar **Pacientes** no menu lateral em um grupo expansível usando o padrão existente de `adminNavItems.children`:

- **Visão geral** aponta para `/pacientes`;
- **Lista de pacientes** aponta para `/pacientes#lista-de-pacientes`.

A seção já existente de lista resumida em `/pacientes` recebeu o id `lista-de-pacientes`, evitando rota quebrada e mantendo o ajuste apenas no frontend Admin, sem criar endpoint, dados artificiais ou rota de listagem incompleta.

## Consequências

- O menu lateral fica consistente com Comunidades e Psicólogos.
- O clique em **Lista de pacientes** leva o Admin diretamente à lista já implementada com dados reais.
- Não há novo contrato HTTP, schema Prisma, migration, package, mock ou seed.
- Se o produto exigir no futuro uma listagem completa e paginada de pacientes, uma task específica deve criar endpoint real e então substituir a âncora por `/pacientes/lista`.

## Validação

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/nav.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Pendências

- Nenhuma pendência externa para este ajuste.
- Possível evolução futura: rota real `/pacientes/lista` com endpoint dedicado, paginação e filtros, se definida em task de produto.

## Revisao 2026-07-19 - Ancora de lista removida

O feedback de produto removeu a **Lista de pacientes** do dashboard `/pacientes`. Como a secao `#lista-de-pacientes` deixou de existir e ainda nao ha uma rota real `/pacientes/lista`, a decisao deste ADR foi superseded.

Decisoes revisadas:

- Remover a entrada **Lista de pacientes** do menu lateral.
- Voltar **Pacientes** a ser um item direto para `/pacientes`, sem submenu ate existir uma listagem real e dedicada.
- Nao criar rota, endpoint, paginacao, filtros ou dados artificiais para substituir a ancora.

Consequencia: o menu nao aponta para uma secao removida e continua honesto sobre as capacidades reais do Admin de Pacientes.

## Revisao 2026-07-19 - Rota real dedicada para Lista de pacientes

Novo feedback de produto pediu a volta da opção **Lista de pacientes** no submenu de Pacientes. Como a âncora antiga havia sido removida, a navegação foi reativada somente junto de uma rota real dedicada.

Decisões:

- Reabrir **Pacientes** como grupo expansível com **Visão geral** (`/pacientes`) e **Lista de pacientes** (`/pacientes/lista`).
- Criar a rota Admin `/pacientes/lista` em vez de apontar para uma âncora inexistente.
- Criar `GET /api/admin/private/patients` com autenticação Admin e dados reais de `user`, `patient_profile` e `visitor_location`.
- Expor apenas dados operacionais mínimos na lista: nome, e-mail, status ativo/inativo da conta, forma de cadastro normalizada, gênero e localização agregada quando houver fonte real.
- Manter ações destrutivas, bloqueio, silenciamento, retenção e dados clínicos fora do escopo.

Consequência: o submenu volta a ter a opção pedida sem rota quebrada, mock, seed, package novo, schema Prisma ou migration.

Validação:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `listAdminPatients({ limit: 1 })` retornou dados reais (`count=151`, `items=1`).
- `GET http://localhost:3002/pacientes/lista` retornou `200`.
- `GET http://localhost:3001/api/admin/private/patients?limit=1` sem token Admin retornou `401`.
