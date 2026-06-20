# ADR-0135: Chips sem container externo no editor profissional

## Status

Accepted

## Task relacionada

Ajuste pós-task — configuração do perfil do psicólogo

## Contexto

Os grupos de seleção por chips do editor profissional (`Serviços`, `Público` e `Dias com horários disponíveis`) estavam dentro de um controle com borda externa grande, o que fazia o conjunto parecer um campo único encaixotado. O pedido de produto é reduzir esse peso visual e fazer os grupos parecerem botões selecionáveis obrigatórios, preservando layout, responsividade e comportamento.

A referência visual ativa segue sendo Builder Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`; como não há ferramenta Builder callable nesta sessão, foi consultada a imagem local `_product/proto/Editar Perfil - Psicólogo.jpg`.

## Decisão

- Remover o container/borda externa do `CatalogPicker` usado por `Serviços` e do `ChipPicker` usado por `Público` e `Dias com horários disponíveis`.
- Manter o `Container` de formulário para label, descrição, obrigatoriedade e slot de erro.
- Reforçar os chips individuais com borda mais definida, raio suave, altura mínima de 36px, padding equilibrado, fundo branco em light mode e estado selecionado com azul do design system, sombra e ring sutis.
- Preservar os valores internos, seleção múltipla, limites, validações e submit existentes.

## Consequências

- Os grupos ficam visualmente mais leves e integrados ao formulário.
- O estado selecionado fica mais evidente sem criar componente ou design system paralelo.
- Não há alteração de backend, Prisma, endpoints, packages ou persistência.

## Validação

- `pnpm --dir frontend exec biome check --write "src/app/app/professional/profile/setup/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local: `http://localhost:3000/app/professional/profile/setup` retornou HTTP 200.

## Pendências

- Push remoto depende de credenciais GitHub disponíveis no ambiente.
