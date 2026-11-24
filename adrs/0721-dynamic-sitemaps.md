# ADR-0721 - Catalogo publico paginado para sitemaps

Status: Aceito

## Contexto

O sitemap publicado contem apenas quatro rotas estaticas. Posts, perfis e URLs
canonicas dos videos precisam ser descobertos sem depender de interacao no cliente.

## Decisao

Manter sitemap.xml como indice dinamico e publicar particoes XML em /sitemaps.
O backend oferece um catalogo anonimo paginado com campos estritamente publicos.
Reutilizar o filtro de perfil publicado e a autorizacao da pagina de video.
Particoes de 500 itens textuais, 20 respostas de video ou 10 posts com video
limitam o trabalho por requisicao; videos inelegiveis podem deixar particoes vazias.
O indice conta candidatos, nao promete o numero final de videos elegiveis.

URLs de midia usam endpoints estaveis ja existentes, nao tokens assinados.
Datas sao persistidas e nao o horario de build; videos usam publication_date.
Falhas de dependencia retornam 503 sem cache. Sucesso permite cache CDN por
cinco minutos. Paginas estaticas continuam disponiveis em sua propria particao.

## Consequencias

Sem migration, pacote ou configuracao nova. Backend deve preceder frontend no
rollout. A leitura de videos reutiliza consultas existentes, com custo por item;
particoes menores evitam uma varredura integral a cada requisicao.
Paginacao por offset pode variar durante publicacoes concorrentes; o proximo
rastreamento converge para o catalogo atual. Volumes maiores podem exigir
catalogo materializado, sem alterar o contrato XML.
Sitemap melhora descoberta, mas nao obriga indexacao ou resultados enriquecidos.
Videos de apresentacao de perfis nao entram neste catalogo de videos comunitarios.
