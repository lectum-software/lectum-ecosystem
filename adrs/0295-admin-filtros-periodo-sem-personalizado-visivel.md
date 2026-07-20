# ADR-0295: Filtros de período do Admin sem Personalizado selecionável

## Status

Accepted

## Task relacionada

TASK-76

## Contexto

Em filtros de período do painel Admin, a opção `Personalizado` aparecia dentro do dropdown junto dos presets. A regra de UX solicitada é que o usuário não escolha `Personalizado` diretamente: ele deve surgir automaticamente quando houver edição manual dos campos `De`/`Até`. Além disso, filtros com select de período devem iniciar por padrão em `Todo o período`.

O ajuste é transversal ao Admin e afeta dashboards e abas de detalhe que já usam dados reais por período. Não há mudança de backend, banco ou contratos de API.

## Decisão

- Remover `custom` das listas visíveis de opções de período.
- Manter `custom` como estado interno para consultas com intervalo manual.
- Quando `custom` estiver ativo por edição de data, renderizar uma opção `disabled hidden` para exibir `Personalizado` como valor atual sem disponibilizá-lo no dropdown.
- Padronizar o default dos selects de período para `all` / `Todo o período`.
- Em filtros de atividades, deixar os campos `De`/`Até` sempre visíveis para permitir que a digitação acione automaticamente o estado `custom`.

## Consequências

- O dropdown fica limitado a presets claros e evita seleção manual redundante.
- Intervalos customizados continuam funcionando sem alterar endpoints.
- Algumas abas de atividades exibem dois campos de data a mais por padrão, mantendo layout mobile-first empilhado e progressivo.

## Validação

- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- Scan estático: sem `<option value="custom">Personalizado` ou `id: "custom", label: "Personalizado"` visíveis em `admin/src/app`.
- Scan estático: sem defaults antigos `week`/`30d`/`90d`/`180d` nos estados de período mapeados.
- Chrome headless local abriu `http://localhost:3002/psicologos`; em perfil sem sessão administrativa a rota exibiu login, então a conferência visual autenticada ficou limitada ao código, build e protótipo local.
- Referência visual local: `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.

## Pendências

- Nenhuma pendência externa.
