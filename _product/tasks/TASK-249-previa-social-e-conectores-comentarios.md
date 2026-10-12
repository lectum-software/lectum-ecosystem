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
intermediarios usam a mesma borda arredondada do controle final. A ponta reportada era a
continuacao vertical abaixo da curva: a reta ia ate o fundo do artigo. A reta e a
curva terminal agora sao uma unica borda com canto arredondado, que termina no
centro do controle. Isso elimina tanto a sobra vertical quanto a emenda entre
elementos. Conferencia local em Chrome a 393x852 e 800x852 inclui abrir, carregar
mais e ocultar, com capturas e medidas da borda continua. Testes focados: 3/3.
As curvas intermediarias tambem usam bordas CSS com raio de 8px e a mesma espessura,
alinhadas ao eixo da borda do pai em todos os recuos. O controle final aprovado
permanece inalterado neste complemento.

## Resposta a comentario sem texto - 2026-10-12

- [x] Video-resposta a comentario sem texto oculta a caixinha no perfil e nos salvos.
- [x] Previa social e MP4 omitem o bloco completo (fundo, titulo, logo e texto), sem aviso substituto.
- [x] Respostas diretas ao post e comentarios com texto preservam a caixinha.
- [x] Nome, selo e identificacao do profissional permanecem na arte social.
- [x] Cache de arquivo/job diferencia visibilidade da caixinha e identificacao profissional.

Regra de produto: a previa e o arquivo baixado devem apresentar o mesmo layout em
todos os casos. A ocultacao deve valer tambem nos modos alternativos de FFmpeg.
Testes cobrem o componente real da previa via SSR e os pixels do MP4 decodificado
nos modos standard/portable, alem dos contratos frontend/backend/video.

O complemento acrescenta `hideSourceCard` opcional aos metadados sociais. Publicar
video (API e worker) primeiro, backend depois e frontend por ultimo: o servico de
video antigo ignora o campo. Sem migration, env ou dependencia nova. Arquivos ja
baixados nao sao modificados. Sem push/deploy neste ajuste.

Validacao deste complemento (nao confundir com os builds anteriores):

- Frontend: 29 testes focados de perfil/salvos/previa aprovados; lint dos arquivos
  alterados, Biome e typecheck aprovados.
- Backend: 10 testes de contrato e typecheck aprovados; download administrativo
  usa a mesma decisao de ocultacao do download pelo usuario.
- Video: check aprovado (92 testes, 13 skips por binarios fora do PATH) e build
  aprovado. Os dois novos testes de MP4 real foram executados separadamente com
  FFmpeg local explicito, sem skips, verificando pixels nos dois modos.
- Previa real renderizada em Chrome headless a 393 e 1280px, com e sem caixinha,
  em harness isolado do componente. Nao equivale a E2E autenticado do download.
- Build/frontend e check integral nao concluidos neste complemento: C: atingiu
  zero bytes livres. Dev server foi interrompido para evitar artefatos incompletos.
- Builder/Quick Copy indisponivel; mantida a composicao existente da arte social.
