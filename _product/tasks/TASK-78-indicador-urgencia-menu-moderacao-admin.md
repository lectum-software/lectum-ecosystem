# TASK-78: Indicador de urgência no menu lateral da moderação Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-78 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Admin / Operação / UI |
| Status | Completed |
| Dependências | TASK-46, TASK-77 |
| ADR alvo | ADR-0297 sobre indicador visual de severidade na navegação Admin |

## Contexto

A TASK-77 ampliou `/moderacao` para reunir eventos textuais pendentes, denúncias urgentes e alertas operacionais derivados. O menu lateral já exibia um badge numérico na opção **Moderação**, mas o produto pediu um sinal visual mais claro: vermelho quando houver alertas urgentes e laranja quando houver somente alertas menos urgentes.

## Objetivo

Adicionar um ícone de alerta na opção **Moderação** do menu lateral Admin, com cor vermelha para urgência e laranja para pendências menos urgentes, mantendo a contagem existente e a acessibilidade.

## Pré-requisitos e bloqueios

- TASK-46 concluída: shell lateral Admin real.
- TASK-77 concluída: `useAdminModerationSummary` já fornece `pending_total`, `urgent_pending_total`, `operational_alerts.counts.total` e `operational_alerts.counts.urgent_total`.
- Não há requisito externo.
- Não há mudança de banco, backend, package ou contrato de API.
- Builder/Quick Copy não está disponível como ferramenta executável neste ambiente; referência visual usada: padrão de badge/menu atual do Admin e imagens locais `_product/proto/admin/Dashboard.png` e `_product/proto/admin/Notificações.png`.

## Escopo frontend

- Atualizar `admin/src/components/admin-shell/shell.tsx`.
- Importar ícone de alerta de `lucide-react`, pacote já instalado.
- Calcular urgência pelo total urgente real: `urgent_pending_total + operational_alerts.counts.urgent_total`.
- Quando houver qualquer alerta/pendência na moderação:
  - mostrar ícone de alerta no item **Moderação**;
  - vermelho quando o total urgente for maior que zero;
  - laranja quando houver alertas, mas nenhum urgente;
  - manter contagem visível no menu expandido e comportamento compacto no menu recolhido;
  - manter texto acessível com o resumo do estado.

## Escopo backend

- Nenhuma alteração.

## Fora do escopo

- Alterar severidade dos alertas.
- Criar novo endpoint ou persistência.
- Criar workflow de resolução de alertas derivados.
- Alterar outros itens do menu lateral.

## Contrato técnico detalhado

- Reutilizar `useAdminModerationSummary` e `adminNavItems` existentes.
- Não criar novos hooks, query keys ou chamadas HTTP.
- Não instalar packages.
- UI mobile-first/desktop mantém o padrão atual do shell; não usar `<img>` cru.
- O estado urgente tem precedência sobre alertas menos urgentes.

## Critérios de aceite

- [x] Quando houver ação urgente na moderação, o item **Moderação** exibe ícone de alerta vermelho.
- [x] Quando houver alerta de moderação sem urgência, o item **Moderação** exibe ícone de alerta laranja.
- [x] Quando não houver alerta/pendência de moderação, nenhum badge/ícone adicional é exibido.
- [x] O menu expandido mantém contagem junto ao ícone; o menu recolhido mantém ícone compacto.
- [x] O texto acessível diferencia urgentes de menos urgentes.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo ou migration foi usado.
- [x] UI sem `<img>` cru.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/`.
- [x] Commit próprio criado e `git push` executado.

## Validação mínima

- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke local em `/moderacao` ou rota Admin equivalente para confirmar renderização do shell.

## Notas de execução

- Execução em 2026-07-21.
- Sem alteração de banco; `pnpm --dir backend db:migrate` não se aplica.
- Implementado `AlertTriangle` no badge da opção **Moderação**: vermelho quando `urgent_pending_total + operational_alerts.counts.urgent_total > 0`; laranja quando houver pendências sem urgência.
- Comandos executados sem erro final: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`.
- Observação de validação: uma primeira tentativa de `pnpm --dir admin build` falhou por já existir outro processo de build Next em execução; o comando foi reexecutado em seguida e concluiu com sucesso.
- Smoke local: `Invoke-WebRequest http://localhost:3002/moderacao` retornou HTTP 200.

## Ajuste complementar 2026-07-24 - Tags de pendências nos submenus de Moderação

- Pedido do usuário: renomear o submenu **Dashboard** de Moderação para **Visão geral** e exibir uma tag de quantidade de pendências em **Denúncias**, **Compliance**, **Operacionais** e **Conteúdo sensível**.
- O submenu `/moderacao` foi renomeado apenas na navegação lateral; a rota e a página exclusiva permanecem as mesmas.
- As tags usam o summary real já carregado pelo shell lateral:
  - **Denúncias**: `operational_alerts.counts.pending_reports`;
  - **Compliance**: `operational_alerts.counts.compliance_total`;
  - **Operacionais**: `operational_alerts.counts.operational_total`;
  - **Conteúdo sensível**: `pending_total` de `content_moderation_event`.
- As tags só são renderizadas depois do retorno real de `useAdminModerationSummary`, evitando exibir zero temporário como dado falso durante o carregamento.
- Não houve alteração de backend, Prisma schema/migrations, packages, formulários ou uso de dados artificiais.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write src/components/admin-shell/nav.ts src/components/admin-shell/shell.tsx`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build` (primeira tentativa bloqueada por build Next concorrente; reexecutado após o processo finalizar e concluiu com sucesso).
- `pnpm check`.
- Smoke HTTP local no Admin (`localhost:3002`) retornou 200 para `/moderacao`, `/moderacao/denuncias`, `/moderacao/compliance`, `/moderacao/operacionais` e `/moderacao/conteudo-sensivel`.
- Chrome headless local em 390x844 confirmou a proteção real da rota e redirecionou para login em perfil sem sessão Admin; a conferência visual autenticada ficou limitada à captura enviada pelo usuário, inspeção do código e build/check porque a sessão Admin interativa do navegador do usuário não fica disponível no perfil headless isolado.
