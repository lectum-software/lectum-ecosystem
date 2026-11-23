# TASK-352 - Teclado iOS e preferencia de audio

## Escopo

Compensar o deslocamento do visualViewport sem redimensionar o video. Placeholder de comentario em 14px, mantendo editor em 16px. Restaurar preferencia explicita de audio entre visitas; abrir reels por toque tenta som apenas quando nao existe escolha anterior. Bloqueio de autoplay continua local ao player.

Referencias: imagens iPhone/Android do usuario e PROTO-INVENTORY. Builder indisponivel. Sem mudancas de API.

## Aceite

- [x] Preservar dimensoes e acompanhar offsetTop/offsetLeft.
- [x] Reduzir placeholder sem reduzir fonte editavel.
- [x] Persistir som e silencio, preservando fallback do navegador.
- [x] Validar testes focados e navegador local.
- [ ] Confirmar teclado nativo no iPhone.

Sem publicacao automatica; validacao nativa permanece necessaria.

## Evidencias locais

- Frontend check e build aprovados; versao local 0.1.853. Guards de versao, fontes, tamanho, ADRs e tasks aprovados.
- 26 testes de audio/player no Chrome aprovados, incluindo fallback de autoplay e silencio manual.
- Testes de armazenamento entre visitas, armazenamento restrito e geometria do visualViewport aprovados.
- App local com respostas reais da API publica: video 390x780 antes/depois do teclado; offsetTop 120 compensado, compositor alinhado ao viewport visivel e placeholder 14px.
- Simulacao de panning no Chrome nao equivale a validacao do teclado nativo do iPhone.
- Harness de playback atualizado com imports atuais e validade de uma hora para evitar overflow de setTimeout com data ficticia em 2099.
