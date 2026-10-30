# ADR-0655 - Depoimentos da comunidade sem media publica

## Status

Accepted. Implementacao local; publicacao depende de autorizacao posterior.

## Task relacionada

TASK-290. Previa local aprovada em .tmp/depoimentos-preview; Builder indisponivel.

## Contexto

O relato deixa de representar avaliacao de psicoterapia e passa a representar
acolhimento percebido nas respostas e conteudos do profissional, inclusive por
quem assistiu a uma resposta dirigida a outra pessoa. O profissional pode ocultar
um relato, portanto uma media publicada sugeriria uma representatividade que nao
podemos garantir.

## Decisao

- Manter estrelas individuais de 1 a 5 e texto obrigatorio, sem media calculada
  ou exibida. Contagens publicas incluem somente relatos publicados de autores
  ativos. Campos rating_avg legados retornam zero durante a compatibilidade.
- Ranking usa a quantidade publica de depoimentos, sem considerar estrelas
  individuais ou media legada; preserva o peso total anterior desse sinal.
- Um depoimento ativo por paciente/profissional, protegido pela chave unica
  existente. Autor edita/exclui; so o profissional destinatario responde, edita
  ou exclui sua unica resposta. Nao ha novas profundidades de comentarios.
- Status oculta_profissional distingue a ocultacao pelo destinatario da moderacao
  administrativa oculta. O profissional nao pode desfazer moderacao administrativa.
  O autor conserva acesso ao proprio relato sem rotulo de ocultacao.
- Exigir assinatura Profissional apenas para novos depoimentos. Downgrade nao
  remove relatos anteriores nem bloqueia resposta e gestao.
- Reutilizar RHF/Zod e modal nativa do produto, com a geometria da folha de
  comentarios dos reels. Perfil, modal, gestao e lista do paciente compartilham
  o mesmo card com uma resposta subordinada.
- Convites junto aos videos consultam elegibilidade e desaparecem se ja houver
  depoimento, mesmo oculto. Nenhum post de origem e exibido no relato.
- Uma notificacao interna agrupada por paciente, criada somente em uma nova
  resposta elegivel. Chave deterministica e transacao impedem duplicacao. A lista
  de destinatarios e consultada ao abrir; nao guarda textos de posts na notificacao.
  Sem push/email, cron ou campanha retroativa. Leitura/exclusao nao geram reenvio.
  Essa politica conservadora evita escolher uma cadencia ainda nao aprovada.

## Consequencias

URLs e nomes de tabelas/keys antigos permanecem para compatibilidade; textos e
fluxos ativos passam a Depoimentos. Nao ha pagina externa de coleta na navegacao.
Uma notificacao ja lida nao volta a chamar atencao quando novos profissionais
respondem; uma futura cadencia agrupada exigira decisao de produto separada.

## Producao e rollout

Sem migration, dependencia ou env nova. Endpoints de edicao, visibilidade,
exclusao de resposta e pendentes sao aditivos. Publicar backend antes do frontend
para disponibilizar as novas acoes. Admin e Video nao exigem deploy desta task.
Frontend antigo recebe media zero e nao exibe relatos ocultos pelo profissional.
Rollback de frontend e possivel; rollback de backend nao desfaz status salvos e
deve preservar a filtragem somente publicada. Nao executar campanhas/backfills.

## Validacao

Testes reais de componentes e schemas, permissao/autoria, gratuidade, unicidade,
moderacao e notificacao agrupada. Checks, builds e QA autenticado local registrados
na task antes de concluir. Nenhum teste deve escrever em bancos remotos.
O teste de edicao cobre payload restrito a rating/comment; destinatario nao pode
ser alterado. As duas folhas bloqueiam a rolagem do feed de psicologos por tras,
preservando o profissional selecionado e o rascunho.

## Refinamento de apresentacao em 30/10

A URL publica passa a usar tab=depoimentos, mantendo avaliacoes como chave interna
e alias de entrada para compatibilidade. Links antigos sao substituidos no
historico com preservacao dos demais parametros, sem salto de rolagem.
O convite do perfil e da modal usa o botao primario existente; outros convites
mantem a variante discreta. Contagem publica ganha destaque sem introduzir media.
A animacao de entrada usa classe CSS exclusiva das folhas de depoimento na
fundacao global, sem alterar o Modal compartilhado nem exigir loader CSS nos
testes SSR existentes. Movimento reduzido elimina a animacao.
Previa de areas autenticadas usa capturas reais de contas locais temporarias,
nao endpoints simulados nem bypass de autenticacao no produto.
