# TASK-37: Instalação da Lectum como app/atalho no celular

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-37 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Experiência app-like / Mobile |
| Status | Pending |
| Dependências | TASK-01, TASK-12 |
| ADR alvo | ADR-0037 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `frontend/src/app` e `frontend/src/templates`, para encontrar o ponto correto de metadados globais e shell privado antes de criar estrutura nova.

## Contexto

Por enquanto a Lectum será entregue somente como site responsivo, mas a experiência mobile deve se aproximar de um aplicativo instalado. A forma correta para o MVP é tornar o frontend instalável como PWA/atalho na tela inicial, com sugestão contextual para o usuário adicionar a Lectum ao celular.

A comunicação deve usar o gênero definido para o produto: **"a Lectum"**. A copy principal recomendada é: **"Acesse a Lectum como um app"**.

Esta task não substitui app nativo e não deve misturar instalação do atalho com consentimento de notificações. Push notification, Web Push e permissão do navegador continuam separados das tasks de notificações.

## Objetivo

Permitir que o usuário mobile adicione a Lectum à tela inicial e acesse a plataforma em modo standalone/app-like, com orientação clara e respeitosa para Android/Chromium e iOS/Safari.

## Pré-requisitos e bloqueios

- Consultar `ARCHITECTURE.md` antes de criar qualquer componente/template novo.
- Consultar `PACKAGES.md`; a expectativa é **não instalar pacote novo** para esta task.
- Consultar `PROTO-INVENTORY.md`; se não houver tela específica para prompt de instalação, reutilizar a linguagem visual mobile existente do shell privado e registrar essa decisão no ADR.
- Se os ícones finais da marca não estiverem disponíveis em tamanho adequado para manifest/PWA, parar e registrar pendência em vez de criar marca temporária ou mock permanente.
- Se Builder/Quick Copy estiver acessível no cliente, usar como apoio visual; se não estiver, registrar limitação e usar referências locais de `_product/proto`.

## Escopo frontend

- Configurar a instalação PWA da Lectum no Next.js:
  - manifest com `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color` e ícones adequados;
  - metadados compatíveis com iOS, incluindo ícone Apple Touch e status bar quando aplicável;
  - detecção de modo standalone para não exibir sugestão quando a Lectum já estiver instalada/aberta como app.
- Criar sugestão mobile-first de instalação/atalho:
  - copy: **"Acesse a Lectum como um app"**;
  - explicar que o atalho ficará visível na tela inicial do celular, por privacidade;
  - CTA principal `Adicionar atalho`;
  - ações `Agora não` e `Não mostrar novamente`;
  - persistir localmente a recusa/cooldown no navegador, sem backend.
- Android/Chromium:
  - usar o evento `beforeinstallprompt` quando disponível;
  - chamar o prompt nativo somente após interação explícita do usuário.
- iOS/Safari:
  - exibir instruções manuais para `Compartilhar` > `Adicionar à Tela de Início` quando não houver prompt nativo.
- Integrar a sugestão no shell privado/mobile sem bloquear navegação e sem layout shift relevante.

## Escopo backend

- Nenhuma alteração backend prevista.
- Nenhuma migration prevista.
- Nenhum endpoint novo.

## Fora do escopo

- App nativo iOS/Android.
- Push notification, Web Push, Service Worker de notificações ou pedido de permissão de notificações.
- Offline-first, cache avançado de rotas privadas ou sincronização em background.
- Métricas de analytics persistidas em backend para instalação do atalho.
- Instalar bibliotecas PWA sem justificativa forte e ADR.
- Criar logo/ícone temporário, fake ou diferente da marca real da Lectum.

## Contrato técnico detalhado

Frontend esperado:

- Usar recursos nativos do Next.js para manifest/metadados sempre que compatível com a versão vigente do projeto.
- Procurar primeiro por layout/metadados globais existentes em `frontend/src/app` antes de criar arquivos novos.
- Procurar o shell/template privado existente em `frontend/src/templates` antes de criar um novo ponto de montagem para o prompt.
- O componente de sugestão deve ser client-side apenas onde depender de browser APIs (`beforeinstallprompt`, `matchMedia`, `navigator`, `localStorage`).
- Não acessar `localStorage` durante SSR.
- Não usar `<img>`; qualquer imagem exibida em UI deve usar `Image` de `next/image`. Ícones de manifest podem ser arquivos estáticos referenciados pelo manifest/metadados.
- Usar tokens de tema (`bg-background`, `bg-surface`, `text-foreground`, `border-border`, `text-primary`, etc.), sem cores hardcoded.
- Mobile-first obrigatório: base visual ~390px, com progressão para telas maiores.
- Separar instalação de atalho de notificações: não chamar `Notification.requestPermission` nesta task.

Packages usados:

- Nenhum pacote novo esperado.
- Se a execução provar necessidade de pacote, validar `PACKAGES.md`, registrar ADR antes da instalação e justificar por que APIs nativas/Next.js não bastam.

Persistência local:

- Pode usar `localStorage` para lembrar cooldown/recusa local do navegador.
- A ausência dessa preferência em outro dispositivo/navegador é aceitável nesta task e deve ser explicada no ADR.

## Critérios de aceite

- [ ] Manifest/metadados PWA configurados para a Lectum com `display: standalone`, `start_url`, `scope`, cores e ícones reais da marca.
- [ ] iOS recebe metadados/ícone compatíveis e instruções manuais quando o prompt nativo não existir.
- [ ] Android/Chromium usa `beforeinstallprompt` e só dispara o prompt após toque em `Adicionar atalho`.
- [ ] A sugestão mobile-first aparece apenas quando a Lectum não está em standalone e respeita `Agora não`/`Não mostrar novamente`.
- [ ] A copy usa **"Acesse a Lectum como um app"** e mantém o gênero **a Lectum**.
- [ ] A UI informa que o atalho ficará visível na tela inicial do celular, por privacidade.
- [ ] A task não solicita permissão de notificações nem implementa Web Push/offline-first.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Nenhum pacote novo foi instalado, salvo se `PACKAGES.md` e ADR justificarem explicitamente.
- [ ] UI mobile-first; nenhum `<img>` cru em UI, somente `next/image` quando imagem for renderizada.
- [ ] Builder/Quick Copy foi usado quando disponível, ou a limitação foi registrada e as referências locais/proto foram citadas.
- [ ] `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` executados sem erro.
- [ ] Browser local validado em viewport mobile, incluindo estado não instalado, standalone e fluxo iOS/manual ou equivalente documentado.
- [ ] ADR criado ou atualizado em `adrs/` registrando decisão PWA/atalho e separação de notificações.
- [ ] Commit criado com mensagem convencional e publicado com `git push`.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local com viewport mobile (~390px)
- Verificação manual/documentada de:
  - estado normal no navegador;
  - estado standalone/app-like;
  - comportamento Android/Chromium com `beforeinstallprompt`, quando disponível;
  - fallback iOS/Safari com instruções manuais.

## Notas de execução

- A sugestão deve ser discreta e contextual; não bloquear primeiro acesso nem impedir tarefas críticas do usuário.
- Preferir exibir em área privada/autenticada, após o usuário já demonstrar intenção de uso da plataforma, para evitar fricção no cadastro/login.
- Se a execução escolher regra de cooldown (por exemplo, dias entre exibições ou número mínimo de acessos), registrar no ADR.
- A task deve preservar a separação conceitual: instalar atalho é conveniência de acesso; notificações exigem consentimento próprio e não entram neste escopo.