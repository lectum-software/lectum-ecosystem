# TASK-306 - Identidade na resposta e escala dos controles de video

## Escopo

Referencias: capturas enviadas pelo usuario em 31/10/2026, 23:51 e 23:56, e 01/11/2026, 00:20 e 00:21. Ajustes locais em homolog, sem push/deploy. Builder indisponivel; reutilizar componentes atuais e capturas do usuario.

## Aceite

- [x] Meus Depoimentos identifica o proprio profissional com nome, avatar, titulo e selo elegivel, sem Sua resposta; preservar editar/excluir.
- [x] Identidade disponivel mesmo quando o perfil nao esta publicado no diretorio.
- [x] Acoes do video em 22px, WhatsApp em 20px dentro de circulo de 36px no mobile, preservando alvo de toque de 44px.
- [x] Pagina de psicologos usa a mesma escala nas acoes equivalentes.
- [x] Posts de texto/imagem dentro do perfil sem WhatsApp na barra de acoes e sem contador de salvos; manter salvar, WhatsApp do cabecalho e comportamento do feed/videos/respostas.
- [x] Nome e selo no header fixo seguem peso font-black, leading-tight e gap-1 do feed, com nome text-base e selo de 1rem, preservando ajuste de nomes longos e fonte raiz responsiva.
- [x] Testes, check/build e QA local mobile/desktop aprovados.

## Decisao

Complementa ADR-0666. Identidade do proprietario vem do perfil privado ja existente, nao da disponibilidade no diretorio publico. Sem nova API ou mudanca de permissoes. Escala visual diminui sem reduzir area de toque. Validar controles de edicao e exclusao, nomes longos e tamanho computado dos icones.

## Evidencias locais - 0.1.767

- Chrome real com API e PostgreSQL locais em 390, 320 e 1440px: identidade propria com perfil nao publicado; editar e excluir abrem e cancelam normalmente; salvar/remover executam a mutacao real nos posts de texto/imagem sem contador; WhatsApp preservado no feed.
- Dimensoes computadas: 22px acoes e 20px WhatsApp em reels/diretorio; circulo mobile 36px. Header com peso 900, gap 0.25rem, fonte e selo 1rem, sem sobreposicao ao CTA. Nomes longos testados; na resposta propria os controles podem quebrar para outra linha.
- Capturas .tmp/task306-{own-response,profile-photo,profile-text,sticky,reels,directory}-{390,320,1440}.png; inspecao visual mobile e desktop. Resultado .tmp/task306-browser-results.json com errors vazio e cleaned true. Nenhum dado produtivo alterado.
- Regressao de depoimentos: 27 testes aprovados, um teste opcional existente ignorado. Casos de plano gratuito, sem aprovacao, CFP, cortesia, perfil em cache de outro usuario, foto removida e fallback autenticado cobertos.
- check:version aprovado nos cinco manifests. Bump unico de 0.1.766 para 0.1.767.
- Check frontend integral e build webpack final aprovados; limpeza de source maps executada, sem mapas inline ou arquivos de mapa remanescentes. Logs .tmp/task306-check-final.log e .tmp/task306-build-verified.log.
- Safari/iPhone fisico nao validado. Sem push/deploy.

## Complemento de release - 0.1.768

- Usuario autorizou publicacao em 01/11/2026 e confirmou gatilhos desligados nos provedores. Publicar somente Frontend; demais apps possuem apenas bump de manifest.
- Primeiro pre-push bloqueado por source-size: CommunityPostCard tinha 701 linhas para limite de 700. Checks de frontend/backend/admin/video aprovados, mas nada enviado.
- Condicao de exibicao do WhatsApp nomeada antes do JSX, mantendo a mesma expressao booleana e sem afrouxar o limite. Teste focal confere a conexao entre condicao e CTA.
- source-size, ciclos, ADRs, check:version e nove testes focais aprovados. Build webpack 0.1.768 e QA real repetidos em 320/390/1440 com errors vazio e cleaned true; logs .tmp/task306-release-build.log e .tmp/task306-release-browser.log. Limpeza de source maps concluida. Hooks completos serao repetidos no push; sem migracao ou variavel nova.
