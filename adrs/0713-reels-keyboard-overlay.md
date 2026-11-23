# ADR-0713 - Comentario sobreposto sem redimensionar reels

Status: aceito para validacao local.

O teclado reduzia o visualViewport e o compositor crescia no fluxo flex,
alterando duas vezes a geometria do video. O reels agora conserva o frame
anterior ao foco e calcula separadamente o deslocamento do compositor.
Rotacao e redimensionamento normal continuam atualizando o frame.

O slot inferior reserva espaco constante. O compositor expandido e absoluto
e usa os componentes escuros da Lectum, sem reorganizacao visual inspirada
no TikTok. A referencia solicitada era somente de comportamento.

A capa perde a sobreposicao e o avatar cresce sem deslocar o nome: aumento
de 12px combinado com reducao de 12px no espacamento seguinte.

Na TASK-350, a mesma limpeza visual foi aplicada a comunidade: removidos o brilho radial e a sobreposicao luminosa, mantendo o degrade da paleta e a altura de 100px. Os controles circulares preservam seus estilos; a barra nativa do navegador nao e modificada.

Sem publicacao ate aprovacao das capturas do codigo local. Teclado iOS real
continua exigindo verificacao em dispositivo, alem dos testes geometricos.
