# TASK-246 - Favorito indisponivel na comunidade

## Escopo

Ocultar a acao de favoritar quando uma publicacao ou resposta da comunidade pertence
a um psicologo cujo perfil nao esta disponivel. Preservar a relacao de favorito ja
existente para que o card volte automaticamente quando o perfil for reativado.

## Aceite

- [x] A comunidade informa de forma aditiva se o autor aceita favorito.
- [x] `+ Favoritar` nao aparece para conta inativa, excluida, perfil excluido,
      nao publicado ou sem video de apresentacao.
- [x] A relacao existente nao e removida durante a indisponibilidade temporaria.
- [x] O card fica ausente de Favoritos enquanto o perfil estiver indisponivel.
- [x] A acao e o card retornam depois que o perfil recupera a elegibilidade.
- [x] Diretorio, perfil publico e elegibilidade de mentor mantem suas regras atuais.
- [x] Nenhum banco, migration, env, dependencia ou mock e criado.

## Validacao

- [x] Teste focado do contrato backend e dos estados de elegibilidade: 4/4.
- [x] Teste focado do slot de favorito no frontend: 5/5.
- [ ] `pnpm --dir backend check`: formatacao, runtime deps e typecheck aprovados;
      suite 892/896, com quatro timeouts operacionais preexistentes. Os cinco testes
      desses arquivos passaram isoladamente.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend build`.

## Impacto de deploy

Backend e frontend, com campo aditivo e frontend tolerante a versoes anteriores.
Os artefatos podem ser publicados em qualquer ordem. Sem alteracao de dados: o
filtro ja aplicado na pagina de Favoritos oculta o card e a reativacao volta a
inclui-lo. Versao candidata `0.1.644`. Rollback por reversao em `homolog`.

## Correcao complementar 2026-10-12 - detalhe do post e respostas aninhadas

O detalhe do post usa um serializador de autor diferente do feed. Ele nao incluia
`favorite_available`, portanto o frontend interpretava a elegibilidade como
desconhecida e ainda exibia `+ Favoritar` em respostas de perfis indisponiveis.

- [x] Aplicar a mesma regra de elegibilidade aos autores do detalhe do post.
- [x] Cobrir respostas diretas e aninhadas, que compartilham o mesmo serializador.
- [x] Manter o campo opcional no frontend para rollout compativel.
- [x] Confirmar por teste que a listagem de Favoritos exclui perfis indisponiveis
      sem apagar a relacao persistida.

Validacao complementar: testes focais backend 8/8, componente frontend 5/5,
suite backend 907/907, typecheck e build backend aprovados. A inspecao visual no
localhost nao foi repetida porque nao havia uma sessao local ativa com o perfil
indisponivel; o frontend nao foi alterado e seu teste existente confirmou a
ocultacao quando o novo contrato devolve `favorite_available: false`.

Impacto de deploy: backend-only, contrato aditivo, sem migration, env, dependencia,
job ou escrita de dados. O frontend ja sabe ocultar a acao quando recebe `false`.
Rollback por reversao do commit; a relacao de favorito permanece preservada.
