# TASK-08: Boas-vindas do paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-08 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Paciente |
| Status | Completed |
| Dependências | TASK-07 (TASK-12 quando o shell privado existir) |
| ADR alvo | ADR de onboarding paciente |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Boas-vindas Paciente - 1.jpg` | `figma-design-frame-44-Boas-vindas-Paciente---1.html` |
| `_product/proto/Boas-vindas Paciente - 2.jpg` | `figma-design-frame-45-Boas-vindas-Paciente---2.html` |
| `_product/proto/Boas-vindas Paciente - 3.jpg` | `figma-design-frame-46-Boas-vindas-Paciente---3.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Após cadastro e verificação, o paciente passa pelo onboarding (fluxograma 19.2): Onboarding Inicial → Informações Pessoais → Escolha do Objetivo → Home. As três telas de boas-vindas são a parte introdutória; a conclusão deve persistir em `patient_profile` (criado na TASK-07), não em localStorage, para não repetir o onboarding em outro device.

## Integração com backend (modelo já definido em DATA-MODEL)

Usa o `patient_profile` da TASK-07. Campos relevantes (ver `DATA-MODEL.md`): `goal` (`"encontrar_psicologo" | "conhecer_comunidade"`), `birthdate?`, `phone?`, `onboarding_completed_at?` (null = pendente).

Endpoints a criar (privados, módulo `private/patient`, padrão controller/service/repository de `ARCHITECTURE.md`):

- **`GET /api/private/patient/profile`** — retorna o `patient_profile` do `req.auth`, incluindo `onboarding_completed_at` (para o frontend decidir se mostra o onboarding). Cria/garante o profile se faltar.
- **`PUT /api/private/patient/onboarding`** — body `{ name?, gender?, goal?, birthdate?, phone? }`; grava os campos aplicáveis e seta `onboarding_completed_at=now`. Idempotente: se já concluído, retorna o estado atual sem erro.

Ambos exigem `Authorization: Bearer` + `x-device` (middleware `_auth`) e devem validar `req.auth.role === "paciente"`.

## Objetivo

Entregar o onboarding inicial do paciente com progresso real persistido em `patient_profile` e entrada no shell privado, sem repetição em re-login.

## Pré-requisitos e bloqueios

- Depende de sessão paciente real e do `patient_profile` (TASK-07).
- Idealmente roda após o shell privado (TASK-12); se a TASK-12 ainda não existir, usar um shell mínimo e registrar a dependência.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/patient/welcome` (ou rota dentro do shell privado da TASK-12).

Implementação esperada:

- Fluxo em etapas (carrossel) com voltar/avançar, progresso e conclusão, refletindo as 3 telas + dados de identificação e objetivo.
- Campos de identificação e objetivo via fundação da TASK-02 (controllers: input e cards/chips controlados por React Hook Form/Zod).
- Ao concluir, chamar o caller de `PUT /api/private/patient/onboarding`; só então redirecionar para a Home privada do paciente.
- Na entrada, consultar `GET /api/private/patient/profile`: se `onboarding_completed_at` já preenchido, pular o onboarding e ir para a Home.
- Não persistir conclusão apenas em localStorage/redux; a verdade é o backend.
- Adicionar `req`/`callers` em domínio `patient` e query key (ex.: `keys.patient.profile`) em `frontend/src/api/cache/keys.ts`.

## Escopo backend

**Guarda de papel:** estes endpoints são exclusivos de paciente, vivem sob `/api/private/patient/*` e são protegidos por `requireRole("paciente")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`). O escopo de ownership usa `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Módulo `backend/src/modules/api/private/patient/profile` (GET) e `.../onboarding` (PUT) no padrão controller/service/repository.
- Registrar rotas em `write.ts` com prefixo `/api/private/patient/...`.
- Validar `role="paciente"` e existência do profile; criar profile vazio na primeira leitura se necessário.
- Validadores com o pacote local; respostas via `send`/`error`/`error500` e traduções PT-BR.
- Não criar paciente/seed fake para validar a tela.

Modelos/tabelas: `patient_profile` (TASK-07 / `DATA-MODEL.md`). Sem modelo novo.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/patient/welcome/{page,logic}.tsx` (+ `use-form.tsx` para Informações Pessoais).
- HTTP em `frontend/src/api/req/patient/index.ts` com `callEndpoint` + `handleReq`.
- Hooks em `frontend/src/api/callers/patient/index.tsx` (query para profile, mutation para onboarding; invalidar a query após concluir).
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shell em `frontend/src/templates` (privado da TASK-12 quando existir).
- Reutilizar `registry/new-york-v4/ui` e `components/ui`; campos via controllers da TASK-02.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/private/patient/{profile,onboarding}`.
- Middleware `_auth` (Bearer + `x-device`).
- Respostas e traduções padrão; Prisma conforme `DATA-MODEL.md`.

Packages permitidos nesta task:

- TanStack Query, React Hook Form, Zod (frontend), Prisma (backend). Sem package novo sem ADR.

Regras anti-recriação específicas:

- Não criar client HTTP, store, auth flow, validator ou design system paralelo.
- Não persistir progresso só no cliente.
- Não usar `sample/` como referência direta.
- Não instalar package novo sem `PACKAGES.md` + ADR.

## Estados obrigatórios

- Loading da consulta de profile e da conclusão.
- Erro de rede/API em PT-BR.
- Estado "onboarding já concluído" (pula direto para Home).
- Sucesso com redirecionamento para a área privada.
- Responsividade mobile-first conforme imagens.

## Fora do escopo

- Implementar Home/busca/comunidade (tasks próprias).
- Criar dados fake, seed ou mock.
- Refatorar módulos não relacionados.

## Critérios de aceite

- [x] As referências visuais foram consultadas via Builder Quick Copy ou imagens locais citadas.
- [x] Onboarding em etapas com voltar/avançar e progresso.
- [x] Conclusão persiste em `patient_profile.onboarding_completed_at` via `PUT /api/private/patient/onboarding` real.
- [x] `GET /api/private/patient/profile` evita repetir o onboarding em re-login/outro device.
- [x] Endpoints privados exigem sessão e validam `role="paciente"`.
- [x] Rotas sob `/api/private/patient/*` exigem `requireRole("paciente")` (fail-closed), conforme ADR-0002.
- [x] Campos usam a fundação da TASK-02.
- [x] Conclusão não fica apenas em localStorage/redux.
- [x] Nenhum mock, paciente fake ou seed artificial foi usado.
- [x] ADR criado/atualizado em `adrs/`.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build` sem erros.
- [x] Browser local validou onboarding completo e o caso "já concluído".
- [x] Commit criado com mensagem convencional.

## Execucao TASK-08

- Builder/Quick Copy nao estava disponivel como ferramenta direta nesta sessao; foram usadas as imagens locais `_product/proto/Boas-vindas Paciente - 1.jpg`, `_product/proto/Boas-vindas Paciente - 2.jpg` e `_product/proto/Boas-vindas Paciente - 3.jpg`.
- Implementado `/patient/welcome` com UI mobile-first em 3 etapas: acolhimento, informacoes pessoais e escolha do objetivo.
- Campos de identificacao usam a fundacao da TASK-02 (React Hook Form, Zod e controller `input`); genero e objetivo usam chips/cards controlados pelo mesmo form.
- Criados `GET /api/private/patient/profile` e `PUT /api/private/patient/onboarding` em `backend/src/modules/api/private/patient/*`, sem criar modelo novo.
- Criado `requireRole("paciente")` fail-closed e aplicado no mount de `/api/private/patient/*` em `write.ts`, com reforco redundante nos services.
- A conclusao persiste `gender`, `goal` e `onboarding_completed_at` em `patient_profile`, e atualiza `user.name`; o `PUT` e idempotente quando o onboarding ja esta concluido.
- Redirecionamento de pacientes apos login/verificacao passa por `/patient/welcome`; se o profile ja estiver concluido, a rota pula para `/dashboard`.
- Como a TASK-12 ainda nao existe formalmente, foi usado o `PrivateTemplate` atual como shell minimo; a substituicao pelo shell privado mobile ficou registrada no ADR.
- ADR registrado: `adrs/0013-onboarding-boas-vindas-paciente.md`.
- Validacoes executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - browser local em `http://localhost:3000/patient/welcome`
- A validacao criou usuarios temporarios por endpoints reais, testou profile, guard `403` para papel divergente, fluxo completo no browser, skip de onboarding ja concluido e removeu os registros ao final sem deixar dado fake permanente.

## Ajuste visual solicitado em 2026-06-04

- Removidos o cabecalho privado do onboarding e as copias auxiliares de etapa/progresso salvo.
- Etapa 1 passou a usar o asset anexado `frontend/public/images/patient-welcome-hug.svg` com `next/image` e a copia de acolhimento solicitada.
- Etapa 2 removeu data de nascimento/telefone da interface e passou a coletar nome e genero, alinhado ao prototipo `Boas-vindas Paciente - 2`.
- Etapa 3 removeu copias auxiliares e ajustou a descricao do objetivo "Escolher um psicólogo".
- O backend passou a aceitar `name` e `gender` no `PUT /api/private/patient/onboarding`; `gender` foi adicionado a `patient_profile`.
- Migration aplicada durante a execucao: `20260605001000_add_patient_profile_gender`.
- Validacao adicional executada em browser local (`http://localhost:3000/patient/welcome`) com usuario temporario criado por endpoint real, confirmando as copias removidas/alteradas, persistencia de `gender`, `goal`, `onboarding_completed_at` e atualizacao de `user.name`; o usuario temporario foi removido do banco ao final.

## Ajuste visual solicitado em 2026-06-04 22h

- Etapa 1 trocou a imagem PNG pelo icone SVG anexado em `frontend/public/images/patient-welcome-hug.svg`.
- Etapa 2 removeu o botao "Voltar".
- Etapa 3 removeu os botoes "Finalizar boas-vindas" e "Voltar"; a conclusao agora acontece ao selecionar um objetivo, mantendo a persistencia real no `PUT /api/private/patient/onboarding`.

## Validação mínima

- `pnpm --dir backend check` e `pnpm --dir backend build`.
- `pnpm --dir frontend check` e `pnpm --dir frontend build`.
- `pnpm check`.
- Browser local em `/patient/welcome`.

## Notas para executor

O onboarding só termina quando o backend confirma. Se o shell privado (TASK-12) ainda não existir, use um container mínimo e registre a dependência. Concluir em commit próprio.

## Ajuste posterior em 2026-06-05: saudacao nominal e fluxo em 2 telas

- Pedido direto de produto: a primeira tela de `/patient/welcome` passou a exibir
  `[NOME], bem-vindo à Lectum`, usando `user.name` já capturado no cadastro/login real.
- A tela intermediária "Conte-nos sobre você" foi removida do fluxo; o onboarding agora
  tem 2 etapas: acolhimento nominal e escolha do objetivo.
- O progresso visual foi reduzido de 3 para 2 barras, e a seleção de objetivo continua
  concluindo o onboarding pelo `PUT /api/private/patient/onboarding` real.
- O frontend deixou de reenviar `name`/`gender` nesta etapa; o nome canônico vem do
  cadastro do usuário, e o backend permanece compatível com campos opcionais legados.

### Validação do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm check`
- Browser local em `http://localhost:3000/patient/welcome`, viewport mobile 390x884,
  com usuário temporário criado via endpoint real, validou a saudação `Tulio Codex,
  bem-vindo à Lectum`, ausência da tela "Conte-nos sobre você" e etapa final direta
  "Como você prefere começar?".
- O usuário temporário da validação foi removido do banco ao final.

## Ajuste posterior em 2026-06-27: layout premium com nova identidade Lectum

- Pedido direto de produto: substituir a composição visual das duas telas atuais por uma
  experiência mais premium, baseada nas referências anexadas `ChatGPT Image 26 de jun. de
  2026, 22_24_27.png` e `ChatGPT Image 26 de jun. de 2026, 21_42_25.png`.
- A etapa 1 passou a exibir o novo `LectumSymbolIcon` SVG, título genérico
  `Bem-vindo à Lectum`, texto de acolhimento e CTA grande `Vamos começar`.
- A etapa 2 passou a usar cards grandes para `Encontrar um profissional` e
  `Participar da comunidade`, mantendo os valores reais de domínio
  `encontrar_psicologo` e `conhecer_comunidade`.
- A paisagem/caminho azul foi implementada como SVG inline tokenizado, sem `<img>` e sem
  adicionar assets rasterizados ou pacotes novos.
- Foram adicionadas animações decorativas leves com suporte a `prefers-reduced-motion`.
- O fluxo de backend e persistência não mudou: `GET /api/private/patient/profile` continua
  evitando repetição do onboarding e a escolha do objetivo continua concluindo via
  `PUT /api/private/patient/onboarding` real.
- ADR registrado: `adrs/0171-boas-vindas-paciente-layout-premium.md`.

### Validação do ajuste 2026-06-27

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/headless em `http://localhost:3000/patient/welcome`, viewport 390x884,
  com usuário paciente temporário criado via endpoint real, validou a tela 1, o CTA
  `Vamos começar` e a tela 2. O usuário temporário foi removido do banco ao final.


## Refino visual solicitado em 2026-06-27: fidelidade as referencias premium

- Pedido direto de produto apos validacao em browser: refazer as duas telas para ficarem muito mais proximas das referencias anexadas pelo usuario.
- A composicao passou a usar coordenadas mobile-first do viewport 390x844: textos, CTA, cards e paisagem foram reposicionados com medidas proporcionais as imagens de referencia.
- A etapa 1 recebeu ajuste fino de escala do simbolo, titulo, copy, CTA e caminho em S; a etapa 2 recebeu paisagem superior independente, bloco de titulo/copy e cards fixados por proporcao de altura para preservar a referencia no mobile.
- O simbolo Lectum foi simplificado como SVG limpo e escalavel no componente `LectumSymbolIcon`, sem dependencia nova e sem usar `<img>`.
- O fluxo de dados nao mudou: a escolha do objetivo continua persistindo pelo endpoint real `PUT /api/private/patient/onboarding`.
- Validacao visual feita no browser/headless com viewport 390x844 usando usuario temporario criado por endpoint real; os registros temporarios foram removidos ao final.

## Refino visual solicitado em 2026-06-27: fundos SVG fornecidos pelo produto

- Pedido direto de produto: usar os arquivos anexados `tela 1.svg` e `tela 2.svg` para manter a ilustracao de background exatamente como nas referencias.
- Os SVGs recebidos foram inspecionados e identificados como exportacoes com PNGs embutidos e mascara, sem textos/cards/botoes como camadas editaveis.
- Foram gerados assets normalizados em `frontend/public/images/patient-welcome/welcome-intro-background.svg` e `frontend/public/images/patient-welcome/welcome-choice-background.svg`, preservando a ilustracao e a proporcao mobile das referencias.
- A rota `/patient/welcome` passou a renderizar esses fundos com `next/image`, mantendo o simbolo, textos, CTA e cards como UI real/acessivel por cima do background.
- A recriacao manual da paisagem em SVG inline foi removida da tela para evitar divergencia visual.
- O fluxo de dados nao mudou: `GET /api/private/patient/profile` e `PUT /api/private/patient/onboarding` continuam sendo usados sem mock.
- ADR atualizado: `adrs/0171-boas-vindas-paciente-layout-premium.md`.
- Validacao repetida em 2026-06-27: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local/headless em 390x844 com usuario temporario real removido ao final.

## Ajuste visual solicitado em 2026-06-27: logo e copy final

- A primeira tela passou a usar o SVG anexado `Logo icon.svg` como simbolo Lectum, preservando o tamanho visual atual do icone.
- O texto do CTA `Vamos comecar` foi reduzido para ficar proporcional ao botao e ao icone de seta.
- A segunda tela deixou de exibir o texto auxiliar abaixo do titulo e o badge da opcao comunidade foi alterado para `Espaco gratuito`.
- Validacao: `pnpm --dir frontend check`, `pnpm --dir frontend build` e browser local/headless em 390x844 com usuario temporario real removido ao final.

## Ajuste posterior em 2026-06-27: responsividade desktop/mobile do layout premium

- Pedido direto de produto: ajustar a responsividade das duas telas premium de `/patient/welcome`, pois em desktop o container ficava largo/alto demais e a segunda tela cortava parte dos cards.
- O shell visual das boas-vindas passou a preservar a proporcao mobile de referencia `390x844` em viewports desktop, com altura limitada por `calc(100dvh - 3rem)` e largura proporcional.
- Os elementos posicionados sobre os fundos SVG agora usam coordenadas relativas ao container, nao ao viewport da janela, mantendo a composicao consistente quando o container e redimensionado.
- Em mobile, o fluxo continua ocupando `100dvh` e preserva a experiencia original das referencias.
- Nao houve alteracao em backend, banco, contratos de API ou pacotes.
- Validacao: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check` e browser/headless em desktop `1920x879` e mobile `390x844` com usuario temporario real removido ao final.

## Ajuste posterior em 2026-06-27: tela cheia no desktop com arte original expandida

- Pedido direto de produto: no desktop, as duas telas de `/patient/welcome` devem ocupar a tela inteira, inclusive no eixo horizontal, mas sem alterar a experiencia mobile.
- A implementacao passou a usar fontes de background separadas por breakpoint: mobile continua apontando para os SVGs originais `welcome-intro-background.svg` e `welcome-choice-background.svg`; desktop usa `welcome-intro-background-desktop.svg` e `welcome-choice-background-desktop.svg`.
- Os assets desktop foram gerados a partir das mesmas camadas PNG e mascaras dos SVGs originais, apenas com expansao horizontal do layer de paisagem para preencher `3840x2160`, evitando redesenhar a ilustracao ou trocar a direcao visual.
- O shell em `sm+` agora usa `width: 100%`, `height: 100dvh` e `max-width: none`; as classes base mobile nao foram alteradas.
- Nao houve alteracao em backend, banco, contratos de API, formularios ou pacotes.
- Validacao: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check` e browser/headless em desktop `1920x879` e mobile `390x844` com usuario temporario real removido ao final.
