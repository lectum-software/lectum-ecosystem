# ADR-0666 - Consistencia de publicacoes e camadas de reels

Data: 2026-10-31. Status: aceito para implementacao local.

## Decisao

Reutilizar componentes e regras existentes de feed, depoimentos e visibilidade. O bloco de participacao aprovado substitui o carrossel por disclosure e lista com altura das tres primeiras linhas. Contagens por comunidade sao agregadas a partir das mesmas publicacoes publicas consideradas no resumo, com contrato aditivo e fallback sem numeros inventados.

Titulo e nome usam os tokens `--text-sm` e respectiva altura de linha; descricoes, contagens e ranking usam `--text-xs`, preservando os pesos do expansor de Regras da comunidade. A escala acompanha a fonte raiz responsiva, sem tamanhos fixos divergentes. A lista usa overflow nativo, como o seletor de comunidades.

O aviso de upgrade passa a usar a modal nativa compartilhada para ficar acima dos controles dos reels e preservar isolamento, foco e suspensao de midia. A modal de comentarios recebe foco inicial num elemento estatico do cabecalho, mantendo o X navegavel por teclado e sem apagar indicadores de foco globais.

Posts do paciente em Minhas publicacoes reutilizam a apresentacao do feed, mantendo menu de autoria. Ocultar resposta no perfil usa a mesma mutacao/autorizacao existente e nao exclui a resposta da discussao.

## Consequencias

Refinamento TASK-305: o cabecalho agrega posicoes distintas de mentor (Top 1/2/3), sem deduplicar comunidades ou seus selos individuais. O formatador compartilhado omite parcelas de atividade zeradas no resumo e nas linhas; ambos zero omitem a linha inteira. Remover apenas a moldura decorativa dos avatares, mantendo imagem em 48px, medalha na quina e indicadores de foco dos links. Sem mudanca de API ou ranking.

Sem mudanca de banco, dependencia ou configuracao. Deploy futuro backend antes de frontend; campos novos tolerados como opcionais pelo consumidor. Nenhuma publicacao remota nesta task. Regressao deve cobrir dono/visitante, erros de mutacao, listas, modais sobre reels e teclado. Capturas locais nao substituem teste de Safari em iPhone fisico.
