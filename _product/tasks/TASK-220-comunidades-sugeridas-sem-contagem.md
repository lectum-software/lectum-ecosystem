# TASK-220 - Comunidades sugeridas sem contagem

Data: 2026-10-06.

## Escopo

Renomear o carrossel para Comunidades sugeridas no inicio e no final das
comunidades. Remover a contagem de posts dos cards, ajustando a altura de 232px
para 208px sem mudar avatar, largura, hint do proximo card ou botao Seguir.
Preservar exclusao da comunidade atual e das comunidades ja seguidas.
Referencia: codex-clipboard-9f76e84d-30f1-4ac8-8a0d-c45d094c043d.png.
Arquitetura e PROTO-INVENTORY consultados. Builder indisponivel; referencia do
anexo e componentes existentes. ADR-0560.

## Criterios de aceite

- [x] Titulo Comunidades sugeridas compartilhado entre inicio e comunidades.
- [x] Cards sem quantidade de posts e sem espaco vazio equivalente.
- [x] Carrossel existente permanece apos o ultimo post nas comunidades.
- [x] Usuario confirmou inclusao ao final de Oportunidades; remover exclusao por sort.
- [x] Check, build e layout mobile/desktop verificados.
- [ ] Deploy de homologacao e limitacoes do smoke registrados.

## Deploy

Frontend somente. Sem backend, banco, env ou package novo. Push em homolog
publica homologacao; producao depende de pedido explicito. Rollback por reversao
revisada. Nenhuma escrita de dados reais durante os testes.

## Validacao antes do push

Check frontend completo e build Next aprovados. Nove testes direcionados do
carrossel passaram; guards de versao, ADR, tasks, encoding e source-safety OK.
Build local configurado com API publica de homologacao. O executor bloqueou
o comando de iniciar o servidor local mesmo apos permissao de rede; nao houve
smoke completo da navegacao nem autenticacao como psicologo.
Chromium com componente real SSR, CSS do build e comunidades reais de homolog
passou em 320/390/1440px: cards de 208px, imagens carregadas, sem sobreposicao ou
overflow da pagina, rolagem por teclado e hint do proximo card preservados.
Oportunidades coberto pela integracao e remocao da exclusao por sort; o carrossel
continua condicionado ao fim conhecido da paginacao, sem busca ou erro.
Evidencias externas: outputs/community-carousel-0592-layout-* e JSON correspondente.
