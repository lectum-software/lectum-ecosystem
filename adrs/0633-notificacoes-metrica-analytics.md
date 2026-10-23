# ADR-0633 - Notificacoes selecionam a metrica dos Analytics

Status: Accepted
Data: 2026-10-23

## Contexto

Avisos de favorito e visualizacao de perfil abriam Analytics na metrica padrao.
O usuario pediu acesso direto ao indicador correspondente.

## Decisao

Normalizar redirects in-app no helper existente, inclusive avisos historicos,
usando metric=favorites_received e metric=profile_views. Preservar pushes.
Frontend aceita metric por allowlist independentemente de restore; restore
continua exclusivo para restauracao de periodo e scroll.
Reiniciar estado ao trocar a metrica da URL e revelar o contador no carrossel
horizontal, sem scroll vertical. Voltar permanece no historico real.

## Consequencias

Sem reescrita de notificacoes, mudanca de contagens ou permissao de assinatura.
Contrato aditivo e rollback por codigo. Links invalidos usam WhatsApp.
