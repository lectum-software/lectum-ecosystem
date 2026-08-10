# TASK-148: Safe area iOS/PWA para elementos inferiores

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-148 |
| Prioridade | P0 |
| Esforço | P |
| Fase | Mobile/PWA / Regressão visual |
| Status | Completed |
| Dependências | TASK-12, TASK-37, TASK-43 |
| ADR alvo | ADR-0444 |

## Contexto

Em capturas reais de iPhone enviadas em 2026-08-10, a navegação inferior da Lectum aparece mais
apertada contra a borda inferior do que referências sociais como LinkedIn e TikTok. A mesma sensação
de aperto aparece em elementos fixos de borda inferior, especialmente a barra de escrever novo
comentário no detalhe de post/thread.

O problema é transversal de UI mobile/PWA: elementos com `position: fixed` ou `sticky` próximos ao
rodapé precisam reservar uma folga mínima mesmo quando `env(safe-area-inset-bottom)` retorna `0px`, e
também precisam somar a safe area real no iPhone/PWA quando ela existir. A aplicação já usa
`env(safe-area-inset-bottom)` em pontos isolados, mas sem uma política de respiro mínimo consistente.

Referências visuais:

- Capturas enviadas pelo usuário:
  - `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-10 at 08.51.49.jpeg` (LinkedIn);
  - `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-10 at 08.51.34.jpeg` (TikTok);
  - `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-10 at 08.50.26.jpeg` (Lectum).
- `_product/proto/Feed Comunidade.jpg` e `_product/proto/Dentro do Post.jpg` para preservar a
  hierarquia mobile-first da comunidade em base ~390px.
- Builder/Quick Copy ativo documentado em `PROTO-INVENTORY.md`; nesta sessão não há ferramenta
  Builder disponível, então a validação visual usa imagens locais e inspeção/build local.

## Objetivo

Garantir que bottom nav, compositores e CTAs fixos/sticky inferiores da Lectum respeitem safe area de
iPhone/PWA e mantenham respiro mínimo confortável no navegador, sem alterar dados, rotas, contratos ou
interações existentes.

## Escopo frontend

- Configurar o viewport do frontend para suportar `viewport-fit=cover` em iOS/PWA.
- Criar tokens CSS globais para safe area inferior e padding mínimo de elementos fixos no rodapé.
- Aplicar os tokens à navegação mobile do `PrivateTemplate`.
- Aplicar os tokens ao composer mobile de comentários/respostas.
- Atualizar componentes inferiores fixos/sticky existentes que ficam na borda da viewport:
  - `BottomNavigation` legado/compartilhado;
  - CTA fixo de upgrade em assinatura;
  - footers de edição/compartilhamento e controles inferiores de vídeo;
  - footer sticky do modal de filtros da tela de psicólogos.
- Ajustar o padding inferior do conteúdo quando há bottom nav para não ficar coberto pela nova altura.

## Escopo backend

- Sem alteração de backend, Prisma, endpoints, integrações ou contratos.

## Fora do escopo

- Redesenhar a navegação, mudar ícones/labels, mudar rotas ou permissões.
- Alterar regras de criação/comentário/resposta.
- Criar package novo, migration, env ou dados artificiais.
- Resolver ajustes visuais específicos de telas que não estão na borda inferior da viewport.

## Impacto em produção e plano de rollout

- **Compatibilidade com dados existentes:** sem impacto em dados.
- **Banco:** sem alteração de schema, migration, backfill ou contração.
- **Envs:** nenhuma variável nova.
- **Contratos:** nenhum payload, rota ou resposta alterados; frontend novo continua compatível com
  backend/admin em qualquer versão vigente.
- **Jobs/providers:** nenhum efeito externo.
- **Ordem de deploy:** apenas frontend precisa publicar; backend e admin não dependem desta mudança.
- **Rollback:** reverter o commit restaura o espaçamento anterior sem afetar dados.
- **Smoke de homologação:** abrir a Lectum em iPhone/PWA ou em viewport mobile ~390px e conferir:
  bottom nav com respiro inferior, detalhe de post com barra de comentário elevada, thread de
  resposta com composer confortável e CTA/footer inferior sem ficar colado ao limite da tela.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md` → Regras de UI, mobile-first, PWA e compatibilidade de rollout.
- `PACKAGES.md` → não instalar package novo.
- `PROTO-INVENTORY.md` → imagens locais como fallback visual quando Builder/Quick Copy não está
  disponível no ambiente.

Frontend esperado:

- `frontend/src/app/layout.tsx` define `viewportFit: "cover"`.
- `frontend/src/app/globals.css` centraliza variáveis de safe area inferior.
- Elementos fixos/sticky inferiores usam `var(--lectum-bottom-fixed-padding)` ou equivalente.
- A bottom nav compartilhada expõe altura/padding coerentes com os tokens globais.

## Critérios de aceite

- [x] A branch de implementação foi confirmada como `homolog` antes de editar.
- [x] O frontend usa `viewport-fit=cover` para iOS/PWA.
- [x] Existe token global de safe area inferior com respiro mínimo quando o inset nativo é `0px`.
- [x] A bottom nav mobile do `PrivateTemplate` ficou mais alta e com labels acima da borda inferior.
- [x] A barra mobile de escrever comentário/resposta respeita safe area e não fica colada ao rodapé.
- [x] CTAs/footers inferiores fixos ou sticky mapeados usam o mesmo padrão de respiro.
- [x] O conteúdo com bottom nav reserva espaço suficiente para a nova altura da navegação.
- [x] Não houve package novo, env nova, migration, mock ou dado fake.
- [x] UI mobile-first; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais/_capturas enviadas foram citadas.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR-0444 foi criado e indexado.
- [x] Versão dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit convencional criado em `homolog`, com push comunicado/executado.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check:version`
- `git diff --check`
- Inspeção visual local/mobile quando houver navegador disponível.

## Execução

Concluída em 2026-08-10.

- Branch confirmada: `homolog`.
- Implementado `viewportFit: "cover"` no viewport do Next.
- Centralizados tokens globais de safe area inferior em `frontend/src/app/globals.css`.
- Aplicados os tokens à bottom nav mobile principal, ao `BottomNavigation` compartilhado, ao composer
  mobile de comentários/respostas, ao CTA fixo de assinatura, a footers de modais/bottom sheets,
  controles inferiores de vídeo e footer sticky de filtros.
- Ajustado o padding inferior do shell privado para reservar a nova altura da bottom nav.
- Validado visualmente em Chrome headless na viewport `390x844` com `next start`; `/version` retornou
  `0.1.21` e a rota mobile de comunidades renderizou sem corte inferior. Como a API local não estava
  disponível para dados autenticados, a conclusão da bottom nav foi validada por código, build e
  comparação com as capturas/protótipos.
- Nenhum package, env, migration, mock ou dado fake foi adicionado.
