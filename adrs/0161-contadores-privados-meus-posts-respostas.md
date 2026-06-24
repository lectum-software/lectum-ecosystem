# ADR-0161: Contadores privados em Meus posts e respostas

Data: 2026-06-23
Status: Aceita

## Contexto

Downvotes e compartilhamentos nao devem ser expostos como metrica publica nos cards da comunidade. A decisao de produto e mostrar esses contadores somente para psicologos quando eles analisam o proprio conteudo na tela `Meus posts e respostas`.

## Decisao

`CommunityActionBar` passa a aceitar contadores opcionais de downvote e compartilhamento. Por padrao, esses valores nao sao renderizados.

A tela `/app/posts/mine` faz opt-in explicito desses contadores apenas para posts e respostas cujo autor tem `role === "psicologo"`. Feed publico, comunidade, detalhe do post, itens salvos e perfil do psicologo continuam sem passar esses dados para a action bar.

Posts usam `downvotes_count` e `sort_metrics.shares_count` quando a metrica esta disponivel no contrato. Respostas usam `downvotes_count`; compartilhamentos de respostas permanecem preparados visualmente com `0` ate a API expor um contador persistido especifico, sem tornar a metrica publica em outros contextos.

## Consequencias

- Psicologos gratuitos, assinantes, cortesias e verificados podem ver contadores extras apenas no proprio painel `Meus posts e respostas`.
- Pacientes e telas publicas nao passam a ver downvotes ou contador de shares.
- A action bar continua compartilhada, mas a exposicao dos contadores depende de opt-in explicito do contexto.
- Um ajuste futuro de contrato pode substituir o fallback de compartilhamentos por metrica real sem refazer os componentes.
