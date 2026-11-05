# ADR-0674 - Participacao explicita e contato verificado

Data: 2026-11-04
Status: implementado localmente, validacao de release pendente

## Decisao

Publicar um post exige seguir a comunidade. Respostas de psicologos seguem a mesma
regra. A interface solicita confirmacao explicita, espera a associacao concluir e
so entao envia. Cancelamento/falha nao limpa o rascunho. O servidor confere a
associacao antes do processamento e novamente na transacao de gravacao.
Respostas de pacientes preservam o comportamento anterior de associacao.

Contato no WhatsApp aguarda a API: nao reutiliza link em cache diante de recusa ou
falha. O aviso do selo e o item mais antigo, depois da ultima pagina, nao fixado.
Leitura continua registrada ao abrir, inclusive para visitantes.

A animacao do contato observa o proprio botao e acumula tempo visivel com atencao
na pagina; playback, pausas e saltos nao determinam o preenchimento. Reutilizamos
menus e player existentes, sem dependencias novas. Avaliacoes e uma troca de copy,
sem alteracao de rotas, tabelas ou identificadores legados.

## Consequencias

## Consolidacao fiscal e upgrade

O lote autorizado inclui a fila SendNF e o fluxo de upgrade da copia local
anterior. A migration e aditiva (jobs e notas), preserva snapshots e usa chave
unica por pagamento/modo. O worker reconsulta o pagamento e recusa estornos.
Emissao e captura continuam desativadas por padrao; o piloto fiscal requer
configuracao privada, pagamento novo e ativacao explicita. Nenhuma nota antiga
ou pagamento manual cancelado sera reemitido para validar esta publicacao.

Upgrade consulta dados atuais, reutiliza dados completos e exige CRP aprovado
ou verificacao registrada antes dos beneficios. Cortesia administrativa ativa
preserva a dispensa de nova consulta ja reconhecida pelo Admin. Conforme a
decisao posterior abaixo, a aprovacao administrativa passa a ser persistida;
isso nao cria uma evidencia automatica inexistente.
A tela de erro reutiliza o feedback existente e o contato de suporte.
SEO sendo desenvolvido no outro chat permanece fora desta copia e do lote.

## Rollout consolidado

Publicar Backend primeiro com migration expansiva e flags fiscais desligadas,
validar saude/versao e publicar Frontend do mesmo commit revisado.
Admin e Video nao precisam de deploy por alteracoes apenas de versao.
Rollback de codigo preserva as tabelas fiscais; nunca remover filas ou notas.

Backend novo recusa publicacoes de clientes antigos que nao seguem a comunidade;
coordenar deploy de Frontend e Backend, sem migration. Nao realizar publicacao
antes dos checks, revisao e consolidacao com as alteracoes de outras copias locais.
Falha da API de contato impede redirecionamento; usuario pode tentar novamente.
Autoplay sonoro depende da politica do navegador; fallback mudo nao e promessa de
compatibilidade com todo webview. Preenchimento mobile pode recortar as laterais
do video vertical; revisar legibilidade visualmente antes de liberar.

## Correcao de regressao de cortesia (04/11/2026)

A retirada da excecao admin_grant na 0.1.776 afetou tambem o guard global,
login e retorno de WhatsApp, nao apenas upgrades. Restaurar a mesma regra para
cortesia profissional ativa em todos esses caminhos e na tela CFP.
Assinatura comum sem verificacao continua exigindo consulta.

O historico do Admin retorna todas as verificacoes persistidas nao excluidas,
sem os cortes de oito no repositorio e quatro na interface. A ativacao por
cortesia atual permanece visivel ao lado desse historico, inclusive apos falhas.
Nao inventar evento historico nem atribuir a cortesia a data de outra verificacao.
Esta correcao exige publicacao de Backend, Frontend e Admin.

## Aprovacao independente da validade da cortesia

Em 04/11 o usuario autorizou explicitamente preparar e testar localmente a
aprovacao permanente de novas cortesias e a compatibilizacao das antigas.
A concessao passa a gravar crp_status aprovado e evento manual auditavel na mesma
transacao; nao altera cfp_verified_at nem representa consulta automatica.
A expiracao ou cancelamento da assinatura nao desfaz essa aprovacao.

A migration 20261104210000 reconhece cortesias legadas, inclusive vencidas,
com origem admin_grant_backfill e referencia ao registro real da assinatura.
Nao altera planos e preserva status rejeitado e reprovacoes manuais posteriores.
Contas sem cortesia e evidencias automaticas existentes nao sao modificadas.
Reprovar explicitamente prevalece sobre a cortesia e evidencias antigas no
frontend e no criterio compartilhado do backend. Erros de API nao reprovam.

Executar migration antes do Frontend no deploy aprovado. Nao remover os eventos
nem reverter aprovacoes no rollback de codigo. Nenhuma operacao produtiva foi
executada durante a preparacao; teste PostgreSQL restrito ao banco local isolado.

Antes da publicacao, o usuario autorizou revisar esta migration ainda inedita
em producao, apesar de aplicada apenas ao primeiro banco local. A revisao foi
validada do zero em lectum_courtesy_review_20261104, sem apagar o banco anterior.
O UPDATE compara updated_at e status atuais para nao sobrescrever uma decisao
concorrente. Teste PostgreSQL com duas conexoes e bloqueio real confirmou que
reprovacao simultanea permanece e nenhum evento de aprovacao e criado.
