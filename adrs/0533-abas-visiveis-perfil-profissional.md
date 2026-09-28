# ADR-0533 - Abas visiveis no perfil profissional

## Status

Aceita em 2026-09-27.

## Contexto e decisao

O acesso a publicacoes e avaliacoes exigia rolar o perfil. Exibir Sobre,
Publicacoes e Avaliacoes logo apos o cabecalho, com estilo das abas da comunidade,
sem icones e com contadores em azul escuro. O menu permanece acessivel ao rolar.
Preservar os valores legados geral/publicacoes/avaliacoes na query tab, o historico,
o rastreamento existente e a paginacao. Sobre concentra a apresentacao profissional;
as listas e seus resumos ficam nas respectivas abas, sem cabecalho de subpagina.

Reutilizar a primeira pagina da consulta infinita de publicacoes para obter o total
e preparar a lista, evitando uma segunda consulta de previa. Avaliacoes usam
rating_count do perfil, atualizado pelo resumo da consulta quando disponivel.
Quantidade desconhecida nao e apresentada como zero. O menu tem semantica de abas,
foco por teclado e painel associado. O CTA de contato permanece disponivel.

## Impacto e validacao

Somente frontend, sem API nova, banco, env obrigatoria ou pacote novo.
Referencia: imagens fornecidas pelo usuario e PROTO-INVENTORY; Builder/Quick Copy
indisponivel neste cliente. Validar tipos, lint, build e perfil real em mobile e
desktop. Publicacao inicial em homolog; rollback por reversao revisada.

## Refinamento de dimensoes

Em 2026-09-27, apos comparacao em homolog, igualar a altura h-8, texto text-xs,
peso font-bold e espacamento gap-1.5 ao menu da comunidade. Aplicar tipografia nos
spans internos, como na comunidade, pois o reset global de button herda a fonte.
Apenas as larguras das tres colunas se adaptam; sem quebra de linha nem rolagem.
Playwright confirmou altura de 30px e fonte 11.25px no mobile (raiz de 15px), e
32px/12px no desktop, peso 700, sem overflow em 320/390/1440px.

Refinamento de alinhamento: usar tres colunas de mesma largura para manter
Publicacoes no centro do menu, sem alterar as demais dimensoes aprovadas.

## Retorno a pagina de origem

Trocar abas substitui a entrada atual no historico (router.replace), preservando
o deep link da aba sem criar paginas intermediarias. A seta do cabecalho chama
diretamente o retorno existente, com fallback para o diretorio/feed de psicologos.
Nao ha retorno intermediario para Sobre. Esta decisao substitui a navegacao
push entre abas descrita na implementacao inicial.

## Capa padrao com ceu e nuvens

Em 2026-09-27, substituir o degrade procedural pela imagem gerada e aprovada
pelo usuario (2172x724, 3:1), versionada em public/images/psychologist-default-sky.png.
Usar next/image com otimizacao responsiva, alt vazio por ser decorativa e
object-cover centralizado dentro da altura existente de 132px. Telas mais largas
recortam verticalmente a imagem, sem distorcao ou mudanca de layout.
Preservar capas personalizadas; a nova imagem tambem cobre falha no carregamento
delas. Remover somente efeitos e constante exclusivos da antiga capa padrao.
Sem backend, env, banco, dependencia ou mudanca nas abas. Publicar em homolog.

## Controles de respostas nas publicacoes

Em 2026-09-27, corrigir os cards de contribution_type reply para usar o ID,
voto, salvamento e contadores da resposta, nunca os do post pai. O backend
acrescenta campos opcionais ao preview usando os agregados existentes e uma
consulta em lote dos votos do usuario. Sem migracao ou variaveis novas.
Comentarios abrem a thread da resposta; compartilhamento prioriza a midia
da resposta mesmo quando o post pai possui midia. Intencoes de visitantes
preservam replyId. Posts originais mantem seus controles anteriores.
Durante rollout, campos ausentes usam zero/null, nunca metricas do post pai.

## Desempate das medalhas por comunidade

Em 2026-09-27, alinhar o desempate final dos sinais usados no perfil ao ranking
publico: depois de pontos e criterios de atividade, comparar o nome profissional
em pt-BR e somente depois o ID. Compartilhar esse comparador entre as consultas.
Os sinais carregam os nomes em uma consulta em lote; nao alterar pontuacoes,
elegibilidade ou dados persistidos. A quarta posicao continua sem medalha.
Sem migracao ou variaveis novas. Validar o empate na fronteira do terceiro lugar.
