# ADR-0632 - Fundo neutro e tipografia do Top Mentores

Status: Accepted
Data: 2026-10-23

## Decisao

Usar Manrope em caixa alta, 14px e peso 800 na linha Top 5 Mentores em.
Nao distorcer os glifos nem adicionar fonte. Manter o nome da comunidade como
titulo principal e sua identidade cromatica no avatar.

O fundo do ranking deixa de consumir visual_soft_color e usa degrade perola
para branco, terminando no fundo da pagina. No tema escuro, usar cinzas neutros
com transicao para o fundo existente. Preservar ouro, prata e bronze do podio.
Controles recebem primeiro plano contrastante sobre superficie clara.

Refinamento visual aprovado: linha auxiliar cinza #686c72 no tema claro e
#a1a5ad no escuro para reduzir peso visual sem alterar fonte, tamanho ou peso.

## Consequencias

Tratamento igual entre comunidades sem modificar classificacao, dados ou rotas.
CSS escopado ao ranking; demais telas e tokens globais de comunidade preservados.
Publicacao apenas do frontend, rollback de codigo e nenhuma migration.
