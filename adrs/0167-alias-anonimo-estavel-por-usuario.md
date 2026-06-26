# ADR-0167: Alias anônimo estável por usuário

## Status

Accepted

## Task relacionada

TASK-23, TASK-26

## Contexto

Posts anônimos na comunidade eram exibidos como `Membro Anônimo #XXXX`, mas o número era derivado do `post.id`. Isso fazia o mesmo paciente receber números diferentes em publicações anônimas distintas, reduzindo a continuidade percebida por outros membros e por psicólogos que acompanham relatos recorrentes.

O produto decidiu que o identificador anônimo deve funcionar como uma identidade pública pseudônima estável, sem revelar nome, foto, perfil ou dados pessoais.

## Decisão

- Calcular o alias `Membro Anônimo #XXXX` a partir de `author.id`, não de `post.id`.
- Aplicar a regra em todos os caminhos backend que montam posts de comunidade: feed/lista de comunidade, detalhe do post e publicações exibidas no perfil profissional.
- Manter o alias estável em todas as comunidades para o mesmo usuário.
- Preservar o mascaramento existente de identidade real: paciente anônimo continua sem avatar, nome real, CRP, WhatsApp ou link de perfil.
- Não criar tabela ou campo novo neste momento; a estabilidade é derivada de dado persistido existente (`user.id`) e calculada no response mapper.

## Consequências

- Psicólogos conseguem perceber que diferentes posts anônimos vieram do mesmo membro, sem acesso à identidade real.
- Pacientes mantêm uma presença anônima consistente na comunidade.
- Posts anônimos antigos podem passar a exibir outro número após esta mudança, porque o alias deixa de depender do post e passa a depender do autor.
- O número continua sendo pseudônimo visual e não deve ser tratado como identificador legal, perfil público ou chave de autenticação.

## Validação

- `pnpm.cmd --dir backend exec biome check --write src/modules/api/private/community/repositories/CommunityRepository.ts src/modules/api/private/posts/repositories/PostRepository.ts src/modules/api/private/directory/psychologists/repositories/ProfileRepository.ts`
- `pnpm.cmd --dir backend check`
- `pnpm.cmd --dir backend build`
- `pnpm.cmd check`
- `git diff --check`

## Pendências

- Se a base crescer a ponto de exigir unicidade forte do alias numérico, avaliar persistir um alias público anônimo dedicado por usuário.