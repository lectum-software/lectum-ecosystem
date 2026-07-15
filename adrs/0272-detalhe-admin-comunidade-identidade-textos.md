# ADR-0272: Refinos no detalhe administrativo de comunidades

## Status

Accepted — 2026-07-15

## Task relacionada

TASK-72 (ajuste complementar solicitado durante a trilha Admin)

## Contexto

O detalhe administrativo de comunidades já possuía abas contextuais e edição real de identidade, mas a UI ainda divergia do padrão mais recente do detalhe administrativo de psicólogos. A operação também identificou textos persistidos com caracteres corrompidos em comunidades reais, afetando a descrição exibida no cabeçalho e no formulário.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A validação visual usou as capturas enviadas pelo usuário, `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o padrão local do detalhe de psicólogos.

## Decisão

- Alinhar o menu de abas do detalhe de comunidades ao modelo visual do detalhe de psicólogos: abas em faixa discreta, sem ícones e com indicador inferior arredondado.
- Remover a linha superior com `Voltar para comunidades` e `Ver no site`, concentrando a ação pública no cabeçalho.
- Trocar o CTA do cabeçalho de `Editar comunidade` para `Ver comunidade`, apontando para a rota pública `/community/[slug]`.
- Simplificar a edição do avatar na aba **Dados**: exibir apenas o avatar acima do campo de nome, com ícone de edição sobreposto e upload real existente no clique.
- Remover o texto explicativo de escopo V1 e o bloco lateral **Informações da comunidade**, evitando duplicação de dados do formulário.
- Criar migration condicional para reparar textos corrompidos em `communities` apenas quando os campos atuais contiverem sinais de encoding quebrado (`�`, `??`, `Ã` ou `Â`), preservando edições administrativas legítimas quando não houver corrupção.

## Consequências

- A tela de comunidades fica visualmente consistente com o detalhe de psicólogos e mais direta para edição de identidade.
- A edição de avatar permanece usando o endpoint real de upload e `next/image`; não há mock, endpoint novo ou pacote novo.
- A correção de texto é idempotente e evita sobrescrever comunidades já editadas corretamente.
- Como a migration altera dados reais, `pnpm --dir backend db:migrate` deve ser executado nesta task; se o ambiente já estiver atualizado, `prisma migrate status` deve confirmar o estado.

## Validação

- `pnpm --dir backend db:migrate` foi executado; a chamada CLI excedeu o limite de 120s do executor, mas a migration foi aplicada e registrada em `_prisma_migrations`.
- `pnpm --dir backend exec prisma migrate status` confirmou o schema do banco como atualizado.
- Consulta real em `community` confirmou ausência de descrições com `�` ou `??` após a migration.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local: `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=dados` retornou `200`.
- Smoke local: `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio` retornou `200`.

## Pendências

- Nenhuma decisão externa pendente.
