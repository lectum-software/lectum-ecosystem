# ADR 0105 — Tratamento visual premium para Top Mentores

## Status

Aceita

## Contexto

A tela de Top Mentores precisava transmitir prestígio e reconhecimento, usando pódium, medalhas e anéis metálicos para diferenciar os três primeiros colocados. Também havia necessidade de remover efeitos de fundo que criavam manchas atrás do pódium e deixavam a composição menos sofisticada.

## Decisão

Aplicar um sistema visual específico para o ranking de mentores no frontend:

- fundo geral cinza uniforme;
- pódium sem card/container decorativo ao redor;
- avatares do Top 1, Top 2 e Top 3 com anéis metálicos baseados nas cores definidas para ouro, prata e bronze;
- medalhas de posição usando as mesmas famílias de metais;
- brilho sutil por CSS, respeitando `prefers-reduced-motion`;
- lista inferior com hierarquia corrigida: `Classificação geral` como título principal e descrição como apoio.

A tela continua consumindo a API real de ranking com `limit: 5`. Não foram adicionados mocks permanentes; quando houver até cinco profissionais elegíveis retornados pela API, todos serão exibidos.

## Consequências

- O tratamento metálico fica centralizado em classes globais reutilizáveis de CSS.
- O pódium passa a depender apenas dos dados reais retornados pelo ranking.
- Caso o ambiente de desenvolvimento precise exibir cinco itens, a base de dados local deve possuir cinco psicólogos elegíveis com sinais de ranking, em vez de preencher a interface com dados falsos.

## Complemento 2026-06-18 — fundo uniforme e lista mais limpa

### Contexto

Produto pediu uma limpeza visual na tela `/app/community/top-mentors`, especialmente para remover variações decorativas de fundo, corrigir simetria do pódio mobile e tornar a listagem `Classificação geral` menos pesada.

### Decisão

- Manter a API real de Top Mentores, a fórmula derivada e a exibição limitada a cinco mentores sem ordenar ou preencher dados no frontend.
- Usar o background uniforme da aplicação na rota, sem superfície cinza própria, overlays ou gradientes decorativos adicionais.
- Reestruturar o pódio em grid simétrico com colunas laterais equivalentes, garantindo Top 1 no eixo central e Top 2/Top 3 com distâncias equivalentes no mobile.
- Remover o bloco metálico colorido da posição na lista, preservando apenas medalha e número com cor textual discreta.
- Remover sombras externas dos anéis e medalhas metálicas do pódio, mantendo apenas profundidade interna sutil para não manchar o fundo.
- Limitar a largura da listagem no desktop para ficar visualmente mais próxima do pódio.

### Consequências

- A tela mantém o caráter de reconhecimento/pódio, mas com fundo mais limpo e sem halos ou blocos de cor competindo com o conteúdo.
- A lista fica mais consistente com a diretriz atual da Lectum: hierarquia por tipografia, espaçamento, borda e conteúdo, não por sombras ou fundos metálicos.
- Nenhum contrato de backend, pontuação, elegibilidade, schema, migration ou package foi alterado.

### Validação

- `pnpm --dir frontend exec biome check --write src/app/app/community/top-mentors/logic.tsx src/app/globals.css`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em `/app/community/top-mentors?community=luto-e-ressignificacao` para verificar fundo uniforme, pódio centralizado no mobile, lista sem fundo metálico na posição e cards mais estreitos no desktop.

## Complemento 2026-08-13 — CTA WhatsApp e identidade profissional nos cards

### Contexto

Produto pediu que a `Classificação geral` da tela Top Mentores removesse a seta lateral que indicava navegação para perfil e usasse o ícone de WhatsApp já existente na Lectum. O mesmo ajuste também exigiu harmonizar o texto `Psicólogo` com uma fonte textual já usada no produto, sem caixa alta completa, e garantir que o selo de verificado fosse o mesmo componente exibido nas páginas de comunidade e no perfil público do psicólogo.

### Decisão

- Manter o corpo principal do card como link para o perfil público do mentor, preservando a descoberta do profissional, mas trocar a affordance lateral por um CTA independente de WhatsApp.
- Reutilizar `PsychologistWhatsAppRedirectButton` e `WhatsAppIcon`, já usados nos fluxos de contato da Lectum, para manter rastreamento, modal de transição e normalização segura de URL.
- Estender de forma aditiva o contrato `GET /api/private/community/top-mentors` com `professional.whatsapp_name` e `professional.whatsapp_url`, derivados de `psychologist_profile.whatsapp` e dos helpers canônicos de nome/mensagem pronta.
- Tratar os novos campos como opcionais no frontend; enquanto o backend antigo ainda não tiver sido publicado, o ícone fica visível, porém desabilitado, evitando quebra no rollout.
- Exibir `Psicólogo`/`Psicóloga` em title case com estilo `font-sans` sem tracking de caixa alta, mantendo hierarquia discreta abaixo do nome.
- Continuar usando `VerifiedBadgeIcon` compartilhado como única fonte visual do selo verificado.

### Consequências

- A mudança é compatível com versões diferentes de frontend e backend porque os campos novos são aditivos e opcionais para a UI.
- Não há alteração de schema Prisma, migrations, envs, packages, fórmula, score, elegibilidade, ordenação ou snapshot do ranking.
- O rollback é direto: reverter o commit remove o CTA e os campos derivados sem afetar dados persistidos.

### Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local em `/app/comunidades/top-mentores` para verificar ausência do chevron, presença do ícone WhatsApp, label `Psicólogo`/`Psicóloga` em title case e selo `VerifiedBadgeIcon`.

## Complemento 2026-08-13 - lista geral sem posicao e WhatsApp sem fundo

### Contexto

Produto pediu um refinamento especifico na `Classificacao geral` da tela Top Mentores: remover a medalha e o numero de posicao da lista inferior, retirar o fundo verde atras do CTA de WhatsApp e confirmar que os cliques desse CTA entram nos analytics do psicologo.

### Decisao

- Restringir a remocao de medalha/numero aos cards da `Classificacao geral`; o podio superior continua exibindo posicao porque ele representa o reconhecimento principal do ranking.
- Manter avatar, nome, selo verificado e label profissional como hierarquia suficiente nos cards da lista.
- Preservar `PsychologistWhatsAppRedirectButton` como fonte unica do fluxo de contato, modal de transicao, `contact-click` e `important_action_event`.
- Remover apenas o background verde do botao, mantendo o icone WhatsApp em verde e o alvo de toque de 40px.
- Tornar a atribuicao do analytics mais robusta: o backend passa a classificar a origem Top Mentores tambem por `page_kind = community_top_mentors`, alem dos paths/queries ja suportados.

### Consequencias

- A lista fica visualmente mais limpa sem perder o CTA principal de contato.
- Os cliques continuam somando no total de WhatsApp via `contact_request` e na origem Top Mentores via `important_action_event`.
- A mudanca e aditiva para analytics e nao altera schema, migrations, envs, packages, formula do ranking, score ou elegibilidade.
- Rollback direto: reverter o commit restaura medalha/numero na lista, fundo verde do botao e atribuicao apenas por path/query.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local nas rotas publica e privada de Top Mentores.

## Complemento 2026-08-22 - selo e aneis compactos na lista geral

### Contexto

O reteste visual em homologacao indicou que a `Classificacao geral` ainda estava pesada em dois pontos: o selo verificado competia com o nome do profissional e os aneis metalicos de ouro/prata/bronze ao redor dos avatares da lista inferior tinham espessura excessiva para cards de 62px.

### Decisao

- Reduzir o `VerifiedBadgeIcon` dos cards da `Classificacao geral` para `h-3 w-3`, com `gap-1.5` entre nome e selo.
- Introduzir uma variante visual de avatar apenas para a lista (`ringVariant="list"`), com padding metalico `p-[2px]` e borda interna `border-2`.
- Manter o podio superior com a variante premium anterior (`p-[5px]` e borda interna maior), pois ali o anel metalico e parte do reconhecimento principal.
- Nao alterar API, formula de score, ordenacao, elegibilidade, analytics, schema, migrations, envs ou packages.

### Consequencias

- A lista inferior ganha leitura mais leve e proporcional ao tamanho dos cards, preservando o significado de Top 1/2/3.
- O tratamento premium do podio nao regressa e continua visualmente distinto da lista.
- Rollback direto: reverter o commit restaura o tamanho anterior do selo e a espessura anterior dos aneis da lista, sem impacto em dados ou contratos.

### Validacao

- Validacoes de build/check e smoke ficam registradas no complemento correspondente da TASK-27.
