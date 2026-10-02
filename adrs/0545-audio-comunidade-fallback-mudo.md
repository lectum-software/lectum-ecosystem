# ADR-0545 - Suspensao de som apos fallback de autoplay

Data: 2026-10-01
Status: Accepted
Task: TASK-200

## Contexto

A TASK-194 preserva a escolha explicita de audio entre videos e recargas. O
coordenador da comunidade tentava autoplay audivel e, se negado, silenciava
somente o elemento atual. O estado compartilhado continuava habilitado, permitindo
que canplay ou o proximo video reativassem audio sem nova acao de volume.

## Decisao

Separar a preferencia persistida do bloqueio temporario do documento. Uma rejeicao
NotAllowedError de uma tentativa audivel atual suspende o som e notifica os
consumidores. Somente o setter usado pelos controles de volume remove o bloqueio.
Nao regravar localStorage em fallback e nao transformar eventos de playback ou
volumechange em opt-in. Recarregar ainda pode recuperar uma escolha explicita
anterior, conforme TASK-194; se recusada, ela nao volta durante aquela navegacao.

Expor callback opcional de bloqueio no helper de play com atencao, mantendo seu
retorno booleano e comportamento dos demais chamadores. Revisao da preferencia,
identidade da inscricao, tentativa e video ativo invalidam rejeicoes obsoletas.
AbortError e erros de midia nao sao interpretados como negacao de autoplay.
Sincronizar todos os videos registrados e impor mute nos eventos de reproducao,
metadados e volume quando a preferencia efetiva esta desabilitada.

## Consequencias

Depois do fallback, e necessario tocar no controle de som uma vez; os proximos
videos voltam a herdar a escolha normalmente. A preferencia e compartilhada com
os demais players que ja usavam o mesmo modulo. Sem mudanca visual, API, banco,
env ou dependencia. Testes do coordenador cobrem ordem de eventos, fallback,
desmontagem e acao explicita posterior. Validacao fisica iOS/Android pendente.

## Rollout

Publicar frontend em homolog, validar com midia real e promover apenas apos pedido
explicito. Rollback de codigo restaura comportamento anterior sem migracao de dados.

## Complemento 2026-10-02 - 0.1.552

O bloqueio global acima aplica-se a uma escolha recuperada do storage, antes de
uma ativacao explicita nesta navegacao. Depois de uma acao de volume atual, uma
negacao NotAllowedError por elemento nao representa revogacao pelo usuario.
Preservar a escolha habilitada e manter o elemento recusado pausado e nao mutado,
com os controles existentes de play. Registrar a revisao bloqueada por elemento
para nao repetir autoplay em cada canplay/scroll; play manual ou nova escolha
liberam novas tentativas. Nao reproduzir videos escondidos para obter permissao.

Aplicar a preferencia efetiva nos eventos de volume/metadados/reproducao nos dois
sentidos, evitando restauracao tardia de snapshots mudos depois do opt-in. Nao
transformar esses eventos em escolha do usuario. Preservar guards de visibilidade,
modal, tentativa atual e rejeicoes obsoletas. Rollback por reversao deste ajuste.

Referencia primaria: https://webkit.org/blog/6784/new-video-policies-for-ios/
e https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/ (02/10/2026).
Permissao de autoplay nao e garantida por uma preferencia da aplicacao; quando
negada, manter play manual em vez de silenciar toda a pagina.

## Complemento 2026-10-02 - 0.1.553

O usuario escolheu priorizar autoplay. Esta decisao substitui a pausa local da
0.1.552 por fallback mudo no elemento recusado, sem revogar o opt-in atual dos
demais elementos. Manter a suspensao inicial da preferencia recuperada do storage
quando nao houve nova acao de volume neste documento.

Separar revisao de audio recusado por elemento da revisao de autoplay totalmente
recusado. A primeira impoe mute apenas local nos eventos e no retorno por scroll;
a segunda impede loops quando ate o play mudo e negado. Nova escolha explicita
invalida ambas. Play manual pode recuperar reproducao, mas nao e opt-in de audio.
Uma negacao audivel atual gera no maximo uma tentativa muda; erros nao relacionados,
modal, falta de atencao, desmontagem e troca de video nao autorizam essa tentativa.

O controle existente reflete o mute efetivo, permitindo ativar som por toque.
Nao ha garantia de autoplay contra uma recusa total do navegador. Sem mudanca de
layout, API, banco, env ou dependencia. Rollout em homolog antes de nova autorizacao
de producao. Validar fontes reais com midia real e negacao controlada, deixando
explicita a ausencia de aparelho iOS fisico.

## Complemento 2026-10-02 - 0.1.554

O usuario exige inicio mudo em cada acesso, inclusive quando uma escolha antiga
de audio foi persistida. Nao ler nem gravar a preferencia em storage; compartilhar
apenas o estado em memoria do modulo client durante o documento atual. Navegacao
client-side preserva a escolha; recarga ou nova aba iniciam false. Chaves legadas
ficam ignoradas e nenhuma limpeza de dados de terceiros e realizada.

Remover a suspensao global usada exclusivamente para opt-in recuperado, que deixa
de existir. Manter revisoes de escolha, listeners, controles explicitos e fallback
mudo por elemento da 0.1.553. Erro de autoplay nao representa acao de volume.
Sem mudanca visual ou de contrato externo; rollout primeiro em homolog.
