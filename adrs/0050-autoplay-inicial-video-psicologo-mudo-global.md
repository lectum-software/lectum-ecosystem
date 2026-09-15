# ADR-0050: Autoplay inicial do vídeo em mudo e unmute global por toque em card de psicólogo

## Status

Accepted

## Task relacionada

TASK-XX

## Contexto

Após simplificar os controles do card de psicólogo, a UX ainda precisava de um comportamento inicial mais previsível para listas de vídeos: no primeiro carregamento da tela o vídeo deveria iniciar em mudo (autoplay), exibindo apenas o controle de desmutar. Além disso, o clique no vídeo ou no ícone de mudo deveria liberar áudio para toda a sequência e remover o botão de volume imediatamente.

## Decisão

Adotar o seguinte fluxo de mídia no card de psicólogo:

- Iniciar com estado global de áudio desativado (`globalSoundEnabled = false`).
- No estado inicial, renderizar apenas o ícone de volume com função de `desmutar` e manter autoplay permitido em vídeo com `muted`.
- Em qualquer card, enquanto mutado, o clique no vídeo ou no ícone de mudo:
  - desmuta o próprio card imediatamente,
  - atualiza o estado global de áudio para ativado,
  - fecha o controle de volume imediatamente,
  - mantém o vídeo em reprodução (quando em play), deixando só os controles de play/pause.
- Com áudio global liberado, somente o controle de play/pause permanece disponível no vídeo.
- O vídeo pode ser pausado e retomado pelo mesmo clique da área do card ou pelo botão de play/pause, deixando o ícone de play visível enquanto estiver pausado.

## Consequências

- **Impacto positivo:** interface inicial mais limpa, comportamento consistente de áudio para todos os cards e redução de ambiguidade entre ações de mutar e reprodução.
- **Trade-off:** não há como manter estado de silêncio para toda a lista após a primeira interação de desmutar; o primeiro gesto de áudio ativa globalmente o som.
- **Riscos:** autoplay com som em outros cards depende de política de media autoplay do navegador; no entanto, o gesto do usuário já habilita o contexto para essa mudança de estado.
- **Revisão futura:** monitorar taxa de erro de reprodução automática com áudio e avaliar fallback de UI caso o navegador bloqueie a reprodução após desmutar.

## Validação

- `pnpm --dir frontend check`

## Pendências

- Nenhuma.
