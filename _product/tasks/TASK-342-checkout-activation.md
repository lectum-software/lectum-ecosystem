# TASK-342 — Configuração local de InitiateCheckout

- [x] Configurar captura e resolver com a identidade Stripe live do servidor e origem canônica da tela de cobrança.
- [x] Habilitar InitiateCheckout separadamente de Subscribe.
- [x] Capturar navegador somente para psicólogos com escolha explícita vigente e sem encerrar sessão em falha opcional.
- [x] Incluir User-Agent validado no payload, sem IP, valor de compra ou conteúdo de usuário.
- [x] Cobrir confirmação, processamento, conclusão, conta divergente, revogação e repetição sem duplicação.

ADR-0707. Configuração usa variáveis já existentes; conta ausente/inválida, ambiente test/local/homolog ou gateway diferente desativam captura e resolver. Sem migração, cobrança, envio externo ou publicação nesta task.

Rollout autorizado posterior: backend primeiro e frontend depois. Consumidores antigos tolerados; frontend novo com backend antigo recebe captura desativada. Não ativar Subscribe nem repetir eventos históricos. Após publicação, validar novo checkout consentido e estado da fila/recebimento Meta sem confundir início de checkout com pagamento.

Limitação: somente a captura de configurações fornecida pelo usuário confirma presença das credenciais; sua validade e o recebimento de InitiateCheckout na Meta ainda dependem da validação em produção.

Validação local: 41 testes direcionados backend e 5 frontend aprovados; repetição final das três integrações PostgreSQL e política de runtime passou sem skips. Suíte geral backend: 1534 aprovados, 58 ignorados, zero falhas. Backend build e frontend check completos aprovados. Checks de versão, ciclos, fontes, tamanho, ADRs, tasks, encoding e segredos aprovados. Versão local 0.1.837.
Build frontend de produção aprovado. Sem publicação ou prova de recebimento externo nesta execução.
