# TASK-244 - Perfil do paciente e retorno ao compositor

## Escopo

Alinhar a edicao do perfil do paciente ao comportamento visual ja usado no perfil
profissional e concluir o retorno da edicao de nome iniciada pela modal de criar
post. A referencia visual e funcional e o perfil profissional existente, os prints
enviados em 09/10/2026 e a jornada implementada na TASK-243. ADR-0587.

## Aceite

- [x] Manter `Salvar alteracoes` visivel em um rodape sticky durante a rolagem.
- [x] Exibir alterar/remover foto em popover ancorado ao botao de edicao do avatar.
- [x] Usar a copy aprovada de anonimato, com quebra simples e pontuacao final.
- [x] Ao salvar o nome, substituir a rota de edicao pela rota do compositor aberto.
- [x] Restaurar comunidade, titulo e texto com anonimato desligado.
- [x] Preservar o fechamento da modal de volta para a pagina anterior.
- [x] Nao criar backend, banco, migration, env, dependencia ou pagina de rascunhos.

## Validacao

- [x] Teste focado da apresentacao, retorno canonico e rascunho temporario: 27/27.
- [x] `pnpm --dir frontend check`: 554 testes principais e suites complementares aprovados.
- [x] `LECTUM_LOW_DISK_MODE=1 pnpm --dir frontend build`: compilacao, tipos e 90 paginas aprovados.
- [x] Validacao visual local em 393x852: rodape sticky e popover do avatar aprovados.
- [x] Jornada compositor -> perfil -> compositor aprovada com comunidade, titulo e texto
  restaurados e anonimato desligado.

## Impacto de deploy

Frontend apenas. O retorno usa rotas internas existentes e o rascunho continua no
`sessionStorage` da aba por no maximo 12 horas. Sem mudanca de contrato ou dados
persistidos. Commit local em `homolog`; sem push ou deploy ate autorizacao explicita.
