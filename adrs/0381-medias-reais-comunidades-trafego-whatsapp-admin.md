# ADR-0381 - Medias reais de analises das comunidades no trafego WhatsApp Admin

## Status

Accepted

## Contexto

Na TASK-117, a tabela **Origem do trafego para psicologos** do Admin passou a precisar exibir, nas sublinhas de Comunidades, analises reais de padrao da plataforma em vez de descricoes de CTA. O usuario refinou a regra para que os valores sejam medias por conteudo e para que a metrica de video `Tempo total assistido` seja substituida por `Visibilidade media`, tambem presente em posts e respostas sem video.

A base de dados ja possui fontes first-party suficientes para isso: conteudos da comunidade, pageviews, sessoes de atencao, sessoes de video, votos, salvamentos, compartilhamentos e comentarios. Nao ha necessidade de migration, backfill, seed ou integracao externa.

## Decisao

1. O contrato do dashboard Admin de psicologos passa a expor `platform_metrics` opcional em cada fonte da tabela de trafego WhatsApp.
2. Apenas as subfontes de Comunidades recebem metricas analiticas neste escopo; Ranking Top Mentores e demais linhas continuam com descricao textual.
3. As metricas quantitativas de eventos sao calculadas como **media por conteudo publicado na categoria ate o fim do periodo selecionado**, usando eventos reais dentro do periodo selecionado.
4. `Visibilidade media` usa `content_attention_session.attention_seconds` dividido pela quantidade de conteudos da categoria.
5. `Retencao media` permanece exclusiva de posts/respostas com video e usa a media real de `watched_seconds / duration_seconds`, limitada a 100%, sobre sessoes com duracao positiva.
6. `Acessos ao perfil` e atribuido de forma deterministica quando uma pageview de perfil do psicologo ocorre na mesma sessao em ate 30 minutos apos uma pageview de conteudo desse autor.
7. O id antigo planejado `total_watch_time` nao faz parte do contrato final; o contrato usa `average_visibility`.
8. Categoria sem conteudo publicado retorna `value: null` nas metricas, permitindo a UI mostrar `Sem dados` sem inventar numeros.

## Consequencias

- A UI deixa claro o padrao medio de desempenho por tipo de conteudo, sem inflar categorias com maior volume bruto.
- O Admin continua baseado em analytics first-party auditaveis e sem dependencias externas.
- As medias podem ser fracionarias; o frontend usa formatacao `pt-BR` e segundos arredondados para exibicao.
- A metodologia de acesso ao perfil e uma inferencia deterministica baseada em sessao, nao uma causalidade perfeita; essa escolha evita criar tracking novo ou backfill.
- Como nao houve schema/migration, `pnpm --dir backend db:migrate` nao se aplica.

## Task relacionada

- `_product/tasks/TASK-117-medias-reais-comunidades-trafego-whatsapp-psicologos-admin.md`

## Validacoes

- `pnpm --dir backend biome:fix`
- `pnpm --dir admin biome:fix`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --dir admin build`
- Script `pnpm --dir backend exec tsx` para validar retorno real da API com medias, `average_visibility` e ausencia de `total_watch_time`.
- Browser local desktop e mobile ~390px via CDP em `http://localhost:3002/psicologos`.
- `pnpm check`
