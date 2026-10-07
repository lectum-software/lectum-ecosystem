# ADR-0571 - Paridade entre criacao e edicao de posts

## Status

Aceito.

## Contexto

A edicao usava textarea enquanto a criacao usa contenteditable. O seletor de
label oculto esperava span, deixando os labels de textarea visiveis. Sua camada
z70 ficava abaixo do compositor z80 e header z90. Videos ignoravam a miniatura
persistida e referencias de Stream eram tratadas como arquivos reproduziveis.

## Decisao

Usar os mesmos controllers RHF, estilos, camera e medidas da criacao, mantendo
Editar Post/Salvar e as restricoes de dominio atuais. Preservar a orquestracao
de upload/update e nao enviar mudanca de midia quando apenas o texto mudar.
Compartilhar a medicao de teclado em useEditorKeyboardOffset sem alterar seu calculo.

Reusar Modal nativo (showModal) com classe de sheet e opcoes de dismissal
retrocompativeis. A top layer impede sobreposicao e interacao com comentarios,
sem esconder globalmente controles por CSS nem aumentar z-index indefinidamente.
O aviso de upgrade permanece dentro do dialog, com editor temporariamente inerte.
Scroll lock, contencao de foco e suspensao de videos de fundo usam a fundacao existente.

Preferir miniatura salva para videos legados. Stream usa o resolver existente de
playback e sua miniatura atualizada, com fallback para poster persistido. Se o
poster falhar ou nao existir, tentar frame do video (native/HLS existente), sem
autoplay; falha exibe estado acessivel. Referencia JSON nunca vira src de video.

Para concluir testes apos falta recorrente de disco, permitir opcionalmente
LECTUM_LOW_DISK_MODE=1 em next dev --webpack, desativando apenas o cache Webpack
de desenvolvimento. O padrao e os builds produtivos nao mudam. Next start nao
substitui dev neste ambiente: a politica produtiva de APIs bloqueia localhost e
permanece intacta. Outros artefatos ainda ocupam disco; reinicios ficam mais lentos.

## Consequencias

Nenhum novo pacote, contrato, banco, permissao ou provider. Fotos e videos nao sao
regravados pela correcao visual. Tests SSR e browser de componentes complementam,
mas nao substituem, salvamento autenticado e teclado em iPhone/Android fisicos.
Publicacao continua manual apos validacao local; rollback restrito ao frontend.
