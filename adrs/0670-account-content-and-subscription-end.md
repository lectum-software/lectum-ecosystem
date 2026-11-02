# ADR-0670 - Exclusao de conteudo e renovacao separada da vigencia

## Decisao

Status: implementado e validado localmente em 2026-11-02; sem push/deploy.

Cancelada identifica recorrencia encerrada; current_period_end preserva a vigencia
ja concedida para assinaturas Mercado Pago. Canceladas sem data nao concedem
beneficios. Nao estender datas usando retornos cancelados nem reativar por eventos
atrasados. Reusar consultas centrais de entitlement e restauracao do gratuito.

Exclusao de conta retira texto e midias do autor na mesma transacao, mantendo
apenas marcadores necessarios para respostas de terceiros. Fila aditiva de objetos
de storage permite repeticao idempotente sem depender de chamadas remotas dentro
da transacao. Capturar referencias antes de limpar; nunca aceitar URL arbitraria.
Somente novas exclusoes geram tarefas, sem backfill de contas antigas.

## Operacao e seguranca

Migration aditiva antes do backend. Fila vazia inicialmente. Tentativa direcionada
apos exclusao; retries periodicos opt-in ACCOUNT_MEDIA_CLEANUP_ENABLED=true, com
limites, lease por item e retry apos falha. Conferir namespaces antes de ativar.
Sem segredos novos. Nunca logar URLs ou conteudo. Registros de obrigacao legal e
backups nao sao purgados por esta fila. Conteudo ja removido nao volta com rollback.

Nao inclui publicacao ou exclusao em redes sociais externas.

Antes de cancelar uma assinatura ativa sem data local, consultar a proxima data
valida do gateway e persistir o periodo. Se nao for possivel confirmar a data,
falhar sem inventar prazo. A limpeza de objetos compartilhados aguarda a remocao
das outras referencias; namespaces desconhecidos exigem conciliacao manual.
O bloqueio de origem nao purga caches externos previamente preenchidos.
