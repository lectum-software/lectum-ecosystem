# ADR-0019: Descoberta real de psicólogos com filtros por taxonomia

## Status

Accepted

## Task relacionada

TASK-13: Psicólogos: listagem e filtros.

## Contexto

A tela `/app/psychologists` é a entrada principal de descoberta para pacientes e deve consultar o backend real, sem cards hardcoded, mocks ou seeds artificiais. O `DATA-MODEL.md` define que a descoberta de psicólogos é leitura caller-neutra sob `/api/private/directory/*`, protegida apenas por `_auth`, enquanto `/api/private/psychologist/*` fica reservado para autogestão do psicólogo com `requireRole("psicologo")`.

As referências visuais consultadas foram as imagens locais:

- `_product/proto/Psicólogos.jpg`;
- `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg`.

Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; por isso a validação visual usou o fallback auditável das imagens exportadas.

Em 2026-06-06 a tela precisou deixar de ficar limitada ao frame mobile quando aberta em desktop. A referência mobile continua sendo a fonte visual ativa, mas o layout de desktop deve ampliar o conteúdo de descoberta sem criar uma arquitetura paralela de shell ou instalar um pacote de modal.

Em 2026-06-08 o card de descoberta foi reorientado pela referência anexada `Psicólogos (1).jpg`: a Lectum não deve
oferecer seguir psicólogos, porque o relacionamento de "seguir" será aplicado a comunidades em tasks futuras. O card
também precisa abrir WhatsApp via `wa.me`, exibir benefícios comerciais reais e diferenciar assinantes de perfis
gratuitos.

## Decisão

- Criar `GET /api/private/directory/psychologists` como endpoint real de listagem paginada (`page`/`limit`, default 20 e máximo 50), busca e filtros.
- Montar a rota com apenas `_auth` dentro do próprio módulo, sem `requireRole`, preservando a separação definida na ADR-0002.
- Retornar somente psicólogos com `psychologist_profile.published = true`, `psychologist_profile.deleted = false`, `user.active = true` e `user.deleted = false`.
- Criar as tabelas de catálogo e joins previstas no `DATA-MODEL.md`:
  - `specialty`, `service`, `approach`;
  - `psychologist_specialty`, `psychologist_service`, `psychologist_approach`.
- Manter `psychologist_id` dos joins apontando para `user.id`, pois o perfil público usa o usuário como identificador canônico nas rotas `/app/psychologist/[id]`.
- Não criar seed de categorias nesta task. Sem dados reais persistidos, filtros e lista retornam vazios de forma honesta.
- Retornar `filters` junto da resposta paginada para que a tela use apenas o endpoint esperado da task e liste opções reais de catálogo, sem endpoint paralelo nem dados estáticos.
- Expor apenas campos public-safe para descoberta e cards: `user.id`, `user.name`, `user.avatar`, `headline`, `bio`, `crp`, `gender`, `modality`, `languages`, `rating_avg`, `rating_count`, `verified`, `available_today`, `video_url`, benefícios comerciais, `formation_years`, `whatsapp_url` e taxonomias. `cpf`, e-mail, dados de conta e o campo bruto `whatsapp` não são retornados; `whatsapp_url` é gerado pelo backend como URL de CTA para `wa.me` por pedido explícito de produto.
- Implementar a tela mobile-first em `/app/psychologists` dentro do `PrivateTemplate`, usando React Query, query keys dedicadas e a fundação da TASK-02 (`useFormList` + controllers) para busca e filtros avançados.
- Evoluir a mesma tela para desktop com largura máxima de conteúdo ampliada, barra de busca/filtros em card responsivo e grid de resultados em duas colunas a partir de `lg`, preservando a base mobile-first dos protótipos.
- Abrir filtros avançados em modal própria da tela, sem instalar `@radix-ui/react-dialog` nesta etapa. A modal usa `role="dialog"`, `aria-modal`, fechamento por `Escape`, backdrop e foco inicial no botão de fechar; os campos seguem a fundação da TASK-02.
- Remover a opção de seguir psicólogos da interface: os cards não têm botão de seguir, `/app/following` redireciona para `/app/community` e o menu de perfil usa a linguagem de comunidades seguidas.
- Restringir as tags do card a benefícios reais: tempo de formação somente para assinantes, desconto de 1ª sessão, valor social e aceita convênios.
- Exibir selo verificado, prefixo `Dr.`/`Dra.` e miniatura de vídeo no card apenas para assinantes. Perfis gratuitos publicados não recebem selo nem prefixo.

## Consequências

- A descoberta fica pronta para dados reais assim que perfis forem publicados por tasks futuras, sem precisar substituir mocks.
- A ausência atual de psicólogos publicados ou catálogos aparece como estado vazio, não como falha de produto.
- A resposta paginada ganha o campo adicional `filters`; clientes devem continuar usando `data/page/pages/count` para paginação e tratar `filters` como metadado de UI.
- A TASK-15 pode reutilizar o mesmo identificador público (`user.id`) para abrir `/app/psychologist/[id]`.
- A curadoria/seed real de especialidades, serviços e abordagens permanece fora desta task e deve ser decidida sem inventar categorias permanentes.
- O desktop deixa de parecer um frame mobile centralizado, mas a navegação inferior do `PrivateTemplate` permanece como decisão da TASK-12 até haver uma task específica de shell desktop.
- A ausência de pacote de dialog reduz dependência nova agora, mas uma task futura pode trocar para Radix Dialog se houver necessidade de foco preso completo e padrões compartilhados de modal.
- O follow de psicólogos fica depreciado na UI. Modelos/endpoints legados de follow não foram removidos nesta mudança para evitar migração destrutiva fora de escopo, mas não há opção visível para o usuário seguir outro usuário.
- O CTA de WhatsApp passa a expor uma URL `wa.me` gerada no backend; isso atende o pedido explícito de produto, mas deve ser revisitado quando houver política final de privacidade/contato.
- Vídeos de apresentação enviados por profissionais são renderizados no card como mídia nativa quando o profissional é assinante. Como ainda não há recurso de legendas no upload, o componente registra exceção pontual de lint para `useMediaCaption`.

## Validação

- `pnpm --dir backend db:migrate --name add_directory_taxonomies`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke de API real: cadastro temporário de paciente via `POST /api/public/user/store`, chamada autenticada a `GET /api/private/directory/psychologists?page=1&limit=20&verified=true`, resposta `success=true`, paginação válida, filtros reais vazios e remoção do usuário temporário.
- Browser local headless em viewport mobile `390x844`: `/app/psychologists` renderizou com cookie real, sessão hidratada, título da tela, estado vazio/lista real, bottom nav e sem erro de sessão. Usuário temporário removido ao final.
- Validação complementar desktop em 2026-06-06:
  - `npx "@builder.io/dev-tools@latest" auth status` retornou não autenticado; Quick Copy não esteve acessível e a execução manteve o fallback das imagens locais.
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Browser local headless em viewport desktop `1440x1000`: `/app/psychologists` renderizou com `sectionWidth=1112`, botão de filtros presente e rota privada sem redirecionar para `/auth`.
  - A modal de filtros abriu no desktop com `role="dialog"`, título "Refinar busca" e largura `520px`; usuário temporário de validação removido ao final.
- Validação complementar de card em 2026-06-08:
  - `pnpm --dir backend biome:fix`
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Smoke real de API com paciente temporário removido ao final: `GET /api/private/directory/psychologists?page=1&limit=3` retornou `success=true`, `count=1`, `page=1` e os campos do novo card (`whatsapp_url`, `video_url`, `available_today`, benefícios e `formation_years`).
  - Smoke local HTTP: backend `/health` retornou `200`; `/app/psychologists` e `/app/following` responderam `307` pelo proxy privado quando acessados sem sessão de browser reutilizável.

## Pendências

- Curadoria ou ingestão real dos catálogos `specialty`, `service` e `approach`.
- Publicação/edição de perfis profissionais com taxonomias nas tasks de perfil do psicólogo.
- Detalhe do perfil público em `/app/psychologist/[id]` será implementado na TASK-15.
- Definir política final de privacidade para exposição de `wa.me` e futura trilha de legendas para vídeos de apresentação.
