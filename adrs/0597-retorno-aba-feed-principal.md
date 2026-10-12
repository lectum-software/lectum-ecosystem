# ADR-0597: Retorno para a aba do feed principal

Status: aceita. Data: 2026-10-11. Task: TASK-23.

## Decisao

Estender ao feed o padrao de sort e periodos na URL ja usado na comunidade (ADR-0591). Replace sem scroll preserva parametros e evita historico extra. A memoria de retorno existente captura a URL completa. Validar valores pelo catalogo; default profissional Oportunidades, paciente e visitante continuam Em destaque sem chips. Sem mudar ranking.

## Deploy e validacao

Frontend independente, sem env, package, banco ou contrato novo. Rollback por reversao. Referencia mobile-first do feed existente e capturas aprovadas; Builder indisponivel. Check/build e browser em andamento. Sem push/deploy.

## Evidencia parcial

Tres regressoes focais e check completo do frontend aprovados. Browser local confirmou sessao de paciente (feed sem chips, comportamento preservado); validacao profissional abrir post/voltar aguarda login do usuario como psicologo. Nenhuma alteracao de papel, token ou guard para simular essa sessao. Build aprovado (oct11-feed-return-build, exit 0). Commit desta task e demais tasks aguardam smoke profissional, mantendo uma task por vez.

Usuario informou login pronto. Na retomada, a ferramenta de navegador falhou antes de conseguir inspecionar a pagina, inclusive apos reinicializacao. Smoke profissional continua pendente por indisponibilidade da automacao local, nao por falta de confirmacao de login. Nao alterar permissoes de seguranca nem simular sessao para contornar. Alternativa: verificacao manual do usuario no localhost.

## Confirmacao manual

Em 2026-10-11 o usuario confirmou que deu certo apos orientar teste em Novos (abrir/voltar) e persistencia de Em destaque ao atualizar. A confirmacao veio do usuario, nao da automacao. Em destaque estava vazio no localhost; percurso completo com post elegivel nessa aba permanece como limite da evidencia. Check/build ja aprovados.
