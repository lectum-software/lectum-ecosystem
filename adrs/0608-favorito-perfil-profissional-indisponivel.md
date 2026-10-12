# ADR-0608 - Favorito de perfil profissional indisponivel

## Status

Aceito.

## Contexto

Respostas de psicologos continuam visiveis na comunidade quando o perfil profissional
fica indisponivel. A acao de favoritar ainda era renderizada, mas o endpoint recusava
a operacao porque a elegibilidade exige conta ativa, perfil publicado e video de
apresentacao. Para favoritos anteriores, a pagina ja filtra esses perfis sem apagar
a relacao.

## Decisao

Expor no autor da comunidade o campo aditivo `favorite_available`, calculado com a
mesma elegibilidade da operacao de favorito: psicologo nao excluido, conta ativa,
perfil existente, nao excluido, publicado e com video de apresentacao. O frontend
oculta a acao quando recebe `false` e aceita a ausencia do campo durante rollout
misto.

Nao apagar a relacao de favorito quando houver desativacao ou indisponibilidade
temporaria. A pagina de Favoritos continua usando o filtro de elegibilidade existente,
portanto o card some sem perder o vinculo e retorna na reativacao. Exclusao de conta
mantem o comportamento destrutivo ja existente.

As regras independentes de diretorio publico, acesso ao perfil e mentoria nao mudam.
A referencia visual e o componente existente foram suficientes; Builder/Quick Copy
nao esta disponivel diretamente neste cliente e nao foi necessario criar novo design.

## Consequencias

A comunidade deixa de oferecer uma acao que falharia. Favoritos temporariamente
indisponiveis reaparecem sem intervencao do paciente. Backend e frontend mudam, mas
o contrato e aditivo, nao ha migration ou escrita de dados e os artefatos podem ser
publicados em qualquer ordem. Rollback por reversao revisada em `homolog`.

## Complemento 2026-10-12 - paridade entre feed e detalhe

O feed e o detalhe do post possuem seletores e serializadores de autor distintos.
A primeira implementacao cobriu apenas o feed, deixando `favorite_available`
ausente nas respostas carregadas pelo detalhe do post. A regra passa a ser
centralizada em um utilitario backend e consumida pelos dois serializadores.

O seletor do detalhe passa a carregar somente os campos necessarios para decidir a
elegibilidade: conta ativa/nao excluida e perfil existente, publicado, nao excluido
e com video. Respostas diretas e aninhadas usam o mesmo mapeamento recursivo.

A consulta da pagina de Favoritos tambem usa o mesmo fragmento de disponibilidade.
Ela continua apenas ocultando o card: nenhuma relacao existente e removida. A
mudanca permanece aditiva e backend-only, sem migration, env ou nova dependencia.

## Complemento 2026-10-12 - identidade de mentor indisponivel

A disponibilidade publica tambem condiciona `featured_badge`. Respostas historicas
continuam visiveis, mas deixam de apresentar `Top X mentor` enquanto o profissional
estiver indisponivel. A consulta do ranking aplica o mesmo predicado antes da
ordenacao; assim, o proximo candidato elegivel assume a posicao. Na reativacao, o
profissional volta a participar normalmente, sem alteracao destrutiva de dados.
