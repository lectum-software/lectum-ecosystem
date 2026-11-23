# TASK-347 - Reels, perfis, comunidades e aceite parcial

Status: validacao local para publicacao autorizada em 23/11/2026.

Consolida os ajustes locais antes numerados TASK-334 a TASK-342 no checkout
antigo. A numeracao deste checkout preserva as tasks de marketing ja publicadas.

- [x] Integrar por merge de tres vias sobre a versao 0.1.841.
- [x] Preservar integracoes de marketing, consentimento e pagamento publicadas.
- [x] Reels com URL compartilhavel, pagina publica e transcricoes em HTML.
- [x] Persistir legenda desativada e historico de videos ao visitar perfil.
- [x] Ajustar compositor de comentarios para teclado mobile.
- [x] Reduzir capas, avatar circular, contagem de posts e CTA de mentores.
- [x] Compactar CTA WhatsApp com alvo de toque preservado.
- [x] Remover textos solicitados no checkout e aceitar documentos pendentes.
- [x] Checks e builds completos do lote atualizado.
- [x] Smoke local com dependencias reais isoladas.
- [x] PR revisado e backend publicado antes do frontend.
- [ ] Smoke e versoes de producao confirmados.

Producao inicial: backend0.1.841, frontend0.1.840, health/ready HTTP200.
Sem migration nova neste lote. Autodeploys homolog/preview desativados conforme
confirmacoes registradas em LOCAL-TO-PRODUCTION.md. Nao alterar esses gates.
Rollback: frontend anterior primeiro; backend anterior apenas apos retirada
do cliente que envia aceite parcial. Dados e aceites existentes preservados.
Ver ADR-0712.

Evidencias locais: frontend check completo aprovado; backend build aprovado,
backend check com 1546 aprovados, 60 integracoes opcionais omitidas e zero
falhas. Frontend build aprovado. Browser/SEO: 72 testes aprovados sem skips;
fila apos extracao do harness: 36 aprovados. PostgreSQL local55443 e HTTP
local4140 validaram aceite inicial/parcial, preservacao do aceite anterior,
listagem/detalhe de video publico e bloqueio apos exclusao. Registros de teste
removidos; documentos legais do teste revertidos por transacao. Nenhum envio
Meta, pagamento ou mutacao de dados produtivos durante as validacoes.

PR190 publicou backend0.1.842, confirmado por ping/health/ready. PR191 publicou
frontend0.1.843. Smoke confirmou HTML, transcricao e reproducao, mas revelou
ausencia do host interativo nas rotas publicas de reel. Correcao complementar
monta ContentVideoHost nas duas entradas e mantem o fallback SSR indexavel.
O smoke final exige o dialogo de reels, nao apenas um elemento video visivel.
