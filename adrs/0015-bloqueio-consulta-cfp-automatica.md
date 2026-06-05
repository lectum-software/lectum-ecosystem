# ADR-0015: Bloqueio da consulta CFP automatica

## Status

Accepted

## Task relacionada

TASK-10: Consulta CFP e resultado.

## Contexto

A TASK-10 previa uma jornada de consulta CFP/CRP por CPF com tela de entrada,
loading, resultado encontrado e resultado nao encontrado. As referencias visuais foram
consultadas pelas imagens locais:

- `_product/proto/Verificação de CPF - Consulta CFP.jpg`;
- `_product/proto/Carregando Consulta CFP.jpg`;
- `_product/proto/Resultado CFP - Variação em Cards.jpg`;
- `_product/proto/Resultado CFP - Não Encontrado.jpg`.

Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao foi
usado o fallback auditavel das imagens locais.

A TASK-03 e o ADR-0006 ja definiram que a consulta automatica CFP/CRP permanece
bloqueada ate existir fonte oficial, API contratada ou processo autorizado. A mesma
TASK-10 proibe mock, scraping nao autorizado e dado inventado.

## Decisao

- Nao implementar a consulta automatica CFP/CRP nesta execucao.
- Nao criar `POST /api/private/psychologist/cfp/search`.
- Nao criar `POST /api/private/psychologist/cfp/confirm`.
- Nao criar provider/interface CFP enquanto nao houver fonte/API definida.
- Nao criar `professional_registry_check`, porque nao ha payload real auditavel para
  persistir.
- Nao preencher `psychologist_profile.cfp_verified_at`.
- Manter o psicologo com `psychologist_profile.crp_status="pendente"` e
  `published=false`.
- Encaminhar a jornada para a validacao manual de CRP da TASK-11, desde que os
  requisitos de storage privado/R2 da propria TASK-11 estejam presentes.

## Consequencias

- A TASK-10 fica com status `Blocked`, nao `Completed`.
- Os criterios de aceite de implementacao permanecem sem marcacao completa.
- Qualquer tentativa futura de implementar consulta automatica CFP/CRP precisa primeiro
  registrar uma nova decisao com fonte/API autorizada, contrato de dados, limites,
  privacidade/LGPD e comportamento para registros nao encontrados.
- Sem fonte real, a UI nao deve exibir card com dados profissionais, situacao ativa,
  registro, regional ou data de inscricao.
- O fluxo manual de CRP continua sendo o caminho inicial do produto.

## Validacao

- Revisao manual de `_product/tasks/TASK-10-consulta-cfp-resultado.md`.
- Revisao manual de `_product/decisions.md`.
- Revisao manual de `DATA-MODEL.md` na secao `professional_registry_check`.
- Revisao manual de `adrs/0006-integracoes-externas-e-decisoes-pendentes.md`.
- `git diff --check`.

## Pendencias

- Fonte oficial, API contratada ou processo autorizado para consulta CFP/CRP automatica.
- Definir contrato do provedor, retencao do payload `raw`, limites de rate limit e
  fallback autorizado.
- Depois da decisao, retomar TASK-10 com endpoint, provider, schema e tela reais.
