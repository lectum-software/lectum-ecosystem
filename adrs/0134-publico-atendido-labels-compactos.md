# ADR-0134: Labels compactos de público atendido

## Status

Accepted

## Task relacionada

Ajuste pós-task — perfil profissional e listagem de psicólogos

## Contexto

Os chips de público atendido exibiam faixas etárias junto dos nomes (`Crianças (até 11)`, `Adolescentes (12-17)`, `Adultos (18-59)` e `Idosos (60+)`). O pedido de produto é simplificar a leitura nas configurações do perfil do psicólogo, nos filtros da listagem e em qualquer chip equivalente, preservando os valores internos e a lógica de busca.

A referência visual ativa segue sendo Builder Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`; como não há ferramenta Builder callable nesta sessão, foram consultadas as imagens locais `_product/proto/Editar Perfil - Psicólogo.jpg` e `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg`.

## Decisão

- Alterar somente os labels exibidos de público atendido para `Crianças`, `Adolescentes`, `Adultos` e `Idosos`.
- Preservar os valores internos (`criancas`, `adolescentes`, `adultos`, `idosos`) e a origem compartilhada `PUBLIC_TARGET_OPTIONS` usada no editor profissional e nos filtros.
- Atualizar também o tradutor local do perfil público do psicólogo para que os chips do perfil exibam a nomenclatura compacta.

## Consequências

- Filtros, enums, payloads, persistência e classificação continuam inalterados.
- A interface fica mais limpa, com chips menores e menos ruído visual.
- Não houve alteração de backend, Prisma, packages ou contratos de API.

## Validação

- `pnpm --dir frontend exec biome check --write "src/app/app/professional/profile/setup/options.ts" "src/app/app/psychologist/[id]/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local: `http://localhost:3000/app/professional/profile/setup` retornou HTTP 200.
- Smoke local: `http://localhost:3000/app/psychologists` retornou HTTP 200.

## Pendências

- Push remoto depende de credenciais GitHub disponíveis no ambiente.
