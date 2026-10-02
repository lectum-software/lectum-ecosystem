# TASK-212 — Remover faixa vazia da modal de criar post

Data: 2026-10-02

## Contexto

No iPhone com teclado aberto, a modal de criação de post reservava uma faixa branca vazia entre o texto e a barra inferior de ações. Essa área reduzia a percepção de espaço útil de escrita e ficava incoerente com o comportamento visto quando há mídia no post.

## Escopo

- Fazer o rodapé da modal de criar post ficar sobreposto à área de edição.
- Remover a reserva vertical fixa antes da barra de ações.
- Manter a área de edição rolável até o fundo, com ou sem mídia.

## Fora de escopo

- Alterações de backend, banco, upload de mídia ou permissões.
- Mudanças no contrato de criação de post.

## Validação

- Teste direcionado de layout do composer.
- Check de versionamento.
- Check completo do frontend.
