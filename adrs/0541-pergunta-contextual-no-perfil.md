# 0541 - Pergunta contextual nas respostas do perfil

## Status

Aceito em 2026-09-30.

## Contexto

Respostas em video no perfil publico pareciam publicacoes sem contexto. O usuario
pediu o titulo completo e a previa da descricao, conforme o feed, sem identificar
o paciente e sem navegar para o post ao expandir a pergunta.

## Decisao

- Mostrar somente `post.title` e `post.content` antes da resposta do profissional,
  apenas quando `profilePublicationMode` seleciona uma contribuicao de resposta.
- Reutilizar `InlineExpandableText`, com duas linhas e expansao/recolhimento local.
- O titulo nao e link nem recebe limite de linhas. Nao adicionar dados do paciente.
- Desabilitar a navegacao pelo corpo dos cards de resposta no perfil. Acoes
  explicitas existentes, como comentarios e compartilhamento, permanecem intactas.
- Preservar o cabecalho do psicologo, midia, CTA e estado independente da resposta.
- Refinamento de autoria: a pergunta aparece logo apos o contexto `Respondido em`,
  antes da identificacao do psicologo. Nome/avatar ficam junto da resposta para
  nao atribuir o relato original ao profissional. Sem rotulos ou cards adicionais.
- Espacamento: respostas do perfil usam `mt-3` antes da midia, como
  `ProfessionalReplyPreview` e `ReplyCard`. Resposta sem texto nao renderiza um
  bloco vazio nem acumula margem inferior no cabecalho. Havendo texto, manter
  8 px entre autor/texto e 12 px entre texto/midia. Posts proprios nao mudam.

## Consequencias

O visitante entende a pergunta sem sair do perfil ou perder o acesso ao contato.
Nao ha novas chamadas, contratos, dependencias, variaveis ou migracoes. O feed e
as publicacoes de autoria propria preservam seu comportamento.

## Validacao

Testes de renderizacao real cobrem titulo integral, ausencia de link/identidade do
paciente e descricao vazia. Teste de contrato verifica o escopo das respostas e a
posicao antes da midia. Expansao, recolhimento, URL e responsividade devem ser
verificados no navegador.
