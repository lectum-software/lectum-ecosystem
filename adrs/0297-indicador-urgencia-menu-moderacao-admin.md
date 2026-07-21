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

## Validação

- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- `Invoke-WebRequest http://localhost:3002/moderacao` retornou HTTP 200.`n- Primeira tentativa de `pnpm --dir admin build` falhou por processo Next build concorrente; reexecução concluída com sucesso.

## Pendências

- Se o produto quiser separar múltiplos badges por tipo de alerta, criar task específica para redesign da navegação Admin.