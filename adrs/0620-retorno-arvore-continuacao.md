# ADR-0620 - Memoria de retorno da arvore de comentarios

- Status: Accepted
- Data: 2026-10-13
- Task: TASK-258

## Contexto

ReplyCard perde seu estado ao desmontar durante a navegacao para uma continuacao.
Restaurar apenas scroll nao funciona quando a arvore retorna fechada.

## Decisao

Capturar o estado renderizado ao seguir um link de continuacao, antes da navegacao.
Guardar em sessionStorage identificadores, quantidades visiveis, texto expandido
(booleano), pagina de respostas e offset da ancora. Nao guardar conteudo ou midia.
Isolar por usuario e caminho/query, incluindo a raiz da continuacao. Limitar a 12
paginas e 30 minutos, com limpeza no logout e degradacao quando storage e bloqueado.
Hidratar com useSyncExternalStore para evitar divergencia SSR. Restaurar ramos antes
de scroll, aguardar dados e acomodar dimensoes de midia por janela limitada.
Interacao manual interrompe a correcao de scroll. Foco explicito de uma URL nova
tem memoria independente. Recolhimento manual invalida os estados dos descendentes.

## Consequencias

Nenhuma API/banco ou dependencia nova. A memoria nao sincroniza entre aparelhos.
Nao perpetuar rascunhos, videos em reproducao ou comentarios removidos. A mesma
implementacao serve ao post e a continuacoes sucessivas. Falhas de storage nao
bloqueiam navegacao. Testes de estado/SSR complementam QA real Safari/PWA pendente.
