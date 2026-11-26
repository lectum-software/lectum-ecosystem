# TASK-369 - Medicao Google com consentimento independente

| Campo | Valor |
| --- | --- |
| Status | Implementada localmente; ativacao pendente |

Integrar GA4 G-Q6FX22KLND para medir publicacao, contato WhatsApp, cadastro, inicio de checkout e primeira assinatura paga. Preservar integracao Meta.

- [x] Consentimento Google independente, explicito, revogavel e limitado ao navegador.
- [x] Tag bloqueada por padrao e fora dos hosts de producao.
- [x] Eventos sem texto, comunidade, identificadores de usuario ou URLs privadas.
- [x] Cadastro OAuth exige comprovacao de conta nova pelo servidor.
- [x] Assinatura exige comprovacao financeira existente, com consulta somente do titular.
- [x] Testes de consentimento, revogacao, minimizacao e falha de carregamento.
- [x] Checks por componente, verificacoes de repositorio e builds completos; falhas documentais corrigidas e retestadas.
- [x] Validacao visual local em 390/1440 px, persistencia e ausencia de chamadas Google em localhost.
- [x] Consulta financeira integrada com PostgreSQL real isolado, incluindo titularidade e evidencia adulterada.
- [ ] Validacao de ponta a ponta com provedores Google/Stripe apos publicacao autorizada.
- [ ] Publicacao autorizada e validacao GA4/Ads.

## Ativacao

1. Revisar ADR-0733. No fluxo GA4, desligar toda metrica otimizada antes de ativar a tag. Manter Google Signals e personalizacao de anuncios desligados.
2. No frontend Vercel Production, configurar NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-Q6FX22KLND e manter NEXT_PUBLIC_GOOGLE_ANALYTICS_ENABLED=false ate revisao.
3. Apos checks locais, PR revisado e autorizacao de producao, configurar ENABLED=true e reconstruir frontend. Publicar backend compativel antes; frontend tolera backend antigo sem contar assinatura.
4. Validar com consentimento explicito: page_view, forum_post, whatsapp_click, sign_up, begin_checkout e subscribe. Nao criar pagamento real apenas para teste.
5. Configurar forum_post e whatsapp_click como conversoes primarias no Google Ads; cadastro, checkout e assinatura como secundarias. Nao alterar Meta.
6. Rollback: ENABLED=false e novo build. Revogacao individual interrompe eventos e remove cookies Google conhecidos.

## Limites

page_view ocorre uma vez por documento/consentimento, com URL canonica e sem caminhos privados. Escolhas Meta antigas nao autorizam Google. Usuarios que ja decidiram Meta podem habilitar Google nas preferencias. A confirmacao de assinatura depende do mesmo navegador, checkout recente e recibo Stripe live verificado. Testes unitarios nao comprovam ingestao GA4, OAuth real ou pagamento integrado. Nenhuma alteracao externa foi realizada.

## Evidencias locais

- frontend check passou; 49 testes de privacidade passaram.
- Backend: tipagem, Biome e build passaram. Primeira execucao da suite ampla teve falhas por JWT de teste ausente e um timeout; todos os casos afetados passaram na repeticao com chave temporaria local.
- Frontend build passou com a integracao habilitada e destino local bloqueado para coleta.
- Admin e video checks passaram.
- Teste PostgreSQL real: banco novo lectum_google_test, 127.0.0.1:55449, migrations existentes aplicadas. Registrador real de primeira assinatura e consulta Google verificados; nenhuma chamada Stripe/Meta/Google, nenhum pagamento externo. Fixtures descartaveis removidas no finally.
- Runtime compativel encontrado em .tmp/node-v24.22.3-win-x64; validacao final usa Node 24.22.3. Execucoes iniciais usaram 24.16.0.
- Screenshots locais: .tmp/google-preferences-390.png e .tmp/google-preferences-1440.png. Builder nao estava disponivel; foi preservado o painel existente, consultado o inventario visual.
- Sem push/deploy. Configuracoes GA4/Ads permanecem pendentes.

Validacao final Node 24.22.3: frontend check passou; backend executou 1631 testes (1570 passaram, 60 opt-in pulados e uma falha de classificacao da nova env local). A classificacao foi corrigida e os cinco testes do template production passaram no reteste. O teste Google com PostgreSQL real passou tambem dentro dessa suite. Guardas de versao, secrets, encoding, ADRs, tasks, source safety, env, tamanho e ciclos passaram. Checks de admin/video e builds de frontend/backend haviam passado separadamente. Os testes opt-in pulados nao sao declarados como fluxos validados. Release local 0.1.873.
