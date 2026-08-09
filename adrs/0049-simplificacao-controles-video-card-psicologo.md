# ADR-0049: Simplificar controles de mídia do card de psicólogo

## Status

Accepted

## Task relacionada

TASK-XX

## Contexto

No card de vídeo de psicólogo, os controles atuais exibiam botões de volume/áudio e play/pause com interação por toque duplo e atraso de auto-hide. A proposta era reduzir complexidade e melhorar a previsibilidade para mobile, alinhando com padrão mais simples: menos ações ativas concorrentes na região do vídeo.

## Decisão

Adotar interação simplificada:

- Exibir ícone de volume **somente** quando o vídeo estiver mutado, com função exclusiva de **desmutar**.
- Remover controle visual de silenciar/alternar volume como interação secundária durante reprodução.
- Fazer o toque no vídeo alternar entre:
  - **desmutar** quando estiver mutado;
  - **play/pause** quando já estiver com áudio habilitado.

## Consequências

- **Impacto positivo:** interface mais limpa e menos ambiguidade entre ações concorrentes no card.
- **Trade-off:** após mutar o vídeo, um clique serve para desmutar (e retoma a reprodução se estiver parado no momento do clique), reduzindo opções imediatas de controle.
- **Riscos:** mudança de comportamento para usuários acostumados ao controle de mudo persistente pode exigir ajuste de hábito.
- **Revisão futura:** validar se caso de uso pede reintrodução de mute manual no controle da tela sem degradar a simplicidade atual.

## Validação

- `pnpm --dir frontend check`

## Pendências

- Nenhuma por ora.
