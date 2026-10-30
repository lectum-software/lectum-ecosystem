# ADR-0660 - Ajustes de depoimentos apos aprovacao visual

## Status

Accepted. TASK-296. Complementa os aspectos visuais do ADR-0659.

## Contexto

Na revisao da galeria, o usuario rejeitou listas sem blocos brancos, a linha
vertical isolada na resposta, CTAs pesados e o convite colocado no post original.
Solicitou identidade e conexoes iguais as arvores de comentarios ja existentes.

## Decisao

- Manter apresentacao compartilhada entre perfil, modal e gestao, preservando
  as acoes e permissoes especificas de cada superficie.
- Cada depoimento no perfil e gestao tem bloco branco proprio. Sua resposta
  permanece na mesma arvore, sem cartao interno adicional, com conexao do
  avatar pai ao avatar do profissional conforme comentarios existentes.
- Reusar a identidade publica disponivel; nao consultar nomes/fotos privados
  para preencher a apresentacao e nao remover anonimato para obter paridade visual.
- No perfil, CTA azul compacto; na modal, CTA transparente com texto, icone
  e borda no cinza padrao. Remover a descricao contextual e o subtitulo de
  quantidade da gestao profissional, sem remover contagens dos filtros.
- A escrita continua na mesma modal da lista. Publicar fica na base com area
  segura e espaco acessivel com teclado, sem divisoria entre identidade e pergunta.
- O convite contextual pertence a resposta profissional, nao ao post que
  contem a discussao. Preservar elegibilidade, autoria paciente e resposta direta.
  Exibir apenas nas barras reais de ReplyCard e primaryReply; nao inventar uma
  barra isolada na previa destacada do feed que nao possui controles proprios.
- O icone reviews fornecido continua no diretorio mobile/desktop; incluir
  evidencia dessa tela, ausente na primeira galeria de aprovacao.

## Consequencias e validacao

Sem mudanca planejada de dominio, dados ou permissoes. Confirmar UI em 320,
390 e 1440px com fonte genuina, imagens, arvore e estado de teclado. Testar
ausencia do convite no post e em respostas aninhadas ou de autoria nao elegivel.
Publicacao autorizada do lote somente apos checks/builds, QA isolada e PR
revisado. Backend TASK-295 precede frontend; Admin e Video nao recebem deploy.

Validacao da TASK-296: checks/builds aprovados, revisao de codigo sem novos
P1/P2 e QA real autenticada em 320/390/1440px. Uma heranca de nowrap da barra
de acoes foi detectada visualmente e corrigida apenas na raiz da sheet, com
regressao Chrome e controle negativo. Teste de viewport reduzida nao substitui
validacao fisica do teclado em Safari. Corrida preexistente na gravacao de
video-watch permanece documentada na task, fora do escopo visual.
