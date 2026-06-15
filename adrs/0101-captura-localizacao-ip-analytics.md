# ADR 0101 — Captura aproximada de localização por IP para analytics

Status: Aceito

Data: 2026-06-15

## Contexto

O MVP web da Lectum precisa capturar região aproximada de visitantes e usuários para analytics interno, inteligência de mercado e dashboards futuros por cidade/estado/país. O requisito explícito é não usar GPS do navegador, não solicitar permissão de localização, não exibir modal e não bloquear navegação ou cadastro.

## Decisão

Implementamos uma captura silenciosa em background com endpoint público interno `POST /api/public/analytics/location-capture`.

- O frontend gera e persiste `visitor_id` em `localStorage` e `session_id` em `sessionStorage`.
- O backend resolve a localização por headers de proxy/CDN quando disponíveis e, como fallback, usa resolução server-side por HTTP configurável (`IP_GEOLOCATION_ENDPOINT`, padrão `https://ipapi.co/{ip}/json/`).
- O backend considera `cf-connecting-ip`, `x-forwarded-for` e `x-real-ip`, valida IP público e ignora IPs privados/locais.
- Quando a requisição traz token válido, o backend associa a captura ao `user_id` e vincula registros anônimos anteriores do mesmo `visitor_id`.
- A persistência fica na tabela `visitor_locations` e não armazena IP bruto, latitude ou longitude.
- A frequência é limitada no frontend e reforçada no backend para no máximo uma captura a cada 24h por visitante/usuário, com exceção do vínculo pós-login.

## Consequências

- A experiência do usuário não tem fricção: sem prompt, sem modal e sem bloqueio.
- Analytics futuros conseguem consultar visitantes e usuários por cidade, estado e país.
- A implementação evita novo package e mantém o provedor substituível por configuração.
- Em ambientes locais ou sem IP público/headers de geo, a captura falha silenciosamente e não afeta o produto.
- Antes de escala em produção, os limites e termos do provedor HTTP configurado devem ser revisados; a arquitetura permite troca sem mudar contrato do frontend.

## Privacidade

A política de privacidade deve informar que a Lectum pode usar localização aproximada derivada de IP para estatísticas, segurança e melhoria da plataforma. Não usamos GPS do navegador nem persistimos localização precisa.
