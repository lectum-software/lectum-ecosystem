# ADR-0602 - Remover item Privacidade do perfil

## Status
Aceito.

## Contexto e decisao

Usuario solicitou em 11/10/2026 retirar o item Privacidade da secao Conta. Remover a linha e a modal exclusiva, incluindo estado e refs sem consumidores. Manter PatientPrivacyNotice, aceite persistido, paginas publicas legais, controles de acesso e anonimato. Psicologos ja nao possuem esse item; nao introduzir nova diferenca de comportamento.

## Impacto e validacao

Somente frontend; sem contrato, env, banco, packages ou provider. Rollback por reversao; sem push/deploy. Mobile-first 390px, captura do usuario e proto como referencia; Builder indisponivel. Testes e verificacao local pendentes.

Check completo frontend e build aprovados; usuario confirmou conferencia local com "conferi". Aviso inicial e paginas legais inalterados.
