# ADR-0659 - Depoimentos como comentarios e totais de gestao

## Status

Accepted. TASK-295, implementacao local sem publicacao autorizada.

## Contexto

As capturas de 30/10 mostram convites desconectados das acoes, folhas sobrepostas
e apresentacoes distintas do mesmo depoimento. O usuario pediu identificacao,
gestao semelhante a comentarios e totais nos filtros do profissional.

## Decisao

- Compartilhar a apresentacao de depoimento e resposta entre perfil publico,
  diretorio e Meus Depoimentos de paciente/profissional. Preservar estrelas
  individuais, ausencia de media publica e uma unica resposta profissional.
- Preservar nomes abreviados e iniciais de pacientes enviados pela API. Nao
  buscar identidades privadas para enriquecer a apresentacao. A identidade do
  profissional usa o perfil publico existente, incluindo foto, profissao e selo.
- Usar o SVG reviews fornecido pelo usuario como componente currentColor.
  Convites no post ficam na linha de acoes, com rotulo responsivo e nome acessivel.
  Abaixo de 640px, mostrar somente o icone inline para preservar o espacamento;
  manter nome acessivel, tooltip e alvo minimo de 44px independente da fonte raiz.
- Restringir o convite contextual a paciente autor do post original, em resposta
  direta com video de outro profissional. A elegibilidade existente continua
  obrigatoria. Isso nao restringe o acesso independente pelo perfil/diretorio.
- Uma unica folha alterna lista e escrita, sem empilhar modais. Preservar lista,
  retorno, bloqueio de rolagem e confirmacao antes de descartar rascunho.
- Folhas de comentarios e depoimentos usam gesto compartilhado no cabecalho:
  arrastar para baixo, ignorar controles interativos e gestos horizontais,
  cancelar sem fechar e respeitar movimento reduzido. Fechamento passa pelas
  mesmas protecoes de rascunho e envio ja existentes.
- O fechamento recusado retorna false ao Modal compartilhado, liberando uma nova
  tentativa por Escape/backdrop sem perder rascunho. Chamadores void permanecem
  compativeis e a protecao contra eventos de fechamento duplicados e preservada.
- A folha transiciona open para false antes de notificar o pai para desmontagem,
  permitindo ao Modal restaurar o foco. Nao restaurar foco genericamente no
  cleanup compartilhado: desmontagens por navegacao nao devem roubar o foco.
- Contadores de comentarios de video devem representar todos os descendentes
  visiveis daquela discussao, em qualquer profundidade, sem somar outros videos
  do mesmo post. Quantidades de filhos diretos para paginacao permanecem distintas.
- Nas publicacoes do perfil, o contexto de uma resposta e seu destinatario direto:
  post para respostas de primeiro nivel, comentario pai para respostas aninhadas.
  Nao substituir contexto indisponivel por outro texto que sugira destinatario errado.
  Preservar as regras de anonimato e remocao ja aplicadas a discussao publica.
- Adicionar visibility_counts ao DTO autenticado de gestao, agregando visible,
  hidden e all sem depender da pagina carregada. Autores inativos e registros
  excluidos seguem os filtros existentes. A interface aceita ausencia do campo
  durante rollout e nunca inventa zero para uma contagem desconhecida.
- Usar CTA transparente com borda/texto foreground e descricao contextual
  "Relatos sobre experiencias com este psicologo na Lectum", sem alegar uma
  verificacao de identidade ou atendimento que a plataforma nao realiza.

## Consequencias e rollout

Ocultar uma resposta do perfil e uma preferencia do profissional dono, distinta de
exclusao/moderacao: a discussao original e a lista privada permanecem intactas.
O menu privado permite reexibir e sinaliza o estado com EyeOff. A API autentica
autoria e papel; o perfil publico filtra listas, previews e totais.

Migration expansiva adiciona hidden_from_profile com default false; sem pacote
ou variavel nova. A resposta da API e aditiva; publicar
backend antes do frontend numa futura publicacao autorizada. Nao alterar Admin
ou Video. Rollback de frontend nao perde dados nem muda moderacao/elegibilidade.
Os totais devem ser invalidados junto das listas apos ocultar, reexibir ou editar.

A migration 20261030210000_reply_profile_visibility deve preceder o backend.
O default constante false preserva todas as respostas existentes, sem backfill
de conteudo ou exclusao. A operacao exige lock de DDL na tabela post_replies;
verificar tamanho/atividade da tabela no planejamento da publicacao autorizada.
Validar ocultar/reexibir, totais do perfil e permanencia na discussao original.
Em rollback de aplicacao, manter a coluna e as preferencias gravadas, sem down
migration destrutiva. Backend anterior nao aplica a ocultacao no perfil, portanto
esse efeito deve ser comunicado se houver rollback apos uso do recurso.

## Validacao

Testes de autoria, resposta direta/aninhada, privacidade, totais paginados,
gestos e componentes. Checks/builds e QA autenticado com dados locais isolados
registrados na TASK-295 antes da conclusao. Nenhum envio em producao.
