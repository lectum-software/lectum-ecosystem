# ADR-0171: Layout premium em duas telas de boas-vindas do paciente

## Status

Accepted

## Task relacionada

TASK-08 (ajuste incremental de UX/onboarding do paciente)

## Contexto

O onboarding do paciente já estava reduzido para duas telas, com persistência real em `patient_profile.onboarding_completed_at` via `PUT /api/private/patient/onboarding`. O produto solicitou substituir a composição anterior por duas telas mais emocionais e premium, baseadas nas referências anexadas em 26/06/2026: uma tela de acolhimento com o novo símbolo Lectum e paisagem/caminho azul, seguida por uma tela de escolha inicial entre encontrar profissional e participar da comunidade.

Builder/Quick Copy não esteve disponível como ferramenta MCP nesta execução; as referências visuais anexadas pelo usuário e a task/proto existente de TASK-08 foram usadas como norte visual auditável. A alteração não deve mudar contrato de API nem persistência de onboarding.

## Decisão

- Manter a rota `/patient/welcome` e o fluxo real já existente: `GET /api/private/patient/profile` decide se o onboarding deve aparecer; a escolha de objetivo conclui via `PUT /api/private/patient/onboarding`.
- Recriar a interface como experiência mobile-first em duas telas:
  - tela 1: símbolo Lectum SVG, título `Bem-vindo à Lectum`, texto de acolhimento, ilustração vetorial CSS/SVG de caminho e CTA grande `Vamos começar`;
  - tela 2: mesma linguagem visual de paisagem, título `Como você gostaria de começar?` e dois cards de escolha.
- Usar o componente `LectumSymbolIcon` criado no ADR-0170, sem adicionar asset rasterizado nem usar `<img>`.
- Implementar a ilustração de fundo como SVG inline/tokenizado e animações CSS leves (`fade-up`, escala do símbolo, leve flutuação do caminho e seta), respeitando `prefers-reduced-motion`.
- Atualizar a copy dos objetivos para o novo layout: `Encontrar um profissional` e `Participar da comunidade`, mantendo os valores de domínio existentes (`encontrar_psicologo` e `conhecer_comunidade`).

## Consequências

- A primeira experiência do paciente fica mais próxima da nova direção visual da marca, sem alterar backend ou contratos.
- O SVG inline evita dependência de arquivos temporários e permanece escalável em mobile/desktop.
- As animações são decorativas e desativadas para usuários com redução de movimento.
- A tela preserva a arquitetura existente de React Query/caller real e não introduz pacote novo.
- A ilustração vetorial é uma interpretação limpa das referências anexadas, não uma cópia raster pixel-perfect.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/headless em `http://localhost:3000/patient/welcome`, viewport 390x884,
  com usuário paciente temporário criado por endpoint real (`POST /api/public/user/store`):
  validou a tela 1, o avanço pelo CTA `Vamos começar` e a renderização da tela 2.
- O usuário temporário de validação foi removido do banco ao final.

## Pendências

- Aplicar a nova identidade Lectum no restante do site em tarefa futura, caso o produto aprove a direção visual.
