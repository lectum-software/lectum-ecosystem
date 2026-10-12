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
