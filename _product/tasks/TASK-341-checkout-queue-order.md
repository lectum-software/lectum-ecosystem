# TASK-341 — Contexto antes da fila de checkout

- [x] Remover enfileiramento antecipado do serviço financeiro.
- [x] Persistir contexto e referência de entrega na mesma transação quando envio estiver habilitado.
- [x] Impedir recuperação de checkout sem contexto vigente.
- [x] Validar captura inválida, repetição concorrente e deduplicação em PostgreSQL local.

ADR-0706. Pré-requisito para ativação de InitiateCheckout; políticas continuam desativadas. Nenhuma cobrança, chamada externa, push ou deploy.

Evidência de produção fornecida pelo usuário: gateway stripe, ambiente live, presença de conta/chaves/webhook e META_CAPI_ENABLED=true. Presença não comprova validade das credenciais. Ainda faltam configuração das políticas de captura e entrega e validação externa. Subscribe permanece separado.

Validação: três integrações PostgreSQL aprovadas; backend check com 1533 testes aprovados, 58 ignorados e nenhuma falha. Checks de versão, ADRs, tasks, fontes, tamanho, ciclos, segredos e encoding aprovados. Versão local 0.1.836.
Build backend aprovado.
