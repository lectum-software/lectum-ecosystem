# TASK-272 - Identidade fiscal interna do profissional

Status: Done

## Escopo

Nome fiscal independente do nome publico, no registro profissional do Admin,
inclusive para cortesia. Preenchimento a partir da confirmacao CFP por CPF;
edicao administrativa auditada. A integracao de emissao da TASK-271 consome essa
identidade localmente, mas nao faz parte desta publicacao.

## Aceite

- [x] Registro interno separado, vinculado ao CPF, com historico e responsavel.
- [x] Confirmacao CFP e aproveitamento estrito de evidencias antigas.
- [x] Admin consulta/edita para profissionais pagos ou cortesia.
- [x] Formulario Conceder cortesia inclui nome fiscal obrigatorio, preenchimento
  do registro interno existente, confirmacao e persistencia atomica com a concessao.
- [x] Campo ausente das APIs e telas do profissional.
- [x] Identidade independente do nome publico disponivel para integracao fiscal.
- [x] Migration local, testes, checks/builds e browser mobile/desktop.

## Operacao

Publicacao autorizada em 24/10/2026 somente para identidade fiscal. Sem chamada
paga ao CFP, backfill ou ativacao SendNF. Tabela aditiva; publicar migration/backend antes do Admin.
Rollback de codigo preserva historico. Sem backfill destrutivo ou nova consulta
automatica de terceiros. Builder indisponivel: usar inventario/prototipos locais
e componentes atuais do registro Admin. Fonte visual existente, mobile-first.

## Evidencias locais - 2026-10-24

- Migration `20261024200000_internal_fiscal_identity` aplicada apenas no banco
  descartavel local `lectum_whatsapp_dev_20261017`; Prisma gerado.
- Integracao de persistencia passou: confirmacao CFP idempotente, evidencia
  historica, edicao manual auditada, conflito concorrente, troca de CPF,
  nome publico preservado e snapshot de nota imutavel. Fixtures temporarias
  removidas; nenhuma consulta real ao CFP ou emissao SendNF.
- Backend build e Admin check passaram. Admin compilou; a limpeza final de
  sourcemaps passou apos mover cache antigo de desenvolvimento para `.tmp`.
- Check raiz: politicas, frontend e typecheck/backend passaram; suite backend
  teve 965/966 aprovados e timeout ETIMEDOUT no teste preexistente
  `optional-auth-failure.test.mjs`. Esse teste passou isolado. Gate geral
  permanece pendente, sem flexibilizar timeout nem alterar teste para passar.
- Browser real, API/DB locais, 390px e 1440px: salvar, historico, recarregar,
  ausencia de overflow e nome publico preservado. Acesso anonimo e token de
  psicologo recusados na rota administrativa; login do psicologo nao retorna
  nome fiscal. Cortesia nao criou nota. Fixtures removidas ao final.
- Previa administrativa em `http://localhost:3012`, API isolada em 3011.
  Usar servidor dev para QA: build de producao recusa API loopback por design.
  Console dev apresentou avisos preexistentes de CSP IPv6; sem pageerrors.
- A dependencia inicial da TASK-271 foi retirada para publicar a identidade
  separadamente. Emissao, ledger SendNF e UI de notas continuam locais e pendentes.

## Complemento - formulario de cortesia

- Nome fiscal obrigatorio acima do CRP, preenchido somente pelo registro fiscal
  interno existente, nunca pelo nome publico. Modal confirma o nome informado.
- Salva junto com a concessao, CPF e CRP em transacao serializavel. Revisoes
  protegem contra alteracoes simultaneas; falha desfaz evento e concessao.
- Integracao local passou, incluindo rollback por CPF ausente apos atualizacao,
  rejeicao de revisao antiga e ausencia de emissao de nota por cortesia.
- Browser real 390/1440px passou: obrigatoriedade, preenchimento, modal, POST,
  auditoria e mesmo valor em Registro profissional. Fixtures removidas.
- Backend check novamente executado: 966/966 testes passaram, incluindo o
  timeout anterior. Backend build e verificador de ciclos passaram.
- Admin check e build completos passaram. Um teste de symlink de sourcemaps
  foi pulado por permissao do Windows; nenhuma falha nos testes executados.

## Publicacao isolada

- Backend e Admin sao os unicos apps com alteracao funcional. Sem novas envs.
- Leitura/edicao fiscal usa validador CPF existente, sem importar contratos SendNF.
- Teste de persistencia independente cobre inclusive alteracao do nome publico.
  Imutabilidade de snapshots continua coberta pelo teste de ledger da TASK-271.
- Autodeploys de homologacao Backend/Video e promocao automatica frontend/Admin
  confirmados desligados pelo usuario em 24/10.
- Monitoring enviado: memoria 3,89/7,75 GiB, disco 40,04/58,76 GB; pico CPU 44%.
  Um build por vez. Backend/migration antes de promover o Admin.
- Rollback de codigo preserva a tabela; nao excluir historico nem reverter migration.
- Release isolado 0.1.712: check raiz completo aprovado (959 testes backend),
  builds backend/Admin aprovados e browser real 390/1440px repetido com sucesso.
  Testes condicionais de plataforma mantiveram seus skips existentes (Video e symlink).
  Codigo SendNF preservado localmente fora do commit; nenhum gate foi desabilitado.
