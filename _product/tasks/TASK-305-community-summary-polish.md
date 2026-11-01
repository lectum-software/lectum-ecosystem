# TASK-305 - Selos, avatares e contagens do expansor

## Escopo

Referencia: captura do perfil de Lana enviada em 31/10/2026, 23:41. Ajuste local, sem push/deploy autorizado neste lote. Reutilizar o expansor da TASK-303; nao alterar dados, ranking ou API. Builder nao disponivel nesta sessao; captura do usuario e componente publicado sao as referencias.

## Aceite

- [x] Cabecalho mostra uma medalha por posicao existente, ordenada Top 1/2/3; repeticoes nao ocultam outra posicao.
- [x] Lista preserva o selo e a posicao de cada comunidade.
- [x] Avatar sem contorno/moldura; imagem mantida em 48px e selo na quina inferior direita.
- [x] Omitir parcelas zeradas nas contagens do cabecalho e da lista; singular/plural preservados e ambos zero omitem a linha.
- [x] Preservar tipografia, foco acessivel e tres comunidades visiveis com rolagem.
- [x] Testes focais, check/build frontend e QA local mobile/desktop aprovados.

## Decisao

Complementa ADR-0666: deduplicar apenas a apresentacao dos ranks no cabecalho, nao as comunidades. Reutilizar o formatador de atividade no resumo e nas linhas. Manter compatibilidade com APIs sem contagens por comunidade, sem inventar zeros. Caso ambos os totais sejam zero, omitir a linha sem exibir um sufixo isolado. Sem dependencia, migration ou env nova.

## Evidencias locais - 0.1.766

- Sete testes de profile-refinements aprovados, incluindo ranks 1/1/2 e 2/2/3, singular/plural, ambos zero e o caso solicitado de 18 respostas no total. Suite incluida no comando test:profile-hero.
- Check completo e build frontend aprovados; check:version sincronizado nos cinco manifests; remocao de source maps concluida.
- Chrome real com API e PostgreSQL locais: 390, 320 e 1440px. Cinco comunidades e 18 respostas, sem posts, confirmam deduplicacao, contagens, avatares sem moldura, nomes longos e tres linhas completas com rolagem interna. Nenhum pageerror ou HTTP 500.
- Capturas inspecionadas: .tmp/task305-expanded-{390,320,1440}.png. Resultados: .tmp/task305-browser-results.json; errors vazio e cleaned true. Perfis, comunidades e publicacoes temporarios removidos ao final.
- Ajustes iniciais no teste: completar video obrigatorio do perfil temporario e aguardar carregamento do resumo. Nao exigiram alteracoes adicionais no produto.
- Safari/iPhone fisico nao validado. Sem push, deploy ou alteracao de dados de producao neste lote.
