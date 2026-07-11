# ADR-0249: Header administrativo canonico do detalhe do psicólogo

## Status

Aceita

## Contexto

O detalhe Admin do psicólogo exibe um resumo operacional acima das abas. Após uso real da tela, o header precisava separar status de perfil, plano, dados profissionais e imagem de perfil em formatos consistentes com o produto.

O avatar do header também precisa refletir a foto profissional enviada pelo próprio psicólogo na edição do perfil, armazenada em `user.avatar`, sem recorrer a `<img>` cru.

## Decisão

- O botão `Lista` foi removido do header; a navegação de retorno permanece disponível pelo breadcrumb.
- A tag verde do header passa a representar o status de conta/perfil administrativo derivado de `user.active`: `Ativo` ou `Inativo`.
- Assinatura com `professional_subscription.source = "admin_grant"`, status `ativa` e plano não gratuito aparece no header como `Plano de cortesia`.
- A avaliação no header exibe somente a contagem entre parênteses, por exemplo `0,0 (0)`.
- O CRP do header usa máscara visual `00/00000` a partir de regional e número retornados pelo endpoint Admin, sem alterar o valor persistido.
- O título profissional é derivado de `psychologist_profile.gender`: `Psicóloga` para gênero feminino/mulher e `Psicólogo` nos demais casos, evitando `Psicólogo(a)`.
- O selo ao lado do nome usa o mesmo SVG canônico `VerifiedBadgeIcon` da Lectum (`viewBox="0 0 30 28"`, preenchimento `#308CE8`), em vez do ícone genérico do `lucide-react`.
- O último acesso usa formato brasileiro explícito com preposição: `dd/mm/aaaa às HH:mm`.
- URLs de mídia pública do backend em `/public/files/...` são resolvidas para `NEXT_PUBLIC_API_URL` no Admin antes de serem enviadas ao `next/image`.
- O Admin mantém allowlist explícita de hosts de imagem e passa a aceitar também `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS`, sem wildcard, para cobrir hosts públicos controlados quando a foto profissional estiver fora do host da API.

## Consequências

- O header fica alinhado ao dado operacional que o Admin precisa ler rapidamente, sem confundir status de verificação com status ativo/inativo.
- A foto profissional enviada pelo psicólogo passa a aparecer no detalhe Admin sempre que a URL for pública e permitida pelo `next/image`; caso contrário, o fallback por iniciais continua seguro.
- A máscara do CRP é apenas apresentação no header; os campos detalhados continuam mostrando os valores administrativos completos na aba Perfil/Cadastro.
- Novos hosts de imagem continuam exigindo configuração explícita por ambiente, mantendo a regra de não usar `<img>` cru.

## Validação

- `pnpm --dir admin exec biome check --write 'src/app/(admin)/psicologos/[id]/client.tsx' next.config.ts`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`
- Browser local autenticado no Admin em `/psicologos/cmrfgznww0014xouh2tmz5dbf`, incluindo viewport 390px para o header: avatar real carregado por `next/image`, sem botão `Lista`, status `Ativo`, `Plano de cortesia`, avaliação `0,0 (0)`, CRP `04/12345`, termo `Psicólogo` e último acesso no formato `10/07/2026 às 21:57`; o selo `VerifiedBadgeIcon` foi validado em perfil verificado local com `viewBox="0 0 30 28"` e `fill="#308CE8"`.
