# ADR-0559 - Tema nas respostas das publicacoes do perfil

Data: 2026-10-06.
Status: Aceito.

## Contexto

A aba Publicacoes mistura posts e respostas do profissional. O usuario pediu
o mesmo contexto compacto de comunidade nesses cards, sem estender o chevron
as respostas do feed e do detalhe do post.

## Decisao

Reutilizar OriginalPostCommunityLink no CommunityPostCard quando
profilePublicationMode estiver ativo e existir resposta principal de psicologo.
O nome do componente e seu atributo CSS sao preservados para compartilhar o
truncamento e a reserva compacta ao lado do coracao. Fora dessa excecao, a regra
de posts originais continua igual. Cabecalhos desabilitados seguem respeitados.

## Consequencias

Sem componente paralelo, nova flag publica ou mudanca no contrato da API.
O tema usa categoria e fallback existentes e mantem o destino da comunidade.
Pergunta, midia e acoes continuam vinculadas a resposta. Testes SSR exercitam
o card real em ambos os contextos e estados do favorito.
Deploy exclusivo de frontend; sem migration ou env. Rollback por reversao.
