# ADR-0614 - Resolver foco profundo na continuacao da conversa

Data: 2026-10-13
Status: Aceito

## Contexto

Minhas publicacoes usa links com focusReplyId. A API ja retorna o caminho
completo ate o item, mas o controlador aproveitava somente a pagina raiz da
consulta e depois carregava novamente a arvore truncada. O alvo profundo
desaparecia. A tela de continuacao tambem nao consumia o foco da URL.

## Decisao

Resolver o ancestral da pagina de continuacao a partir da arvore focada da
API, usando o mesmo MAX_REPLY_TREE_DEPTH (3) do componente existente. O
ancestral de fronteira e repetido como raiz da proxima pagina; alvos nos
niveis 4-6 usam a raiz de nivel 3, 7-9 usam nivel 6 e assim por diante.
Usar router.replace para nao acrescentar uma pagina intermediaria ao historico.
Manter o alvo exato na query e no hash e reutilizar useReplyFocusHighlight e
os controles independentes dos ramos na tela de continuacao.

O redirecionamento automatico vale para o foco recebido na URL, nao para
respostas recem-criadas pelo composer. Alvos rasos/ausentes preservam o fluxo
atual. Nenhum contrato de API, dependencia ou configuracao nova.

## Consequencias

Links existentes, inclusive os de Minhas publicacoes, passam a resolver a
pagina correta apos a consulta focada. A consulta inicial ao detalhe ainda
existe, mas nao requer carregar todas as paginas nem modificar dados.
Testes cobrem fronteiras, varias continuacoes, irmaos e alvo ausente.
QA visual local e gate para eventual publicacao autorizada.
