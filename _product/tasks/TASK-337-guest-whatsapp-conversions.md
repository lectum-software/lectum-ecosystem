# TASK-337 — Contact de visitantes com consentimento

Autorização: proprietário confirmou inclusão de visitantes sem login em todas as superfícies WhatsApp, inclusive feed, em 22/11/2026.

- [x] Contrato aditivo com token de consentimento anterior ao clique, sem associação obrigatória à conta.
- [x] Outbox anônima vinculada ao consentimento; releitura de origem e consentimento na entrega; revogação elimina pendências.
- [x] Nenhuma conversão retroativa, nenhuma URL de conteúdo/destino ou identidade de profissional no payload Meta.
- [x] Migração, testes PostgreSQL reais, checks/builds e browser local.

Envio geral continua desativado (META_CAPI_ENABLED=false); IP não verificado continua omitido. Teste externo e recebimento Meta não fazem parte da evidência local.

Deploy: migração expansiva + backend antes do frontend. Rollback: frontend anterior e worker desligado; coluna opcional pode permanecer. Nenhuma variável nova. ADR-0702.

## Validação local

- Prisma migrate dev aplicado em PostgreSQL isolado (127.0.0.1:55443), sem reset.
- Integração HTTP/PostgreSQL real: consentimento prévio, deduplicação e troca de token, ausência/recusa/expiração/revogação/documento incorreto, origem não revisada, bloqueio após claim e exclusão da ação, retenção por cascade.
- Payload Contact sem IP, destino, conteúdo, identificador do profissional ou custom_data; envio geral desligado.
- pnpm check completo e builds backend/frontend aprovados.
- Edge local 390/1440: componente real compartilhado, API real e cadastro descartável; consentimento salvo com associação desligada, token enviado no clique. Endpoint local não é origem Meta revisada, portanto entrega foi validada separadamente pela integração HTTP. Sem mocks de API. Destinos externos bloqueados no browser.
- /health e /ready locais aprovados; página e registros temporários removidos. Cache de tipos dev da página temporária removido antes do build final.

Versão 0.1.831; commit local em homolog. Publicação e recebimento externo Meta continuam pendentes. O clique antigo sem login não foi convertido retroativamente.
