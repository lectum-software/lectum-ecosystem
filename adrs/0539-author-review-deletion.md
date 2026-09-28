# ADR-0539: Exclusao de avaliacao pelo autor

## Status
Aceito em 2026-09-28.

## Contexto
O autor precisa retirar sua propria avaliacao. O profissional avaliado nao pode
excluir criticas recebidas. O schema ja possui deleted/deletedAt e as consultas
publicas e profissionais filtram deleted=false.

## Decisao
- DELETE /api/private/user/reviews/:id usa autenticacao existente e identifica o
  autor exclusivamente pela sessao. A rota legada de paciente herda o mesmo handler.
- Consulta e update exigem id, author_id e deleted=false. Registro ausente,
  alheio ou ja excluido retorna o mesmo 404, sem revelar autoria.
- Exclusao logica e recalculo de media/contagem das avaliacoes publicadas ocorrem
  na mesma transacao Serializable com retry existente. Nenhuma migration.
- A resposta profissional permanece no registro retirado, mas deixa de aparecer
  junto da avaliacao. Reavaliar segue o fluxo existente que limpa a resposta antiga.
- Acao em Avaliacoes feitas usa confirmacao com foco inicial em Cancelar, erro
  recuperavel e bloqueio de fechamento/envio durante a requisicao.
- Invalida lista do autor, elegibilidade, perfil, busca e avaliacoes profissionais;
  retorna a pagina 1 para evitar pagina vazia apos excluir seu ultimo item.
- Psicologos tambem recebem acesso a Avaliacoes feitas no menu de perfil.

## Deploy e rollback
Publicar primeiro em homolog. Contrato aditivo, sem env ou dependencia nova.
Frontend pode receber 404 em rollout anterior ao backend e mantem a avaliacao.
Rollback de codigo nao restaura registros excluidos; nenhuma restauracao automatica.
Nao executar exclusoes em dados reais durante smoke sem autorizacao especifica.

## Validacao
Testes isolados cobrem autoria, alvo profissional sem permissao, ausencia de
sessao, registro ausente/excluido, media restante, ultima avaliacao e falha no
recalculo. Validar builds e checks antes do deploy.

Builds e tipos frontend/backend aprovados. Oito testes isolados passaram; a suite
backend teve um erro por disco cheio e passou na repeticao do teste afetado.
Suite frontend aprovada. Confirmacao real validada em 390/1440px, com foco,
Cancelar/Escape e sem overflow. Nenhuma exclusao real foi executada. Check global
frontend mantem erro anterior de formatacao fora do escopo.
