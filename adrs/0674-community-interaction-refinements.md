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
ou verificacao registrada antes dos beneficios. Cortesia nao substitui CRP.
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
