# TASK-260 - Resumo semanal WhatsApp e Analytics

Status: Done

## Escopo

- [x] Pessoas estimadas por profissional/periodo: conta ou identificador anonimo existente.
- [x] Resumo segunda as 09h, semana anterior completa em America/Sao_Paulo, somente com acessos.
- [x] Notificacao interna/push pendente ate resposta; gratuitos e assinantes.
- [x] Modal automatica uma vez; X nao responde; apenas semana mais recente automaticamente.
- [x] Resposta inteira nao negativa editavel e vinculada a semana de origem.
- [x] Analytics: Cliques no WhatsApp e Pacientes adquiridos; ausencia distinta de zero.
- [x] Gratuitos: previa sem dados reais; upgrade direto ao checkout de cartao.
- [x] Admin: total e historico semanal por psicologo, origem declarada e pendencias.
- [x] Migration local, testes, checks, builds e validacao mobile/desktop.

Referencias: capturas/requisitos do usuario de 17/10/2026; PROTO-INVENTORY.md. Builder/Quick Copy indisponivel nesta sessao; usar componentes existentes e capturas.

Deploy: migration expansiva antes do backend; scheduler opt-in. Sem push/deploy nesta task. ADR-0622.

## Evidencias locais - 0.1.667

- `pnpm check` completo aprovado (inclui 923 testes backend); builds backend, frontend e admin aprovados. No admin, o build final foi repetido apos remover somente `.next/dev`, gerado pelo QA e contendo source maps de desenvolvimento. Verificacao de source maps de producao preservada e aprovada.

- Migration aplicada em PostgreSQL isolado `lectum_whatsapp_dev_20261017`, na porta local 55432. O banco de desenvolvimento anterior apresentou drift preexistente e nao foi resetado nem alterado.
- Integracao com banco real: deduplicacao de contas/anonimos, domingo incluido, segunda antes/depois de 09h, concorrencia sem duplicacao, ausencia de cliques, isolamento entre profissionais e gratuitos sem vazamento de metricas.
- Roteador HTTP real validado no envio de zero; fechamento sem resposta, pendencia protegida de leitura individual/coletiva, edicao posterior, historico antigo e agregacao administrativa exercitados.
- Navegador Chromium com API/banco reais: frontend em 320, 393 e 1440 px; modal automatica, X sem resposta, reabertura pela notificacao, envio zero, previa gratuita e Analytics assinante. Sem overflow horizontal nem erros JavaScript.
- Admin em 393 e 1440 px: indicador imediatamente apos WhatsApp dentro de Conversao, resposta real refletida e historico semanal expansivel; sem overflow da pagina. A tabela permite rolagem interna em telas estreitas.
- Dados e sessoes temporarios de teste removidos ao final. Nenhuma mutacao em ambientes publicados.
- Push real em dispositivo, Safari/PWA e aprovacao visual do usuario permanecem verificacoes de rollout; nenhum push externo foi disparado durante estes testes.

## Ativacao

1. Aplicar a migration expansiva no backend.
2. Publicar backend, frontend e admin; confirmar saude e autorizacoes.
3. Conferir Web Push e preferencias. Habilitar `WEEKLY_WHATSAPP_REPORTS_ENABLED=true` com `NOTIFICATION_DIGESTS_ENABLED` nao desativado.
4. Verificar geracao unica, entrega e resposta numa semana elegivel. A rotina inclui gratuitos e assinantes com pelo menos uma pessoa no periodo.

Nao existe deduplicacao retroativa confiavel para cliques anonimos antigos sem identificador. Pacientes adquiridos e dado declarado, nao confirmacao independente de atendimento.
