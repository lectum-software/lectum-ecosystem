# TASK-346 — Primeira assinatura paga na Meta

## Escopo
O proprietario confirmou em 22/11/2026 que a Meta liberou Subscribe para Lectum | Web. Preparar a ativacao para primeiro pagamento Stripe live verificado, com consentimento vigente, sem cobrar durante a implementacao.

## Criterios
- [x] Politica de entrega vinculada a conta Stripe live e aviso publicado.
- [x] Navegador do contexto consentido acompanha o payload; sem dados de cartao ou conteudo clinico.
- [x] Consentimento do checkout funciona sem campanha/UTM.
- [x] Historico gratuito canonico nao impede upgrade; contratos financeiros desconhecidos continuam bloqueados.
- [x] Corte temporal impede envio retroativo; deduplicacao financeira persistida preservada.
- [x] Checks, build e integracoes locais aprovados.

## Publicacao
Sem nova variavel, migracao ou alteracao visual. Atualizacao de backend. Sem push/deploy nesta preparacao. Teste real de pagamento somente depois da publicacao; nao confundir validacao local com recebimento Meta.

## Evidencias
Backend: 1535 testes aprovados, 60 integracoes opcionais omitidas na suite geral, nenhuma falha. Integracao PostgreSQL executada separadamente: historia financeira, plano gratuito, pagamento novo sem campanha, fila unica, contexto do navegador, revogacao e corte temporal. Build 0.1.841 e guardas do repositorio aprovados. Sem rede Meta/Stripe ou cobranca.
