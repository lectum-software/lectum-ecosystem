# TASK-212 — Remover faixa vazia da modal de criar post

Data: 2026-10-02

## Contexto

No iPhone com teclado aberto, a modal de criação de post reservava uma faixa branca vazia entre o texto e a barra inferior de ações. Essa área reduzia a percepção de espaço útil de escrita e ficava incoerente com o comportamento visto quando há mídia no post.

## Escopo

- Manter o rodapé no fluxo normal, fixo abaixo da área rolável do formulário.
- Sem mídia, deixar a descrição crescer com o texto, sem forçar altura cheia nem impor teto de altura ou rolagem interna.
- Manter a área de edição rolável até o rodapé, com teclado aberto ou fechado.
- Preservar o comportamento dos posts com mídia.

## Critérios de aceite

- [x] Paciente e psicólogo sem mídia usam a mesma regra de crescimento natural do texto.
- [x] Removido o limite de `min(42dvh,22rem)` que cortava o texto antes do rodapé com o teclado fechado.
- [x] A descrição sem mídia usa a rolagem do formulário, sem uma segunda área de rolagem limitada.
- [x] O caminho com mídia e o rodapé permanecem inalterados.

Referência visual: capturas enviadas pelo usuário em 02/10/2026. Builder/Quick Copy indisponível neste cliente; ajuste localizado no layout existente.

## Fora de escopo

- Alterações de backend, banco, upload de mídia ou permissões.
- Mudanças no contrato de criação de post.

## Validação

- Teste direcionado de layout do composer.
- Check de versionamento.
- Check completo do frontend.

Complemento 0.1.549: check completo do frontend, build e check de versão aprovados.
Teste isolado de geometria no Chromium com o CSS compilado e as classes reais do
editor: 12 combinações de 360/390/1440px, com/sem mídia e altura normal/reduzida.
O limite anterior reproduziu 570px de texto oculto na rolagem interna; a correção
apresentou zero overflow interno e preservou a rolagem externa. Este teste de
layout não substitui validação autenticada no Safari/iPhone com teclado nativo.
O navegador integrado estava indisponível nesta sessão.
