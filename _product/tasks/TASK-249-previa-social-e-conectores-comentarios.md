# TASK-249 - Previa social e conectores de comentarios

## Escopo

Corrigir a sobreposicao da barra fixa sobre a previa social, usar o comentario de
origem na previa e no video baixado e refinar a proporcao e a continuidade visual
dos controles da arvore de comentarios.

## Aceite

- [x] A modal de previa social fica acima do compositor fixo e o botao de download permanece clicavel.
- [x] Video-resposta a comentario usa o texto do comentario pai na previa e no MP4 gerado.
- [x] `Ver X respostas`, `Ver mais` e `Ocultar respostas` usam 10px, cinza e bold.
- [x] O controle final do ramo recebe um conector curvo vindo da linha do comentario pai, sem prolongamento reto depois da curva.
- [x] Conectores de niveis internos se encontram sem lacuna entre o trecho reto e a curva.
- [x] O coracao de favorito em comentarios acompanha o tamanho do selo verificado.
- [x] Nenhum dado persistido, migration, env, dependencia ou mock e criado.

## Impacto de deploy

Frontend e contrato aditivo do backend. A resposta de comentarios passa a incluir
`parent_content`, ja derivado da relacao existente, para manter a previa correta
tambem em rotas de conversa focada. Nao ha alteracao de schema ou ordem especial de
deploy; frontend antigo ignora o novo campo e frontend novo preserva fallback para o
titulo do post.

## Validacao

- `pnpm --dir frontend check`: aprovado, incluindo 604 testes da suite principal.
- `pnpm --dir backend check`: aprovado com 909 testes e variaveis locais descartaveis.
- Builds de producao de frontend e backend: aprovados.
- QA visual em navegador real a 393x852 com conversa publica de producao em ponte
  local somente leitura: estados recolhido, expandido e `Ocultar respostas`
  aprovados, incluindo tres niveis de conectores sem lacunas.
- Contratos automatizados confirmam portal acima do compositor, texto do comentario
  pai na previa e no MP4, dimensoes dos controles e escala do coracao.
- Nenhum dado foi escrito durante o QA. Sem push ou deploy.

## Refinamento complementar 2026-10-12

O tamanho e o peso dos controles de ramo agora usam utilitarios importantes para
nao serem sobrescritos pelo `font: inherit` global dos botoes. Os conectores
intermediarios preservam exatamente o SVG ja publicado. A ponta reportada era a
continuacao vertical abaixo da curva: a reta ia ate o fundo do artigo. A reta e a
curva terminal agora sao uma unica borda com canto arredondado, que termina no
centro do controle. Isso elimina tanto a sobra vertical quanto a emenda entre
elementos. Conferencia local em Chrome a 393x852 e 800x852 inclui abrir, carregar
mais e ocultar, com capturas e medidas da borda continua. Testes focados: 3/3.
