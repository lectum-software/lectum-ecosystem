# TASK-307 - Dicas de uso respeitam a modal de acesso

## Escopo

Corrigir clique da dica de publicar para visitantes, no feed e na comunidade. Reutilizar a modal existente com Criar conta, Fazer login e Continuar explorando, sem navegar antes da escolha. Trabalho local em homolog, sem autorizacao de push/deploy neste ajuste. Builder indisponivel; referencia visual e de fluxo e a modal atual, sem redesenho.

## Aceite

- [x] Clique e teclado na dica abrem a modal para visitante, mantendo URL/contexto.
- [x] Continuar explorando fecha a modal sem navegar; login/cadastro somente apos escolha explicita, preservando retorno.
- [x] Usuario autenticado continua abrindo o compositor existente.
- [x] Dicas auditadas sem caminhos alternativos diretos para login/cadastro; busca e WhatsApp publicos preservados.
- [x] Regressao automatizada, checks/build e QA mobile-first (390, 320 e 1440px).

## Investigacao

Chrome local, sessao anonima nova, API real local: clique em Criar publicacao agora no feed navegou para `/auth/login?callbackUrl=%2Fapp%2Fcomunidades%2Ffeed%2Fpublicacao%2Fnova`, sem modal. Listener nativo em captura desmontava o link antes do onClick React que intercepta a navegacao. Evidencia inicial: .tmp/task307-repro.log; repeticao corrigida em .tmp/task307-fixed.log e capturas task307-tip-before/after.png.

## Decisao

ADR-0668. Executar a acao protegida antes de fechar a dica, impedir navegacao nativa e exigir callback. Listener global de fechamento em bubbling, depois dos handlers React. Demais dicas apenas destacam o controle real: busca/WhatsApp publicos, resposta e video de perfil em contextos autenticados. Sem API, banco, permissoes, dependencias ou variaveis novas.

## Evidencias locais - 0.1.769

- 57 testes focais de navegacao/conversao aprovados, incluindo guards de listener em bubbling, callback obrigatorio e consumidores do feed/comunidade.
- Chrome real com API/PostgreSQL locais: seis cenarios anonimos (feed/comunidade em 390, 320 e 1440px), por clique e Enter. Modal com tres escolhas, continuar sem navegar, reabertura pelo botao normal, login/cadastro explicitos com retorno contextual preservado.
- Dois cenarios autenticados (feed/comunidade): dica abre Criar Post, sem modal de acesso e sem mudar URL. Fixtures temporarias removidas no finally; nenhum dado produtivo alterado.
- Relatorio .tmp/task307-browser-results.json: errors vazio, cleaned true. Capturas .tmp/task307-modal-{feed,community}-{390,320,1440}.png e task307-auth-{feed,community}.png. Inspecao visual mobile e desktop sem cortes ou overflow.
- Roteiro aguarda carregamento real apos voltar do login e usa preferencia de movimento reduzido na matriz, para estabilidade do botao flutuante; reproducao inicial tambem validada com animacao habilitada.
- Bump unico nos cinco manifests, de 0.1.768 para 0.1.769. Safari/iPhone fisico nao validado. Sem push/deploy.
- Check integral da raiz aprovado (.tmp/task307-check.log), incluindo frontend/backend/admin/video, tipos, lint e guards. Build webpack aprovado (.tmp/task307-build.log), com limpeza de source maps concluida e nenhum mapa inline remanescente.
- Build inicialmente bloqueado pelo limite local de disco; passou apos encerramento da previa liberar espaco temporario, sem excluir arquivos. Smoke do artefato confirmou /version 0.1.769, mas a API HTTP localhost foi rejeitada pela politica existente de origens em modo production. Nao houve bypass dessa protecao nem acesso a API produtiva; QA funcional realizado em next dev com API/PostgreSQL reais isolados. Previa de desenvolvimento restaurada em localhost:3104.
