# TASK-366 - Ativacao na central de notificacoes

Status: Concluida localmente; publicacao autorizada.

Usuario aprovou previa mobile-first de 390px e publicacao do lote pendente em
24/11/2026. Builder indisponivel; referencia e a previa aprovada com estilos
existentes. Nao alterar cores.

- [x] Compartilhar aviso entre central e configuracoes.
- [x] Ocultar aviso ativo na central, mantendo status nas configuracoes.
- [x] Manter iPhone e permissao bloqueada sem X.
- [x] Permitir dispensar apenas navegador sem suporte e servico indisponivel.
- [x] Persistir dispensa por conta/origem; configuracoes ignoram dispensa.
- [x] Diferenciar permissao concedida de inscricao confirmada.
- [x] Validar frontend check, build e navegador local.
- [x] Revisar o lote antes da promocao homolog para main.

Sem camera/microfone, novas variaveis ou migracoes. Nao solicitar permissao
automaticamente na central/configuracoes. Testes de estado nao substituem
entrega push em aparelho real. Teclado nativo iPhone do lote Reels permanece
limitacao de validacao fisica. Rollback: artefato frontend anterior, sem dados.

Producao antes da promocao: frontend/backend 0.1.861, health/ready HTTP 200.
Autodeploy homolog/preview desligado conforme LOCAL-TO-PRODUCTION.md.
Preservar alteracao preexistente nao relacionada em TASK-347 sem inclui-la.

Ver ADR-0730.

Frontend check e build aprovados. Chrome390/1440: rota anonima real e
componentes dos dez estados sem overflow; sem ativacao push de conta real.
146 testes Reels com Chrome aprovados, sem skips. Revisao independente corrigiu
acesso a sessao nula e resposta atrasada durante troca de conta. Producao deve
ser conferida apos merge; este registro nao afirma deploy antecipadamente.
