# ADR-0027: Perfil gratuito sem documentos CRP

## Status

Accepted

Nota de 2026-06-12: a decisão original de bloquear vídeo no plano gratuito foi supersedida pela ADR-0063. O recorte gratuito sem documento CRP permanece válido, mas vídeo de apresentação passou a ser permitido para todos os psicólogos.

## Contexto

A TASK-18 completa permanece bloqueada por depender da TASK-11, que exige storage privado R2 para documentos CRP. Ao mesmo tempo, o fluxo de produto do plano gratuito precisa permitir que o psicólogo configure informações públicas básicas depois de informar o WhatsApp, sem validar CRP pela API.

O protótipo `_product/proto/Editar Perfil - Psicólogo.jpg` e o ajuste visual enviado pelo usuário (`Html → Body.png`) mostram uma edição mais completa do perfil. O usuário pediu que, no plano gratuito, CPF, dados de registro e WhatsApp sejam editáveis, que a regional venha de dropdown no formato do CFP, e que sejam adicionados campos declaratórios de apresentação, filtros, benefícios, formação, atendimento e endereço.

## Decisão

Manter o recorte separado da TASK-18 chamado TASK-18A, limitado ao perfil gratuito sem documentos CRP, e ampliar o recorte para persistir dados declaratórios do perfil gratuito.

O backend expõe `/api/private/psychologist/free-profile` protegido por `requireRole("psicologo")`. CPF é salvo em `psychologist_profile.cpf`; o registro livre é serializado em `psychologist_profile.crp` como `regional/registro`; WhatsApp é salvo em `psychologist_profile.whatsapp`; foto profissional é enviada por upload real para o R2 usando a infraestrutura existente em `backend/src/config/multer` e a URL pública streamada por `/public/files/psychologist/avatar/*` é persistida em `user.avatar`.

O avatar do perfil gratuito também pode ser removido por `DELETE /api/private/psychologist/free-profile/avatar`. A remoção limpa `user.avatar` e tenta apagar o objeto anterior do bucket público quando a URL pertence ao prefixo interno `psychologist/avatar/*`. No frontend, URLs relativas ou absolutas de `/public/files/*` são normalizadas contra `NEXT_PUBLIC_API_URL`, e o componente `Image` usa `unoptimized` nesses arquivos para evitar falha de exibição causada pelo otimizador do Next ao buscar mídia servida pelo backend. A UI concentra alteração e exclusão em um único botão de ações junto ao avatar, sem tornar a foto inteira um controle de upload.

Foram adicionados campos opcionais em `psychologist_profile` para gênero, raça/cor, religião, público atendido, benefícios comerciais, formações acadêmicas, dias disponíveis e endereço profissional. A lista de regionais do dropdown segue a lista oficial do CFP em `https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/`.

No plano gratuito, vídeo de apresentação permanece bloqueado: a UI exibe CTA de upgrade e o backend mantém `psychologist_profile.video_url=null` nesse recorte. Upload de vídeo fica reservado para o plano profissional.

O recorte não cria nem altera `professional_document`, não faz upload CRP, não altera `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`, e não concede selo de verificado.

Em 2026-06-08, o menu privado de perfil passou a reutilizar a mesma normalizacao de midia publica do formulario de edicao, garantindo que `user.avatar` salvo por upload real seja exibido fora da tela de edicao. O selo visual de perfil verificado foi padronizado com o SVG `Container.svg` enviado pelo usuario, implementado como componente inline reutilizavel para evitar `<img>` e preservar o uso de assets seguros no frontend.

Na mesma revisao, a escolha de tema deixou de usar opcao `system` por padrao: `next-themes` fica com `defaultTheme="light"` e a tela de perfil exibe um switch binario para ativar/desativar o modo escuro. A acao "Verificar WhatsApp" foi removida do menu de perfil porque o recorte gratuito trata o WhatsApp como telefone profissional editavel, nao como verificacao OTP nessa tela.

Para endereco profissional, a selecao de cidade passou a usar uma lista local gerada a partir da API oficial de Localidades do IBGE em 2026-06-08 (`/localidades/municipiosãorderBy=nome`). A lista fica versionada no frontend em `brazil-cities.ts`, sem pacote novo e sem dependencia de API externa em runtime; apos selecionar UF, a UI mostra as cidades daquele estado em um campo pesquisavel.

O erro "Estrutura da requisicao invalida" ao salvar o perfil gratuito foi corrigido no controller do backend: como a rota nao usa o middleware `validator`, o service agora recebe explicitamente `auth: req.auth` e `b: req.body`, em vez de esperar `req.b`.


Em 2026-06-08, a exibicao de perfil publico foi alinhada ao modelo comercial: selo verificado passa a depender exclusivamente de uma `professional_subscription` ativa cujo plano nao seja `gratuito`. `cfp_verified_at` continua existindo para futuros fluxos de validacao profissional, mas nao concede selo no perfil gratuito. A regra foi aplicada na listagem de psicologos, no perfil publico, em favoritos/seguindo e no menu privado.

O backend tambem passou a calcular `available_today` com base em `psychologist_profile.available_days` e no fuso `America/Sao_Paulo`, devolvendo o indicador para cards e perfil publico. A UI apenas renderiza o indicador quando a API confirma disponibilidade no dia.

A exibicao de CRP foi padronizada no frontend como `Psicologo &bull; CRP 00/000000`, reaproveitando o campo declaratorio `psychologist_profile.crp` sem validar CRP por API neste recorte.

Para o plano gratuito, abordagens ganharam limite explicito `approach_limit=1` no contrato do free-profile. O frontend bloqueia novas selecoes acima desse limite, e o backend rejeita payloads acima do limite para impedir burla por requisicao manual.


Em 2026-06-08, a UI de catalogos do perfil gratuito foi ajustada para alinhar Especialidades e Abordagens ao print anexado pelo usuario: ambos usam um campo compacto com tags removiveis, placeholder interno e dropdown de opcoes reais. A decisao preserva os limites do backend (`specialty_limit` e `approach_limit`) e nao altera contratos de API nem dados persistidos. Servicos permanece como chips porque nao foi citado no pedido e ja tem limite unitario visivel.

Em 2026-06-08, o ajuste de avatar da tela `/app/professional/profile/setup` passou a usar uma modal dedicada, inspirada no fluxo de redes sociais, para permitir enquadramento circular por arraste antes do upload real. A decisao preserva o endpoint atual de avatar e nao cria dado local permanente.

Na mesma revisao, o bloco "Video de Apresentacao" passou a concentrar acoes em um unico menu "Editar". Trocar e remover video continuam usando os endpoints reais ja existentes; a opcao "Adicionar imagem de capa do video" ficou exposta como intencao de produto ate haver contrato backend.

Em 2026-06-09, a capa de video passou a ter contrato real: `psychologist_profile.video_cover_url`, upload para o prefixo publico `psychologist/video-cover/*`, rota privada `POST /api/private/psychologist/free-profile/video/cover` e leitura publica restrita por `/public/files/psychologist/video-cover/*`. A capa usa o mesmo entitlement de video (`plan.can_upload_video=true`) e e removida quando o video e trocado/removido ou quando o perfil deixa de ter recurso profissional.

Na mesma revisao, `psychologist_profile.show_experience_tag` foi criado com default `true`. O campo controla somente a exibicao publica da tag de tempo de experiencia calculada de `crp_registration_date`, sem expor a data interna nem alterar o bloco de estatisticas do perfil.

## Consequências

- Psicólogos gratuitos conseguem configurar um perfil mais próximo do protótipo sem desbloquear a TASK-18 completa.
- CPF, regional, registro e WhatsApp são campos declaratórios no plano gratuito; não representam validação profissional.
- Foto profissional usa upload real no R2 público; o endpoint público de leitura limita exposição aos avatares em `psychologist/avatar/*`.
- Psicólogos gratuitos podem excluir a foto profissional; a limpeza do objeto R2 é best-effort e não bloqueia a atualização de perfil.
- A exibição do avatar não depende mais da origem persistida em `BASE`; a UI resolve mídia pública pelo `NEXT_PUBLIC_API_URL` ativo.
- Vídeo não é permitido no plano gratuito; qualquer entrada anterior é limpa para `null` ao atualizar o perfil gratuito.
- Religião e múltiplas formações acadêmicas passam a compor o perfil gratuito como dados declaratórios.
- A bio curta do card do perfil gratuito fica limitada a 120 caracteres no frontend e no backend, com contador visual no controller de input.
- A TASK-18 continua bloqueada para documentos/CRP, validação profissional e perfil profissional completo.
- O plano gratuito limita especialidades a 3 e serviços a 1.
- A publicação do perfil gratuito não equivale a validação profissional por CRP.
- O menu de perfil nao exibe mais "Sessao ativa" nem "Verificar WhatsApp".
- O modo claro e o padrao visual; modo escuro e uma preferencia local ativada por switch.
- A lista de cidades aumenta o bundle estatico, mas remove dependencia externa de runtime e cumpre o requisito de listar todos os municipios por UF.

- O selo verificado passa a representar assinatura paga ativa, nao apenas cadastro CFP preenchido.
- Psicologos gratuitos publicados aparecem na busca sem selo, desde que `published=true` e atendam aos requisitos de publicacao.
- A disponibilidade "Disponivel hoje" fica consistente entre listagem e perfil publico porque e calculada no backend.
- O plano gratuito permanece limitado a uma abordagem, alem dos limites ja existentes de especialidades e servicos.

- Especialidades e Abordagens ficam visualmente mais proximas do prototipo mobile, sem novo package e sem catalogos mockados.
- O controle continua usando os catalogos reais retornados por `/api/private/psychologist/free-profile` e os mesmos limites de plano.
- O avatar fica mais facil de enquadrar sem alterar contrato, storage ou endpoint.
- A capa customizada de video usa storage real no mesmo padrao de midia publica do perfil e evita previews antigos ao limpar `video_cover_url` junto com `video_url`.
- A tag de tempo de experiencia fica opt-out pelo profissional, preservando default visivel e sem expor o dado bruto de registro CRP.

## Validação

- `pnpm --dir backend exec prisma migrate dev --name add_free_profile_details`
- `pnpm --dir backend exec prisma migrate dev --name add_free_profile_media_religion`
- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/HTTP sem sessão em `/app/professional/profile/setup` retornou 307 para login.
- Backend local em `/health` respondeu `200` com status `ok`.
- 2026-06-08: `pnpm --dir frontend check`
- 2026-06-08: `pnpm --dir backend check`
- 2026-06-08: `pnpm --dir backend build`
- 2026-06-08: `pnpm --dir frontend build`
- 2026-06-08: `pnpm check`
- 2026-06-08: Chrome headless local em `/app/profile` e `/app/professional/profile/setup` redirecionou para login sem sessao; validacao autenticada visual ficou limitada por nao haver token real acessivel ao agente sem criar mock.
- 2026-06-08 complementar: `pnpm --dir frontend check`
- 2026-06-08 complementar: `pnpm --dir backend check`
- 2026-06-08 complementar: `pnpm --dir backend build`
- 2026-06-08 complementar: `pnpm --dir frontend build`
- 2026-06-08 complementar: `pnpm check`
- 2026-06-08 complementar: HTTP local `/health` respondeu 200; rotas privadas `/app/profile`, `/app/professional/profile/setup` e `/app/psychologists` responderam 307 sem sessao, mantendo protecao. Validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.
- 2026-06-08 tags de catalogo: `pnpm --dir frontend check`
- 2026-06-08 tags de catalogo: `pnpm --dir frontend build`
- 2026-06-08 tags de catalogo: `pnpm check`
- 2026-06-08 tags de catalogo: HTTP local em `/app/professional/profile/setup` respondeu 307 sem sessao, mantendo protecao; validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.
- 2026-06-08 midias do setup: `pnpm --dir frontend check`
- 2026-06-08 midias do setup: `pnpm --dir frontend build`
- 2026-06-08 midias do setup: `pnpm check`
- 2026-06-08 midias do setup: HTTP local em `/app/professional/profile/setup` respondeu 307 sem sessao, e Chrome headless local renderizou a pagina de login apos o redirect; validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.
- 2026-06-09 capa de video e experiencia: `pnpm --dir backend db:migrate --name add_profile_video_cover_experience_tag`
- 2026-06-09 capa de video e experiencia: `pnpm --dir backend check`
- 2026-06-09 capa de video e experiencia: `pnpm --dir backend build`
- 2026-06-09 capa de video e experiencia: `pnpm --dir frontend check`
- 2026-06-09 capa de video e experiencia: `pnpm --dir frontend build`
- 2026-06-09 capa de video e experiencia: `pnpm check`
- 2026-06-09 capa de video e experiencia: HTTP local em `/app/professional/profile/setup` respondeu 307 sem sessao, mantendo a protecao da rota privada; validacao visual autenticada ficou limitada por nao haver token real acessivel ao agente sem criar mock.

## Atualizacao em 2026-06-12 - retorno contextual da edicao de perfil

A seta de retorno da tela `/app/professional/profile/setup` passou a usar `router.back()` quando houver historico no navegador, em vez de navegar sempre para `/app/profile`. A decisao preserva o contexto de entrada: se o psicologo abriu a edicao pelo perfil publico, volta ao perfil publico; se veio de outra tela interna, volta para essa tela.

Como fallback para acesso direto sem historico, o frontend usa o perfil publico do psicologo autenticado (`/app/psychologist/:id`) quando o id estiver carregado, ou `/app/profile` enquanto os dados ainda nao estiverem disponiveis. O ajuste nao altera contratos de API, persistencia nem regras de dominio.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessao, preservando protecao da rota privada.

## Atualização em 2026-06-12 - retorno fixo para o menu privado do psicólogo

A decisão de retorno contextual da edição de perfil foi substituída por decisão de produto posterior: o controle textual `Voltar ao perfil` da rota `/app/professional/profile/setup` deve sempre levar para `/app/profile`, o menu privado do perfil do psicólogo. O perfil público permanece acessível por ação própria (`Ver perfil público`), evitando que a ação de retorno dependa do histórico do navegador ou leve o profissional para uma tela pública quando a intenção é voltar ao menu de perfil.

Validações:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessão.

## Ajuste complementar em 2026-06-21 - chips selecionados sem sombra

A tela de edicao profissional (`/app/professional/profile/setup`) removeu a sombra projetada dos chips selecionados nos grupos `Servicos`, `Publico` e `Dias com horarios disponiveis`.

Decisao:

- manter o contraste do estado selecionado por cor de fundo, texto e borda primaria;
- remover a sombra azul e o anel persistente do estado marcado, usando `shadow-none`;
- preservar os estados de foco acessiveis via `focus-visible` herdados do chip base;
- nao alterar contratos, backend, dados persistidos, limites de plano ou catalogos reais.

Validacao:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local autenticado em `/app/professional/profile/setup` respondeu `200`.
- Conferencia estatica confirmou os chips marcados sem `shadow-[0_8px_18px_rgb(48_140_232_/_20%)]` e sem `ring-1 ring-primary/20`.

## Ajuste complementar em 2026-06-30 - orientação de visibilidade do perfil

A tela `/app/professional/profile/setup` passou a exibir uma descrição abaixo de `Perfil visível para pacientes`: em caso de férias ou agenda lotada, o psicólogo pode desabilitar a visibilidade para pausar a exibição do perfil aos pacientes.

Decisão:

- manter a regra de domínio existente (`psychologist_profile.published`) sem criar novo estado de agenda, férias ou indisponibilidade;
- usar apenas copy explicativa no próprio checkbox, porque o pedido é orientar o profissional sobre o controle já persistido;
- preservar layout mobile-first com texto em `text-muted`, sem criar componente novo nem alterar backend.

Validações:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- HTTP local em `/app/professional/profile/setup` respondeu `307` sem sessão de CLI.
- Verificação estática confirmou a nova copy no bundle de desenvolvimento da rota.


## Ajuste complementar em 2026-08-10 - placeholders dos catalogos de tags

A tela `/app/profissional/perfil/configurar` refinou os campos de tags de `Especialidades` e `Abordagens` para que o placeholder interno fique sempre em linha propria abaixo das tags selecionadas.

Decisao:

- manter o componente `CatalogTagField` existente, sem criar controle paralelo;
- usar o mesmo tamanho tipografico das tags selecionadas (`text-[0.68rem]`) para `Adicione uma especialidade...` e `Adicione uma abordagem...`;
- aplicar `basis-full`, `w-full` e `whitespace-nowrap` no botao de placeholder para evitar que ele dispute linha com as tags ou quebre a frase no mobile;
- preservar catalogos reais, limites de plano, dropdown e remocao de tags sem alteracao de backend, Prisma, packages ou contratos.

Validacoes:

- `pnpm --dir frontend exec biome check --write src/app/app/professional/profile/setup/components/catalog-fields.tsx src/app/app/professional/profile/setup/views/professional-profile-setup.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build` (reexecutado com sucesso apos limpar apenas o artefato local gerado `frontend/.next`; a primeira tentativa falhou por lock/trace inconsistente de build anterior)
- `pnpm check:version`
- `pnpm check` (falhou em `check:cycles` por ciclos preexistentes/concorrentes em arquivos de comunidade fora deste ajuste: `app/app/community/[slug]/post/new/logic.tsx` -> views -> `app/app/community/[slug]/logic.tsx` -> views -> post/new)
- Dev server local: `/version` respondeu `200`; a rota legada redirecionou para a rota canonica em PT-BR e a rota canonica privada redirecionou para login sem sessao.
