# TASK-252 - Foco da resposta na continuacao

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Pedido

Ao acessar uma resposta/comentario profundo por Minhas publicacoes, abrir a
continuacao da conversa correspondente e focar exatamente o item escolhido.
Referencia mobile: captura do usuario de 13/10/2026, 08:15.

## Escopo

- Frontend apenas; preservar layout e controles existentes, base mobile ~390px.
- Reutilizar o caminho completo retornado pela consulta focusReplyId existente.
- Nao alterar API, banco, permissao, anonimato ou servicos publicados.
- ADR-0614. Inventario visual consultado; Builder indisponivel nesta sessao.

## Aceite

- [x] Respostas ate o limite inline continuam no detalhe original.
- [x] Respostas alem do limite resolvem o ancestral da continuacao adequada.
- [x] Suportar varias paginas de continuacao, nao apenas o primeiro nivel profundo.
- [x] Preservar identificador de foco na URL da continuacao e abrir seus ancestrais.
- [x] Reutilizar rolagem/destaque existentes e controles de ocultar/reabrir.
- [x] Resposta ausente nao provoca redirecionamento para outro comentario.
- [x] Check e build frontend aprovados.
- [ ] Conferencia visual local com comentario profundo real.

## Validacao

Check frontend completo aprovado em 0.1.658, incluindo lint, tipos, suites
existentes e cinco novos testes de navegacao. Cinco testes de Minhas publicacoes
tambem aprovados com o loader TSX existente do backend (a primeira tentativa
sem esse loader falhou por extensao .tsx nao suportada, sem falha funcional).
Build frontend 0.1.658 aprovado (compilacao, TypeScript e geracao de paginas).
Logs: .tmp/task-252-frontend-check.log e
.tmp/task-252-frontend-build.log.
Automacao de navegador falhou na inicializacao (trusted Node process exited).
Sem push ou deploy deste ajuste; producao permanece 0.1.657.
