# TASK-76: Ajuste dos filtros de período do Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-76 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-46, TASK-48, TASK-51, TASK-53, TASK-57, TASK-58, TASK-59, TASK-60, TASK-61, TASK-71 |
| ADR alvo | ADR-0295 |

## Contexto

O painel Admin possui filtros de período em dashboards e abas de detalhe. Em alguns selects, a opção `Personalizado` aparecia como alternativa selecionável no dropdown. A regra de produto solicitada em 2026-07-20 é que `Personalizado` não seja uma opção manual do select: esse estado deve surgir automaticamente apenas quando uma data for digitada nos campos `De`/`Até`. A seleção padrão deve permanecer em `Todo o período`.

Referência visual: `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png` e screenshot enviado pelo usuário na rota de publicações do detalhe administrativo de psicólogo. O Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a validação visual usou os protótipos locais e browser local.

## Objetivo

Padronizar todos os filtros de período do Admin para:

- iniciar por padrão em `Todo o período` quando houver select de período;
- ocultar `Personalizado` da lista de opções do select;
- exibir `Personalizado` como valor atual apenas depois de edição manual dos campos de data;
- preservar consultas reais existentes, sem mocks e sem alterar contratos backend.

## Pré-requisitos e bloqueios

- Sem requisito externo novo.
- Sem mudança de banco, schema Prisma ou migrations.
- Sem pacote novo.
- Arquitetura obrigatória: `_product/tasks/ARCHITECTURE.md`.
- Política de packages: `_product/tasks/PACKAGES.md`.
- Protótipos locais: `_product/tasks/PROTO-INVENTORY.md` e `_product/proto/admin`.

## Escopo frontend

- Admin dashboard de psicólogos, pacientes e comunidades.
- Detalhe administrativo de psicólogo: Estatísticas, Publicações, Denúncias e Atividades.
- Detalhe administrativo de comunidade: Conteúdo, Estatísticas, Denúncias e Atividades.
- Detalhe administrativo de paciente: Atividades.

## Escopo backend

- Nenhuma alteração backend nesta task.

## Fora do escopo

- Alterar endpoints, DTOs, query keys ou semântica de agregação.
- Adicionar filtros novos em telas que hoje usam apenas intervalo de datas/atalhos rápidos sem select de período.
- Recriar componentes de formulário ou design system.

## Contrato técnico detalhado

Frontend esperado:

- Opções de período preset continuam como `Hoje`, `Esta semana`, `Este mês`, `Este ano`, `Todo o período` ou janelas reais (`Últimos 30/90/180 dias`) quando aplicável.
- `custom` permanece apenas como valor interno de estado/query quando datas manuais forem preenchidas.
- Quando `custom` estiver selecionado por data manual, inserir `<option disabled hidden value="custom">Personalizado</option>` apenas para exibir o valor atual sem aparecer como opção aberta do dropdown.
- Filtros de atividades que antes só mostravam datas após escolher `Personalizado` passam a deixar `De`/`Até` visíveis; digitar neles muda o estado para `custom`.

Packages usados:

- Nenhum pacote novo.

Regras de UI obrigatórias:

- Mobile-first preservado com grids empilhados por padrão e breakpoints progressivos.
- Nenhum `<img>` adicionado.
- Cores/classes existentes por tokens do Admin preservadas.

## Critérios de aceite

- [x] Nenhum select de período do Admin contém `Personalizado` como opção selecionável manualmente.
- [x] O valor `Personalizado` aparece somente como opção `disabled hidden` quando o usuário digita data nos campos `De`/`Até`.
- [x] Filtros com select de período iniciam em `Todo o período` por padrão.
- [x] Filtros de atividades de psicólogo, paciente e comunidade permitem digitar datas sem selecionar `Personalizado` no dropdown.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Não houve criação de formulário de produto com submit; os campos simples de filtro preservam composição local existente.
- [x] Builder/Quick Copy não estava callable; imagem local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png` foi usada como referência.
- [x] `pnpm --dir admin check` executado sem erros.
- [x] ADR criado em `adrs/0295-admin-filtros-periodo-sem-personalizado-visivel.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- Scan estático — OK: nenhuma opção `Personalizado` visível e nenhum default antigo nos selects de período mapeados.
- Chrome headless local abriu `http://localhost:3002/psicologos`, mas sem sessão administrativa exibiu login; a validação autenticada ficou limitada ao código, build e referência local.

## Notas de execução

Esta task é uma correção transversal de UX no Admin e não altera API, persistência ou regras de domínio. O estado `custom` continua necessário para consultas reais com intervalo manual.
