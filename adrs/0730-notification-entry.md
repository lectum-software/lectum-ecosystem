# ADR-0730 - Aviso compartilhado de notificacoes

Status: Aceita
Data: 2026-11-24

## Contexto

A ativacao estava apenas nas configuracoes. O usuario aprovou exibir tambem
na central, mantendo cores e distinguindo estados acionaveis e indisponiveis.

## Decisao

Reutilizar hook de push e componente visual compartilhado. A central oculta
status ativo; configuracoes sempre mostram status. Apenas falta de suporte
e indisponibilidade do servico podem ser dispensadas, por conta e origem no
localStorage. iPhone fora da Tela de Inicio e permissao bloqueada ficam sem X.
Nao pedir permissao automaticamente nessas rotas. Ativo exige inscricao salva,
nao apenas Notification.permission granted. Falha de inscricao permite retry.

## Consequencias

Sem novas dependencias, cores, contratos ou migracoes. Recusa do navegador nao
pode ser revertida pelo site. iOS exige fluxo de Tela de Inicio. Nenhuma camera
ou microfone e solicitada. Validacao de entrega push e teclado nativo requer
aparelho real; simulacao visual nao comprova comportamento do sistema.
