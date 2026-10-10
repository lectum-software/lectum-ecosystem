# ADR-0589 - Salvos reutiliza a apresentacao do feed

Data: 2026-10-10
Status: aceito; validacao em andamento

## Contexto
Salvos utilizava CommunityPostCard com presentation=feed, mas esse componente
mantinha ordem, divisoria e recuo diferentes do PostCard realmente usado no feed.
O usuario solicitou paridade com o feed atual (capturas mobile de 2026-10-10).

## Decisao
Reutilizar diretamente o PostCard existente na composicao de Salvos. Adicionar
apenas override tipado da acao salvar para manter a remocao e invalidacao da lista.
Nao duplicar JSX nem mudar apresentacoes de perfil/Minhas publicacoes.
Os contratos PostListPost e CommunityPost sao estruturalmente compativeis;
metadados opcionais ausentes continuam opcionais, sem fabricar dados.
Respostas salvas individualmente preservam suas acoes e destino focado, mas reutilizam
o cabecalho atualizado de producao (incluindo comunidade, favorito e acesso a pergunta), sem faixa Respondido em
nem divisorias. Midia usa o mesmo autoplay. Por definicao do usuario, Resposta profissional aparece
apenas na resposta destacada dentro de um post de paciente, nunca na resposta salva isoladamente.

## Validacao e referencia
Mobile-first, base 390px, mais desktop. Builder/Quick Copy indisponivel;
prototipo local Posts Salvos.jpg consultado, com refinamento atual definido pelas
capturas e pelo feed. Testes de regressao verificam reuse, ordem e override.
Evidencias finais serao registradas na TASK-28.

## Deploy e rollback
Somente frontend; sem novos packages, envs, migrations, jobs ou dados alterados.
Compatibilidade de API preservada; nenhuma ordem especial entre apps.
Rollback por reversao do commit do frontend. Sem push/deploy autorizado nesta task;
validar localhost sem iniciar builds remotos em homologacao.

## Reconciliacao e validacao local - 2026-10-10
Integrado o trabalho de producao do PR #100 sem perder o acesso a pergunta da resposta salva. Os 48 testes focais de apresentacao/acoes passaram; teste de Salvos separado para respeitar o limite de tamanho por arquivo. Build frontend concluido localmente. Usuario autorizou copia limitada de um post publicado, uma resposta em video e autores minimos para PostgreSQL isolado; origem consultada em transacao READ ONLY, sem escrita remota. Controle do navegador falhou ao reconectar; validacao visual do conteudo copiado permanece pendente, solicitada ao usuario. Nao houve push/deploy.

## Bloqueio de midia local confirmado - 2026-10-10
Check geral (exit 0) e builds aprovados. Browser local confirmou sessao e salvamento real de post e resposta separadamente; card de resposta contem votos, respostas, remover dos salvos e compartilhar, sem rotulo Resposta profissional. Contudo a referencia de video da resposta copiada aponta para video_asset ausente tambem no banco de origem (consulta READ ONLY por ID retornou zero registros). Nao fabricar asset, alterar status nem substituir por mock. O post local nao oferece preview profissional elegivel, logo ainda falta validar visualmente esse caso e reproducao. Copia adicional de outra publicacao nao realizada: autorizacao anterior limitou-se a um post/uma resposta. Publicacao deste lote permanece pendente dessa evidencia; nenhum push/merge/deploy.

## Segunda copia autorizada - 2026-10-10
Usuario autorizou mais um post/uma video-resposta com midia disponivel e autores minimos. Consulta READ ONLY na origem configurada nao encontrou exemplo elegivel. Contagens agregadas confirmaram zero video_assets ready, zero perfis com cfp_verified_at e zero respostas com URL legada posts/media. Nenhuma segunda copia efetuada. Isso descreve somente a origem configurada para desenvolvimento, nao prova indisponibilidade de videos em producao. Nao alterar verificacao profissional/status nem fabricar registros para satisfazer o teste. Necessario conteudo real com midia disponivel no ambiente isolado ou fonte adequada autorizada antes de concluir esse gate visual.

Usuario autorizou explicitamente producao como origem READ ONLY para o exemplo limitado. Tentativa de acesso ao Dokploy pela ferramenta de navegador falhou antes de conectar (erro de inicializacao da ferramenta). Nenhuma consulta ao banco produtivo, copia de producao, push ou deploy ocorreu. Autorizacao permanece registrada; nao solicitar novamente para o mesmo escopo. Retomar quando o acesso tecnico estiver disponivel, sem desativar protecoes nem extrair credenciais por alternativa nao autorizada.

## Conclusao da validacao local
Acesso ao Dokploy retomado. Copia minima autorizada de producao concluida em transacao READ ONLY e transporte criptografado; metadados minimos da habilitacao profissional preservam elegibilidade real. Nenhuma credencial produtiva copiada. Sem configuracao Stream local, foram copiados os bytes reais da midia publica autorizada, servidos apenas no localhost em arquivo ignorado; referencia local temporaria documentada, sem mocks. Browser 390x844 confirmou reproducao de 2:06, controles abaixo da resposta isolada, controles do paciente acima do destaque e rotulo somente no destaque. Check geral, 48 testes focais e builds aprovados. Publicacao autorizada pelo usuario, via PR apos verificacao dos provedores.
