# ADR-0665 - Elemento de midia persistente nos reels

## Status

Aceito.

## Contexto

A preferencia explicita ja era compartilhada, mas cada reel montava outro video.
Permissoes de autoplay podem ser por elemento; uma negativa fazia o reel tocar
mudo sem mudar a preferencia. Testes de play simulado nao cobriam continuidade
do elemento. O usuario aprovou a reutilizacao e a padronizacao dos cantos de reviews.

## Decisao

Um provider limitado ao viewer mantem um portal de midia com identidade estavel.
O container do portal acompanha o slot ativo sem recriar video; controles e
comentarios continuam no slide. Apenas o dono ativo recebe o ref e eventos de
midia. Reutilizamos resolucao de fontes, adaptador HLS e guarda de foco existentes.
Troca de fonte limpa a fonte anterior e reinicia tempo, inclusive URLs iguais.
Promises antigas nao podem pausar o elemento depois de perderem sua propriedade.
Ausencia temporaria de slide ativo estaciona e pausa o player, sem destrui-lo.
Fechar o viewer encerra esse ciclo; nao persistimos permissao falsa entre visitas.

O fallback mudo permanece somente para NotAllowedError; nunca altera a escolha
explicita. Nenhuma promessa de contornar politicas de autoplay do navegador.
Referencia: https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/

Listas e estados vazios de depoimentos usam 26px, como os blocos de conteudo do
perfil (modules/support.ts), e recortam o fundo dos itens nas quinas externas.
O token generico de 12px nao corresponde a esses blocos. Nao mudar o token global,
o contorno da modal, nem introduzir cards individuais/separadores arredondados.

## Consequencias e validacao

Somente a midia ativa e carregada pelo viewer; slides vizinhos preservam seus
controles, mas nao pre-carregam um segundo player. Inicio da proxima midia pode
depender da rede. Testar navegacao, progresso, pausa, autofocus, streams e eventos
tardios. Chrome local nao substitui validacao fisica de Safari/iPhone.

## Deploy e rollback

Frontend apenas. Sem schema, env ou pacote novo. Publicacao depende de autorizacao
separada; rollback pelo artefato frontend anterior, sem alterar dados. Sem push/deploy
durante esta task. Registros locais de QA temporarios devem ser removidos ao final.
