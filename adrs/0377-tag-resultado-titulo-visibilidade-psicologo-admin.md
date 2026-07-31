# ADR 0377 - Tag de resultado no titulo de Visibilidade do psicologo Admin

## Status

Accepted

## Contexto

O bloco de Visibilidade da aba Estatisticas do psicologo no Admin mostrava uma tag fixa `Unidade: tempo`, embora o operador precise enxergar rapidamente o resultado qualitativo da visibilidade do profissional no periodo selecionado.

## Decisao

O endpoint administrativo de estatisticas do psicologo passa a retornar `business.visibility.diagnosis`, calculado com dados reais do periodo:

- tempo de perfil via `page_view_event.duration_seconds` em perfil publico de psicologo;
- tempo em conteudo autoral via `content_attention_session.attention_seconds`;
- tempo do video de apresentacao via `profile_video_watch_session.watched_seconds`.

A classificacao reutiliza os limiares e percentis de `admin-profile-exposure` e agrega a visibilidade como conteudo de comunidade somado ao maior sinal entre perfil e video de apresentacao. O frontend Admin apenas renderiza o diagnostico recebido, com labels em sentence case e cores semanticas por categoria.

## Consequencias

- A tag do titulo de Visibilidade deixa de ser uma unidade tecnica e passa a comunicar o resultado operacional: Alta, Baixa, Sem, Padrao ou Dados insuficientes.
- O calculo permanece auditavel e derivado de tabelas reais de analytics, sem mock ou valor fixo.
- Nao ha alteracao de schema/migration; o diagnostico e calculado em tempo de consulta.
