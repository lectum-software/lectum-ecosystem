# TASK-36: Refinos mobile de perfil público, analytics e edição profissional

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-36 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Qualidade mobile |
| Status | Completed |
| Dependências | TASK-14, TASK-15, TASK-18A, TASK-20, TASK-35 |
| ADR alvo | ADR-0036 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`

## Referências visuais

| Imagem local/anexo | Uso |
|---|---|
| `_product/proto/Perfil Profissional - Sobre.jpg` | Perfil profissional público |
| `c:/Users/tulio/Downloads/Perfil Profissional - Sobre.jpg` | Referência ampliada anexada pelo usuário |
| `_product/proto/Meus Analytics - Psicólogo.jpg` | Analytics mobile |
| `_product/proto/Editar Perfil - Psicólogo.jpg` | Edição do perfil profissional |
| `_product/proto/Favoritos.jpg` | Cabeçalho de favoritos |

Builder/Quick Copy não ficou exposto como ferramenta MCP direta nesta execução; foram usadas imagens locais/exportadas e os anexos do usuário como fallback auditável.

## Objetivo

Aplicar refinamentos mobile-first relatados após a TASK-35, mantendo o perfil profissional mais próximo do protótipo/anexo, corrigindo overflow em analytics e compactando controles da edição profissional.

## Escopo

- Perfil profissional público:
  - manter fundo branco a partir de `Atendimento`;
  - exibir avaliação acima do nome mesmo sem avaliações reais;
  - aumentar respiro entre tags de benefícios e abas;
  - reduzir fonte das abas `Sobre`, `Publicações` e `Avaliações`;
  - limitar apresentação textual a 4 linhas com `Ver mais`/`Ver menos`;
  - formatar formação com título na primeira linha e instituição/data na segunda;
  - garantir espaçamento entre a faixa informativa de WhatsApp e o CTA fixo.
- Analytics profissional:
  - remover overflow horizontal em viewport mobile estreito e compactar cards/filtros.
- Edição do perfil profissional:
  - mostrar `+55` no seletor do WhatsApp profissional para Brasil;
  - manter apenas ícone de lixeira para remover formações;
  - trocar texto `Editar` por ícone de edição no vídeo;
  - deixar o texto auxiliar do vídeo na largura total do card.
- Favoritos:
  - remover `Minha lista` e a seta de voltar do cabeçalho.

## Fora do escopo

- Criar eventos novos de analytics ou simular métricas.
- Alterar schema/migrations de banco.
- Instalar pacotes.
- Criar mocks, seeds artificiais ou endpoints simulados.

## Critérios de aceite

- [x] Referências visuais consultadas via imagens locais/anexo; limitação de Builder/Quick Copy registrada.
- [x] Perfil público usa fundo branco de `Atendimento` para baixo.
- [x] Formação exibe título na primeira linha e instituição/data na segunda.
- [x] Bio abaixo do vídeo limita 4 linhas e oferece `Ver mais` quando o texto excede.
- [x] Avaliação aparece acima do nome no topo do perfil.
- [x] Tags de benefícios têm maior respiro antes das abas e abas usam fonte menor.
- [x] Faixa informativa de WhatsApp tem espaçamento antes do botão fixo.
- [x] Analytics cabe no viewport mobile estreito sem overflow horizontal visível.
- [x] Edição profissional mostra `+55`, remove texto `Remover`, usa ícone para editar vídeo e compacta texto auxiliar.
- [x] Favoritos não exibe `Minha lista` nem seta de voltar.
- [x] Nenhum mock, seed ou dado fake foi usado.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes executados sem erro.
- [x] Commit criado com mensagem convencional.

## Validação executada

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local nas rotas afetadas, com a limitação de que rotas privadas autenticadas redirecionam sem token real disponível ao agente.

## Ajuste complementar em 2026-07-04 - menu lateral desktop em telas profissionais secundarias

- Pedido direto de produto: em `Editar perfil`, `Meus Analytics` e `Minha Assinatura`, adicionar apenas no desktop o menu lateral recolhido ja usado em `Minhas Avaliacoes`.
- As rotas `/app/professional/profile/setup`, `/app/professional/analytics` e `/app/professional/billing` agora renderizam a sidebar desktop do `PrivateTemplate` com `desktopSidebarDefaultCollapsed` e `showMobileNavigation={false}`.
- O mobile permanece sem navegacao inferior nessas telas secundarias, preservando o fluxo focado e mobile-first.
- A implementacao reutiliza o shell privado existente e nao cria estrutura de navegacao paralela, package novo, mock, seed, endpoint ou alteracao de schema.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia visual usada foi o print enviado pelo usuario de `Minhas Avaliacoes` e as imagens locais `_product/proto/Editar Perfil - Psicologo.jpg`, `_product/proto/Meus Analytics - Psicologo.jpg`, `_product/proto/Minhas Assinatura - Psicologo.jpg` e `_product/proto/Minhas Avaliacoes - Psicologo.jpg`.
- ADR atualizado: `adrs/0084-sidebar-desktop-rotas-principais.md`.

### Criterios de aceite do ajuste

- [x] `Editar perfil` renderiza sidebar desktop recolhida e continua sem bottom navigation no mobile.
- [x] `Meus Analytics` renderiza sidebar desktop recolhida e continua sem bottom navigation no mobile.
- [x] `Minha Assinatura` renderiza sidebar desktop recolhida e continua sem bottom navigation no mobile.
- [x] `Minhas Avaliacoes` permanece como referencia do padrao aplicado.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou alteracao de schema foi criado.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check` executado; frontend passou, mas o backend falhou em `biome check` por formatacao em arquivos de checkout/billing ja modificados fora deste ajuste (`CheckoutRepository.ts`, `ICheckoutRepository.ts`, `services.ts`, `sync-mercado-pago-subscription.ts`).
- Browser local com `next start --port 3114` e Chrome/CDP: em desktop 1365x768, `/app/professional/profile/setup`, `/app/professional/analytics`, `/app/professional/billing` e `/app/professional/reviews` renderizaram `aside` da navegacao com classe `w-[88px]` e sem bottom navigation.
- Browser local com Chrome/CDP em mobile 390x844: `/app/professional/profile/setup`, `/app/professional/analytics` e `/app/professional/billing` mantiveram `asideDisplay=none`, `mobileBottomCount=0` e `scrollWidth=390`.
