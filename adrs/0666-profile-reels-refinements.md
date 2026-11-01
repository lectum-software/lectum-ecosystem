# ADR-0666 - Consistencia de publicacoes e camadas de reels

Data: 2026-10-31. Status: aceito para implementacao local.

## Decisao

Reutilizar componentes e regras existentes de feed, depoimentos e visibilidade. O bloco de participacao aprovado substitui o carrossel por disclosure e lista com altura das tres primeiras linhas. Contagens por comunidade sao agregadas a partir das mesmas publicacoes publicas consideradas no resumo, com contrato aditivo e fallback sem numeros inventados.

Titulo e nome usam os tokens `--text-sm` e respectiva altura de linha; descricoes, contagens e ranking usam `--text-xs`, preservando os pesos do expansor de Regras da comunidade. A escala acompanha a fonte raiz responsiva, sem tamanhos fixos divergentes. A lista usa overflow nativo, como o seletor de comunidades.

O aviso de upgrade passa a usar a modal nativa compartilhada para ficar acima dos controles dos reels e preservar isolamento, foco e suspensao de midia. A modal de comentarios recebe foco inicial num elemento estatico do cabecalho, mantendo o X navegavel por teclado e sem apagar indicadores de foco globais.

Posts do paciente em Minhas publicacoes reutilizam a apresentacao do feed, mantendo menu de autoria. Ocultar resposta no perfil usa a mesma mutacao/autorizacao existente e nao exclui a resposta da discussao.

## Consequencias

Refinamento TASK-306: Meus Depoimentos usa o perfil privado existente para identificar a resposta do proprietario, incluindo perfis fora do diretorio. O nome ja normalizado pelo backend, avatar, genero e plano/aprovacao alimentam o mesmo componente publico de identidade. Durante carregamento/erro, usar nome/avatar da conta sem inventar selo; rejeitar perfil em cache de outro usuario. Preservar acoes e autorizacao. Acoes de video e diretorio padronizadas em 22px, WhatsApp em 20px e circulo mobile de 36px, com alvos mobile de 44px. Nenhuma mudanca de API.

Complementos TASK-306: ocultar WhatsApp e contador de salvos apenas nos posts sem video em profilePublicationMode, preservando respostas, video, feed e a mutacao de salvar. O header fixo usa font-black, leading-tight e gap-1 como o feed, com text-base e selo h-4/w-4 (1rem), maiores que text-sm e h-3/w-3 do feed. Preservar medicao por canvas, fonte raiz responsiva, nome acessivel completo e truncamento sem sobrepor o contato.

Refinamento TASK-305: o cabecalho agrega posicoes distintas de mentor (Top 1/2/3), sem deduplicar comunidades ou seus selos individuais. O formatador compartilhado omite parcelas de atividade zeradas no resumo e nas linhas; ambos zero omitem a linha inteira. Remover apenas a moldura decorativa dos avatares, mantendo imagem em 48px, medalha na quina e indicadores de foco dos links. Sem mudanca de API ou ranking.

Sem mudanca de banco, dependencia ou configuracao. Deploy futuro backend antes de frontend; campos novos tolerados como opcionais pelo consumidor. Nenhuma publicacao remota nesta task. Regressao deve cobrir dono/visitante, erros de mutacao, listas, modais sobre reels e teclado. Capturas locais nao substituem teste de Safari em iPhone fisico.
# Complemento de release TASK-306 (0.1.768)

O gate source-size permanece com limite de 700 linhas. A permissao de exibir WhatsApp no post fica nomeada antes do JSX, preservando exatamente as condicoes de escopo sem ampliar o componente ou alterar o contrato. Publicacao deste lote restrita ao Frontend; manifests dos demais apps nao exigem deploy funcional.

