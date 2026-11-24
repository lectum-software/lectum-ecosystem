# ADR-0728 - Reels na camada modal nativa

Status: Aceita
Data: 2026-11-24

## Contexto

O feed continuava acessivel sob o Reels, inclusive durante abertura do teclado no iPhone.
O relatorio LCP apontou capa lazy e atraso de descoberta, nao download pesado do video.

## Decisao

Usar dialog.showModal e backdrop opaco, seguindo a fundacao modal existente.
O navegador torna o documento externo inerte; os overlays existentes usam o host modal.
Preservar viewport estavel e deslocar somente o compositor quando o teclado abre.
Remover limites nativos de tamanho/margem do dialogo para cobrir a viewport inteira.
Capas ativas usam eager/high; capas vizinhas seguem lazy/auto. URLs assinadas continuam
sem proxy de otimizacao. Avatar do feed ja usa sizes e otimizador HTTPS.
Favoritar mantem azul e ganha alvo de 44px com fundo escuro no Reels, sem mudar o feed.

## Consequencias

Validar retorno de foco, overlays aninhados, fechamento e teclado. A emulacao de viewport
nao substitui validacao em Safari de iPhone fisico. Nenhuma mudanca de API ou deploy.
