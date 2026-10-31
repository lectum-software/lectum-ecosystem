# ADR-0663 - Continuidade dos reels entre comunidades

## Status

Aceito para implementacao local, sem autorizacao de deploy.

## Contexto

A fila encerrava ao terminar a fonte de posts. O usuario quer continuar para
outras comunidades e retornar ao mesmo reel ao voltar de um perfil. Tambem
solicitou progresso suave, avanco automatico e controles mais legiveis.

## Decisao

Reutilizar getCommunities/getCommunityPosts para descobrir discussoes somente
depois de esgotar a fonte no modo feed. Percorrer paginas e comunidades sob
demanda, excluir a comunidade de origem esgotada e deduplicar discussoes e
videos. O endpoint existente getPostContentVideos mantem a autoridade sobre
visibilidade, autor e midia pronta; seu cursor opaco nao muda.

Perfis e discussoes isoladas nao passam a recomendar outros profissionais.
Erros transitorios preservam a posicao e permitem retry; 403/404 de candidatos
removidos sao pulados, mas erros do catalogo nao sao ignorados. Desmontagem
descarta resultados tardios. Nao cria repeticao infinita quando o acervo acaba.

Guardar somente referencia e tempo do reel na entrada do historico de origem,
com rota, modo e conta. Preservar campos internos do Next. Voltar reconsulta a
API, sem guardar conteudo privado, tokens ou permissao em storage. Fechar
explicitamente limpa a referencia. Links em nova aba nao suspendem o player.

Desenhar progresso com requestAnimationFrame enquanto ativo/reproduzindo,
sincronizando busca e pausa. Remover loop e avancar no ended somente quando nao
ha interacao bloqueante. Manter as guardas de audio e os rascunhos existentes.
Camera gratuita recebe contraste escuro/branco sem liberar anexos do plano pago.

## Consequencias

Nao requer migration, variavel ou nova dependencia. Catalogo/posts usam a
paginacao existente, portanto novas publicacoes durante uma sessao podem mudar
paginas; deduplicacao evita repeticao, mas nao promete snapshot global imutavel.
A descoberta pode fazer leituras de discussoes que nao tenham video elegivel;
elas sao puladas, nunca substituidas por dados ficticios no produto.

QA usa somente fixtures locais e Chrome, sem dados ou envios produtivos.
