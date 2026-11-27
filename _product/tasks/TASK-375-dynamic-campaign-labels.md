# TASK-375 - Nomes de campanha sem catalogo no GA4

Status: Concluida localmente

## Escopo
Atender ao pedido de aceitar novas campanhas sem mudar o codigo a cada nome. Substituir o catalogo de utm_campaign e utm_content por validacao de identificadores de marketing (1 a 100 caracteres ASCII alfanumericos, hifen e sublinhado; primeiro caractere alfanumerico). Canais conhecidos, click IDs e referrer seguem a politica existente.

## Aceite
- [x] Campanhas e anuncios novos de Meta/Google chegam a config e page_view sem catalogo.
- [x] Valores vazios, duplicados, e-mails, URLs, espacos, controles e valores extensos sao descartados.
- [x] Consentimento, revogacao, deduplicacao e URL canonica sem caminhos permanecem.
- [x] Suite de privacidade: 58 testes aprovados.
- [x] Check frontend e build aprovados.

ADR-0739. Sem mudanca visual, dependencias, banco ou envs. Validacao de formato nao identifica semanticamente PII: operadores devem usar nomes de marketing sem dados pessoais ou clinicos. utm_term e queries livres continuam excluidos. Rollback: reverter commit e republicar frontend. Sem correcao retroativa.

