# TASK-253 - Comentarios e contexto pessoal

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Pedido e escopo

Referencias mobile do usuario de 13/10/2026, 08:30. Na arvore de comentarios,
levar Salvar/Compartilhar para o menu de tres pontos; mostrar o total do ramo
fechado; preservar a aba de Minhas publicacoes ao retornar do detalhe.
Manter votos, resposta, WhatsApp, anonimato e permissoes existentes.
Inventario consultado; Builder indisponivel. Base mobile ~390px.
ADR-0615. Implementacao local, sem push/deploy ou limpeza de dados.

## Aceite

- [x] Menus do autor e de terceiros oferecem salvar/remover e compartilhar.
- [x] Barra da arvore conserva votos, resposta e WhatsApp sem acoes duplicadas.
- [x] Ramo fechado mostra descendentes, incluindo continuacoes.
- [x] Expansao/paginacao continua usando filhos diretos; fallback para API antiga.
- [x] Aba explicita na URL prevalece sobre o padrao do tipo de conta.
- [x] Checks e builds frontend/backend aprovados.
- [ ] QA visual local autenticado, mobile e desktop.

## Validacao

Versao local 0.1.659. Check frontend completo aprovado; runner final dos testes
usa register-source-modules do proprio frontend, sem dependencia do backend,
revalidado com 11 testes e Biome. Check backend aprovado, 917 testes sem falhas.
Builds frontend e backend aprovados. Logs em .tmp/task-253-*-check.log e
.tmp/task-253-*-build.log.

Smoke HTTP local: frontend/version e backend/ping em 0.1.659, /ready 200.
Comparacao somente leitura entre API e banco local passou para 15 comentarios
do detalhe/continuacao, incluindo 2 casos multinivel. O diagnostico precisou
incluir uma chave descartavel exigida pelo validador e respeitar limit=30;
essas tentativas nao alteraram dados.

Frontend local na porta 3000, API na 3001, banco 127.0.0.1:55432/lectum_privacy_dev.
Launcher temporario usa apenas configuracao essencial local, sem credenciais
de integracoes externas, sem tunel e com agendamentos desativados.
Automacao do navegador falhou ao iniciar por erro do sandbox helper, portanto
QA visual autenticado continua pendente. Nenhuma alteracao de schema, migration
ou variavel obrigatoria. Sem push/deploy. Publicacao requer validacao local e
autorizacao agrupada.
