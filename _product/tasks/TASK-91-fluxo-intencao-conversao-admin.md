# TASK-91: Fluxo de intenção e conversão cruzada no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-91 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin Analytics |
| Status | Completed |
| Dependências | TASK-48, TASK-57, TASK-60, TASK-84, TASK-89, TASK-90 |
| ADR alvo | ADR-0344 |

## Contexto

Após a padronização das leituras de **Intenção** dos pacientes e **Conversão** dos psicólogos, o produto precisa que os dois lados conversem visualmente no Admin. A leitura atual existe em blocos separados: pacientes são classificados como frios, curiosos, interessados/objetivos e qualificados; psicólogos são classificados por alta conversão, interesse não convertido, tráfego não convertido e baixa conversão.

Em conversa de produto, foi decidido que uma tabela limitaria a interpretação. A experiência deve usar um visual mais lúdico e intuitivo, com fluxo/Sankey em cards, mostrando como os pares reais paciente-psicólogo caminham da intenção do paciente para a categoria de conversão do psicólogo.

Também foi decidido evoluir as estatísticas individuais do psicólogo: o bloco atual **Origem do tráfego** não deve ser a leitura principal, pois a tabela mostra volume por canal, mas não explica a qualidade do tráfego. A nova leitura primária deve ser **Qualidade do tráfego**, preservando a tabela como detalhamento auditável.

Referências visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Dashboard.png`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- capturas enviadas pelo usuário na conversa para `/dashboard` e `/psicologos/[id]?tab=estatisticas`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução, ele não estava exposto como ferramenta callable; a referência visual foi feita pelas imagens locais/exportadas e pelas capturas da conversa.

## Objetivo

Adicionar ao Dashboard Admin um bloco visual de **Fluxo de intenção e conversão**, e adicionar ao detalhe estatístico do psicólogo um fluxo de **Qualidade do tráfego**, ambos baseados apenas em dados reais first-party já existentes.

## Pré-requisitos e bloqueios

- Sem requisito externo novo.
- Sem package novo.
- Sem migration, pois todos os sinais usados já existem em `profile_view_event`, `psychologist_favorite`, `contact_request`, `page_view_event` e `important_action_event`.
- Usar arquitetura de módulos e DTOs existentes em `backend/src/modules/api/admin/private`.
- Usar contratos reais em `admin/src/api/req`, sem mock ou endpoint paralelo.

## Escopo backend

- Expandir `GET /api/admin/private/dashboard/summary` com `intent_conversion_flow`.
- Classificar pares reais paciente-psicólogo usando sinais de perfil, favorito e WhatsApp:
  - **Curiosos**: abertura de perfil sem favorito ou WhatsApp para o mesmo psicólogo;
  - **Interessados**: retorno ao perfil ou favorito antes do contato;
  - **Qualificados**: clique no WhatsApp ou múltiplos sinais fortes para o mesmo psicólogo.
- Cruzar os pares com a categoria de conversão do psicólogo usando os mesmos thresholds normalizados em 30 dias já adotados no Admin.
- Expandir `GET /api/admin/private/psychologists/:id/statistics` com `traffic_quality`.
- Calcular origem e qualidade por ator/sessão quando houver vínculo real entre `page_view_event`, `profile_view_event`, `psychologist_favorite`, `contact_request` e `important_action_event`.
- Representar explicitamente WhatsApps sem origem atribuída, sem inventar canal.

## Escopo frontend

- Incluir no `/dashboard` o bloco **Fluxo de intenção e conversão** logo após a visão geral.
- Usar layout mobile-first em cards/fluxos, evoluindo para três colunas em telas grandes: intenção, caminhos observados e conversão do psicólogo.
- Incluir insights rápidos de absorção saudável, intenção retida e perda exploratória.
- No detalhe do psicólogo, substituir a tabela como leitura principal por **Qualidade do tráfego**.
- Preservar a tabela de origem do tráfego em um `<details>` como detalhamento auditável.
- Não introduzir `<img>` cru, formulário novo ou pacote novo.

## Fora do escopo

- Alterar descoberta pública, ranqueamento público ou distribuição de tráfego.
- Inferência clínica, avaliação de qualidade de atendimento ou punição automática.
- Backfill, seed, mock ou dados estimados.
- Novo tracking de eventos.
- Alteração de schema/migration Prisma.

## Contrato técnico detalhado

- `intent_conversion_flow` expõe:
  - nós de intenção do paciente;
  - nós de conversão do psicólogo;
  - fluxos não vazios entre as duas leituras;
  - insights agregados e notas de cobertura/privacidade.
- Pacientes **Frios** continuam fora do fluxo cruzado porque não possuem par paciente-psicólogo com sinal real; isso é documentado na nota de cobertura.
- `traffic_quality` expõe:
  - origens lidas;
  - níveis de qualidade: só visitou, demonstrou interesse, qualificado para contato e não identificado;
  - fluxos origem → qualidade;
  - taxa de absorção para WhatsApp;
  - WhatsApps atribuídos e não atribuídos.
- Nenhum contrato público foi alterado; as mudanças são Admin-only.

## Critérios de aceite

- [x] Dashboard Admin exibe bloco visual **Fluxo de intenção e conversão** com dados reais.
- [x] O fluxo cruza intenção do paciente com categorias de conversão dos psicólogos, sem tabela como formato principal.
- [x] A regra exclui **Frios** do fluxo cruzado por falta de par paciente-psicólogo e comunica isso na nota de cobertura.
- [x] Detalhe estatístico do psicólogo exibe **Qualidade do tráfego** como leitura principal.
- [x] A tabela **Origem do tráfego** permanece disponível como detalhamento auditável, não como visual principal.
- [x] WhatsApps sem vínculo de origem aparecem como **Origem não atribuída**, sem inventar canal.
- [x] UI é mobile-first e nenhum `<img>` cru foi introduzido.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos da `TASK-02` não se aplicam nesta task.
- [x] Builder/Quick Copy não estava callable; imagens locais de `_product/proto/admin` foram citadas.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0344-fluxos-intencao-conversao-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto com `pnpm --dir backend exec tsx -e`, validando que os contratos `intent_conversion_flow` e `traffic_quality` retornam estruturas consistentes sem mocks.
- Browser local em `/dashboard` e `/psicologos/[id]?tab=estatisticas`.
- Browser local/headless autenticado validou `/dashboard` e `/psicologos/visual-user-no-traction-psychologist?tab=estatisticas` em 390px e 1366px, sem overflow horizontal (`scrollWidth=390/390` mobile e `1351/1366` desktop), com screenshots salvos em `.tmp/admin-dashboard-intent-conversion-mobile.png`, `.tmp/admin-psychologist-traffic-quality-mobile.png`, `.tmp/admin-dashboard-intent-conversion-desktop.png` e `.tmp/admin-psychologist-traffic-quality-desktop.png`.
- Admin temporário real `codex-task91-validation-...@lectum.local` foi criado com `admin:bootstrap` para validação browser e removido do banco ao final.

## Notas de execução

- A leitura cruzada é operacional e agregada, destinada ao Admin.
- A correlação entre os dois lados usa thresholds já existentes de conversão de psicólogos e score de intenção por par paciente-psicólogo, evitando criar vocabulário paralelo.
- A origem de WhatsApp é uma atribuição de qualidade quando existe vínculo first-party; o total canônico de WhatsApp continua vindo de `contact_request`.