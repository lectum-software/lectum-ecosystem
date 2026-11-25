# ADR-0725 - Validacao compativel com CSP e descoberta publica

Status: Aceita.

## Contexto

Chrome em producao registrou script-src / eval no chunk 8157. A inspecao do
chunk e do Zod instalado confirmou o probe Function de suporte ao compilador
JIT. A excecao era capturada pela biblioteca, mas ainda gerava uma violacao CSP.
O llms.txt retornava 200 com URLs simples, nao links Markdown reconhecidos.

## Decisao

Configurar jitless no Zod core pelo primeiro import do instrumentation-client,
antes dos schemas da aplicacao. Preservar integralmente CSP, Sentry e validacoes.
O modo interpretado ja era usado apos a recusa da CSP; nao liberar unsafe-eval.
Manter cinco recursos publicos no llms.txt, agora com sintaxe Markdown e descricao.
Nao mudar robots, permissoes de acesso, consentimento ou regras de treinamento.

## Consequencias

Teste isolado impede tanto Function quanto o probe e verifica validacao sincrona
e assincrona. Browser de producao local deve confirmar ausencia da violacao.
Revisao de teclado nao substitui testes com leitor de tela/aparelho fisico.
Nenhum deploy automatico; rollback por reversao do commit.
