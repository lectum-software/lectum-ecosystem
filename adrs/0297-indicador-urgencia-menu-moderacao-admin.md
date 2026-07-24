# ADR-0297: Indicador visual de urgência no menu de Moderação Admin

## Status

Accepted

## Task relacionada

TASK-78

## Contexto

Depois da TASK-77, a opção **Moderação** do menu lateral representa tanto eventos textuais pendentes quanto alertas operacionais derivados. Um badge apenas numérico não comunica se existe item urgente, como denúncia pendente ou CRP profissional não aprovado.

## Decisão

- Reutilizar `useAdminModerationSummary` no shell lateral.
- Calcular urgência como `urgent_pending_total + operational_alerts.counts.urgent_total`.
- Quando houver pendência total e urgência maior que zero, exibir badge com ícone `AlertTriangle` vermelho.
- Quando houver pendência total, mas urgência zero, exibir badge com ícone `AlertTriangle` laranja.
- Manter a contagem no menu expandido e usar ícone compacto no menu recolhido.
- Manter texto screen-reader/title explicando a severidade.

## Consequências

- O Admin identifica rapidamente se a moderação tem urgência sem abrir a página.
- O shell continua usando a fonte real já cacheada por TanStack Query, sem endpoint novo.
- Alertas urgentes têm precedência visual sobre alertas menos urgentes.
- A cor laranja é intencionalmente restrita a pendências sem urgência; se qualquer urgente existir, o estado inteiro vira vermelho.

## Ajuste 2026-07-24

- O submenu de **Moderação** mantém `/moderacao` como entrada de visão geral, mas a cópia exibida deixa de ser **Dashboard** e passa a ser **Visão geral**.
- As opções **Denúncias**, **Compliance**, **Operacionais** e **Conteúdo sensível** exibem tags com contagens reais de pendências da categoria.
- As contagens continuam vindo de `useAdminModerationSummary`: `pending_reports`, `compliance_total`, `operational_total` e `pending_total`, sem endpoint novo nem estimativa.
- Enquanto o summary real não é carregado, as tags não são renderizadas para evitar comunicar zero como dado real temporário.

## Validação

- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- `Invoke-WebRequest http://localhost:3002/moderacao` retornou HTTP 200.
- Primeira tentativa de `pnpm --dir admin build` falhou por processo Next build concorrente; reexecução concluída com sucesso.
- Ajuste 2026-07-24: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local nas rotas de Moderação retornando 200.

## Pendências

- Se o produto quiser separar múltiplos badges por tipo de alerta, criar task específica para redesign da navegação Admin.
