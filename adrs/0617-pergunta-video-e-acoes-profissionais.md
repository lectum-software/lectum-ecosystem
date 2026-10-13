# ADR-0617 - Pergunta de video e acoes profissionais

## Status

Aceito em 2026-10-13. TASK-255.

## Contexto

O perfil mostrava perguntas em texto acima das respostas textuais, mas usava
uma caixa sobre o player para videos. Salvar/Compartilhar no menu superior da
arvore ficavam distantes de quem terminava de assistir um video longo.

## Decisao

- Reutilizar ProfileReplyQuestion antes da autoria para toda resposta do perfil.
- Remover apenas o overlay do player nesse contexto. Nao reprocessar midia nem
  modificar a arte de exportacao social ou as telas fora desse escopo.
- Usar o papel do autor da resposta, nao o papel do visitante nem o ancestral,
  para manter Salvar/Compartilhar visiveis nas respostas de psicologos.
- Preservar os handlers existentes de salvar, conversao de visitante e compartilhar.
- Demais autores recebem as mesmas acoes no menu de cabecalho, proprio ou alheio.
- WhatsApp permanece depois de responder no texto. Midia usa somente o CTA anexado.
- Barra profissional permite quebra em ramos estreitos sem encolher botoes.

## Consequencias

Hierarquia consistente no perfil e descoberta de acoes profissionais abaixo
do conteudo. Conversas profundas entre psicologos podem ocupar uma segunda
linha de controles. Menus de editar/excluir/denunciar permanecem no cabecalho.
Sem backend, banco, env ou dependencias novas. Rollback apenas de frontend.
