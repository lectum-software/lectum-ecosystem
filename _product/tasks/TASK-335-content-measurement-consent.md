# TASK-335 - Consentimento antes de medir conteudo

| Campo | Valor |
| --- | --- |
| Status | Em andamento |

Corrigir as pendencias observadas no smoke da TASK-333 sem ativar CAPI ou considerar o IP verificado.

- [x] Preferencias opcionais novas desmarcadas.
- [x] Video e atencao usam a fronteira de consentimento existente.
- [x] Recusa impede identificacao e envio; nova aceitacao nao recupera o intervalo recusado.
- [x] Checks e build locais aprovados.
- [x] Interface real local validada em 390/1440px.
- [ ] PR revisado e publicacao com smoke produtivo.

ADR-0700. Referencia visual: painel existente mostrado pelo usuario; nenhuma mudanca de layout. Builder indisponivel nesta sessao. Teste isolado dos hooks usa React real e transporte instrumentado; nao substitui o smoke com a API local real. Sem migration/env/dependencia nova. Risco: metricas de conteudo passam a depender de consentimento. Rollback por PR; manter gates Meta false. IP autenticado/IPv6 ainda pendentes na TASK-333.

Validacao local: interface contra API real em 127.0.0.1:4140, sem respostas simuladas, comprovou seletores opcionais desmarcados, recusa persistente e zero requisicoes opcionais em 390/1440px. Capturas inspecionadas sem overflow. Harness dos hooks reais e verificador de escopo cobriu ausencia de identificador, aceite, recusa, keepalive, reaceite e renovacao sem flush da autorizacao anterior. Suite de privacidade: 25 testes aprovados.

Build final 0.1.829 aprovado; smoke repetido contra o artefato compilado e API local real aprovou novamente 390/1440px, zero requisicoes opcionais e persistencia da recusa. A primeira rodada geral foi interrompida por DATABASE_URL ausente; repeticao usa somente PostgreSQL local 127.0.0.1:55443. As primeiras tentativas intermediarias de build/refatoracao falharam e foram corrigidas; a evidencia final e .tmp/consent-build-reviewed.log. Teste dos hooks: PLAYWRIGHT_MODULE apontando a dependencia local, node frontend/scripts/media-consent-browser-smoke.mjs. Nenhum envio Meta ou acao de usuario real foi usado para testar.


Gates finais: guards de raiz e check completo frontend aprovados; backend completo repetido com DATABASE_URL e JWT_SECRET_KEY locais aprovou 1533 testes, 57 skips, zero falhas. Admin check aprovado; video check aprovado (100 pass, 16 skips). Nenhum check foi desabilitado. Build frontend e smoke do artefato final aprovados. Autodeploys homolog/preview permanecem conforme confirmacao do proprietario registrada na TASK-334; esta mudanca nao toca workflow Cloudflare. Push/PR autorizado pelo pedido de executar o plano de correcao e publicacao.
