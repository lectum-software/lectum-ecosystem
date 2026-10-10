# ADR-0580 - Ordem global de publicacoes por votos e comentarios

## Contexto

A lista do perfil une posts e respostas, ordena por data e so entao pagina.
O usuario pediu mais votos primeiro, comentarios como desempate, em ambos os
tipos; autorizou alterar o endpoint backend, sem alterar banco.

## Decisao

Substituir somente o comparador da lista unificada: upvotes_count decrescente,
comentarios decrescentes, createdAt decrescente e ID decrescente. Manter a data
como desempate secundario preserva previsibilidade entre paginas.

Posts usam replies_count; respostas usam a contagem de filhos nao excluidos ja
carregada. Nunca usar engajamento do post pai para promover uma resposta. A
previa destacada mantem seu score existente: nao faz parte da ordem da lista.
Colocar o comparador puro no suporte existente profile-response, sem criar
nova camada nem alterar a API. Ordenar antes do slice, nao no frontend.

## Consequencias

Sem consultas adicionais, alteracoes no schema, backfill, env ou dependencias.
Mesmos campos, filtros, contadores e paginacao HTTP; frontend antigo compativel.
Nao mudar semantica de votos negativos, salvamentos ou ranking de mentores.
Validar prioridade, empates, metricas de respostas, ordem antes da paginacao e
dados reais por leituras da API local; nenhum seed ou mock de endpoint.
Rollback somente do backend. Publicacao separada das outras aplicacoes.

## Evidencia

Backend check (876/876), Prisma validate, TypeScript/Biome e build 0.1.614
aprovados. Cinco testes focais cobrem prioridade e wiring anterior ao slice.
Comparador exercitado com tres publicacoes reais de cinco perfis da API local,
sem escrita. Limite: ainda nao houve smoke do endpoint implantado com esta revisao.
