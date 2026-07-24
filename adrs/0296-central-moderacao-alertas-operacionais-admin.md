# ADR-0296: Central Admin de moderação textual, denúncias e alertas operacionais derivados

## Status

Accepted

## Task relacionada

TASK-77

## Contexto

A rota Admin `/moderacao` já existia como central de moderação textual determinística da TASK-74. O produto decidiu que a mesma área deve concentrar também ações urgentes e alertas operacionais, evitando que o time precise alternar entre moderação textual, denúncias, detalhes de psicólogo e checagens manuais.

Os novos alertas precisam usar somente fontes reais já persistidas. As dimensões de demanda por região/cidade, faixa de preço e horários foram explicitamente excluídas do momento atual. Também não há integração externa para validar entrega real do WhatsApp ou provar que um link está quebrado fora da sintaxe armazenada.

## Decisão

- Manter um único endpoint `GET /api/admin/private/moderation/summary` e adicionar o bloco `operational_alerts`, em vez de criar uma segunda central ou novos endpoints V1.
- Tratar alertas operacionais como **derivados/read-only** nesta task: eles não são persistidos, não possuem workflow próprio de resolução e desaparecem quando a condição real deixa de existir.
- Usar as seguintes fontes first-party:
  - `post_report` para denúncias pendentes de posts/respostas;
  - `community_post`, `post_reply` e `user.role` para post de paciente sem resposta de psicólogo após 48h;
  - `psychologist_profile` e `professional_subscription` para CRP não aprovado em Plano Profissional ativo;
  - `psychologist_profile.whatsapp` para WhatsApp ausente/formato inválido;
  - `psychologist_profile` e relações de catálogo para perfil não publicado por configurações obrigatórias;
  - `profile_view_event` e `contact_request.channel=whatsapp` para psicólogo profissional publicado sem visitas e sem cliques após adaptação.
- Considerar o período inicial de adaptação do psicólogo profissional como 30 dias até existir parametrização específica de produto.
- Considerar CRP aprovado quando houver `crp_status="aprovado"`, `cfp_verified_at` ou cortesia profissional/admin grant reconhecida, preservando a regra já usada no detalhe administrativo do psicólogo.
- Validar WhatsApp apenas por presença e quantidade de dígitos suficiente para link `wa.me` (8 a 15 dígitos). A decisão não afirma disponibilidade externa do número.
- Alinhar “perfil não publicado por configurações obrigatórias” às exigências reais já usadas na publicação do perfil: vídeo, modalidade, especialidade, serviço, abordagem, público atendido, gênero, CPF, nascimento, CRP regional/número e cidade/UF; CRP aprovado também é exigido para plano profissional.
- Retornar explicitamente `excluded_dimensions` para registrar que região/cidade, faixa de preço e horários não se aplicam agora, sem gerar alerta falso.

## Consequências

- A tela de moderação passa a funcionar como cockpit operacional mais amplo sem duplicar navegação.
- O badge lateral de Moderação passa a representar eventos textuais pendentes + alertas derivados.
- Como os alertas são derivados, não há histórico de “resolvido” para cada alerta; a correção deve ocorrer na entidade real (denúncia, perfil, post, assinatura, métrica).
- A checagem de WhatsApp pode apontar apenas ausência/formato inválido; link realmente quebrado por número inexistente depende de integração externa futura.
- O summary de moderação fica mais caro do que antes porque agrega múltiplas tabelas. A V1 aceita esse custo por reaproveitar a chamada já existente; se volume crescer, separar paginação/cache por grupo de alerta será necessário.

## Validação

- `pnpm --dir backend typecheck`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- `Invoke-WebRequest http://localhost:3002/moderacao` retornou HTTP 200. Headless mobile gerou `.tmp/moderacao-mobile.png`, mas sem sessão Admin ficou no estado de carregamento autenticado; validação visual final dependeu de build/check e do dev server local autenticado aberto pelo usuário.

## Pendências

- Parametrizar thresholds de 48h e 30 dias se o produto quiser ajustes por comunidade/plano.
- Definir workflow de resolução/acknowledgement para alertas derivados caso o time precise histórico operacional.
- Integrar validação externa real de WhatsApp apenas se houver fornecedor/contrato aprovado.
- Reavaliar alertas de alta demanda em filtros quando houver fonte first-party persistida e quando região/preço/horário voltarem ao escopo.
## Complemento 2026-07-24: previews e páginas exclusivas por categoria

O cockpit `/moderacao` passou a ser a visão de resumo. Cada módulo mostra somente as 5 últimas pendências e o botão **Ver todos** abre uma rota exclusiva da categoria:

- `/moderacao/denuncias-compliance` lista denúncias pendentes e compliance profissional;
- `/moderacao/alertas-operacionais` lista somente pendências operacionais derivadas;
- `/moderacao/textual` lista eventos de moderação textual com filtros, detalhe protegido e ações auditadas.

Para não transformar o summary em uma listagem completa, foi adicionado `GET /api/admin/private/moderation/operational-alerts`, paginado e filtrável por grupo. O endpoint continua derivado/read-only, sem persistir alertas nem criar status de resolução próprio. O resumo mantém limite operacional de preview, enquanto as páginas exclusivas usam paginação.

A separação visual evita que pendências operacionais de oferta concorram com triagem crítica de denúncias/compliance, preservando a decisão original de não criar workflow próprio para alertas derivados.

## Complemento 2026-07-24: submenu de Moderação com cinco páginas

Após revisão de produto, a navegação de **Moderação** passou a ter cinco entradas explícitas no menu lateral: **Dashboard**, **Denúncias**, **Compliance**, **Operacionais** e **Conteúdo sensível**. A rota `/moderacao` fica como dashboard/resumo; as demais rotas são páginas exclusivas de categoria.

A decisão substitui a rota combinada de denúncias/compliance planejada no complemento anterior. Denúncias e compliance precisam de leitura separada porque têm natureza operacional diferente: denúncias são triagem de conteúdo reportado por usuários, enquanto compliance reúne pendências profissionais como CRP/WhatsApp.

O endpoint `GET /api/admin/private/moderation/operational-alerts` permanece derivado/read-only e passa a aceitar os grupos `denuncias`, `compliance` e `operacional`. Conteúdo sensível continua usando os endpoints reais de `content_moderation_event` em `/moderacao/conteudo-sensivel`.

## Complemento 2026-07-24: filtros dedicados em Denúncias

A página `/moderacao/denuncias` passa a tratar a lista como fila exclusiva de triagem de denúncias de posts/respostas, com cabeçalho mais direto (**Moderação**) e sem ações de navegação/refresh no header.

O endpoint derivado `GET /api/admin/private/moderation/operational-alerts` permanece sem persistir workflow próprio, mas agora aceita filtros opcionais para a fila de denúncias: busca textual (`q`), data (`from`/`to`), status não terminal (`pending`/`reviewing` legado), denunciante por papel seguro (`paciente`/`psicologo`) e motivo (`reason`). Os filtros são aplicados sobre alertas derivados de `post_report` já mapeados, preservando o princípio de dados reais e sem expor dados pessoais do denunciante além do papel necessário para triagem.
