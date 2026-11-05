# TASK-314 - Nome fiscal na aprovacao manual

## Escopo
- Exigir nome fiscal na confirmacao de aprovacao manual de CRP.
- Gravar aprovacao e identidade fiscal na mesma transacao, com origem manual e ator.
- Preservar editor fiscal separado para corrigir contas ja aprovadas.
- Nao alterar planos, cobrancas, flags SendNF, SEO ou verificacao automatica.

## Aceite
- [x] Campo obrigatorio junto ao CPF na confirmacao manual.
- [x] Backend recusa nome ausente/invalido antes de aprovar.
- [x] Evento fiscal e aprovacao na mesma transacao serializavel.
- [x] Teste local de atomicidade, conflito e nome obrigatorio.
- [x] Checks e builds Backend/Admin.
- [x] QA visual autenticado.

Referencia visual: tela Admin fornecida pelo usuario e componentes existentes.
Builder indisponivel; componente real validado com Playwright local.
Publicacao separada: Backend primeiro, depois Admin; durante a janela, o Admin
antigo sem nome recebe erro de validacao em vez de aprovar sem identidade fiscal.
Nao ha migracao nem preenchimento inferido de nomes antigos.

Validacao 04/11: integracao PostgreSQL isolada passou (nome invalido, rollback,
identidade fiscal disponivel e decisao obsoleta). Backend check: 1178 aprovados,
zero falhas, um skip preexistente. Admin check e ambos os builds aprovados.
Atualizacao 04/11: integracao isolada repetida com sucesso. Login real com conta
temporaria, formulario em 390/1440px sem overflow, campo fiscal visivel.
Backend local /health e /ready aprovados. Conta temporaria removida ao finalizar.
Publicacao autorizada pelo usuario, junto da TASK-315; SEO fora do lote.
