# ADR-0657 - Consistencia visual do perfil com Lectum

Date: 2026-10-30
Status: Accepted
Task: TASK-292

## Contexto

O perfil publicado apresentou quinas quadradas, tipografia de controles
inconsistente e recorte de descendentes no texto do contato.
O reset global button { font: inherit } prevalece sobre utilitarios em layers.
Alterar esse reset impactaria todas as telas.

## Decisao

Reutilizar o RelationshipButton compacto do feed e o raio inferior de 28px
do header da comunidade. Manter o CTA principal em 44px; dar ao texto linha
de 22px e padding vertical de 2px. Nao alterar o reset global.

Separar alvo de toque de 44px da capsula verde de 34px no header fixo.
Nome de 15px/20px, icone de 18px e chevron com handler onBack existente.
Preservar observador do CTA e estado inert do header oculto.

Substituir capsulas das abas por tres colunas iguais com linha ativa de 2px.
Aplicar tipografia em spans para evitar o reset dos botoes. Preservar
semantica de tabs, teclado, contadores e links existentes.

## Consequencias

Mudanca restrita ao perfil, sem alteracao de contato, analytics ou permissao.
Validar fonte computada, dimensoes, nomes longos, teclado e scroll no browser.
Chromium emulado nao substitui verificacao final em Safari fisico.
Publicacao depende de nova autorizacao; nenhum deploy automatico.

## Refinamento de 30/10/2026

A pedido do usuario, remover a sombra do hero preservando suas quinas
inferiores de 28px. O header fixo continua condicionado ao WhatsApp disponivel:
o perfil de teste sem numero nao deve apresentar acao de contato ficticia.
