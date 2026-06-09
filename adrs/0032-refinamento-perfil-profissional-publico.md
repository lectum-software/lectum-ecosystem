# ADR-0032: Refinamento mobile-first do perfil profissional público

## Status

Accepted

## Task relacionada

TASK-15 (ajuste complementar solicitado sobre a tela pública do psicólogo)

## Contexto

A tela `/app/psychologist/[id]` precisava se aproximar da referência `Perfil Profissional - Sobre.jpg` e do ajuste visual solicitado: remover elementos administrativos/duplicados, reduzir ruído de navegação dentro do perfil e deixar o vídeo de apresentação reproduzível no próprio card.

O endpoint de detalhe já era leitura pública-safe e havia campos persistidos em `psychologist_profile` para cidade/UF de atendimento, `target_audience` e formações acadêmicas, mas esses dados ainda não eram expostos no contrato do perfil público.

## Decisão

- O perfil profissional público continua usando `PrivateTemplate`, mas a rota agora passa `allowAnonymous` e `showNavigation={false}` para não renderizar a navegação inferior dentro da vitrine.
- O card lateral desktop de contato/agenda foi removido; o CTA principal permanece como botão de WhatsApp condicionado ao dado real.
- O vídeo de apresentação passou a ter prévia visual com `next/image` e botão de play; ao acionar, o `<video>` substitui a prévia e reproduz no mesmo local, sem nova aba.
- `target_audience`, `professional_address_city` e `professional_address_state` foram promovidos ao contrato public-safe do perfil público. CPF, e-mail, telefone bruto, tokens e documentos seguem fora da resposta.
- `academic_formations` também foi promovido ao contrato public-safe do perfil público, mantendo fallback nos campos legados `academic_title`, `academic_institution` e `academic_graduation_year`.
- A modalidade presencial/híbrida passa a exibir `Online e Presencial em CIDADE/UF` quando cidade/UF reais existirem.
- A aba Sobre exibe a seção `Formação e Títulos` entre `Sobre` e `Atendimento`, usando apenas formações persistidas ou estado vazio em PT-BR.

- A faixa promocional superior passou a ser derivada dos selos reais do perfil (`discount_first_session`, `accepts_insurance` e `social_value`), fica oculta quando não há selo marcado e usa `position: sticky` para permanecer no topo durante a rolagem.
- O chip de avaliação abaixo do nome só aparece quando há reviews reais; perfis sem avaliação deixam de exibir a cópia "Sem avaliações" nessa região.
- O vídeo da aba Sobre foi normalizado para proporção 16:9, e o bloco hero/abas passou a ser uma superfície branca contínua com bordas e sombras mais discretas, em linguagem mais sóbria inspirada em feeds sociais/profissionais.
- O hero do perfil passou a espelhar as tags de benefício do card da listagem de psicólogos, exibindo experiência e selos reais abaixo da bio, mantendo a faixa sticky como destaque superior.
- A disponibilidade no hero deixa de usar fundo verde; o avatar fica redondo; o header ganha uma separação inferior fina; e a aba Sobre/Publicações/Avaliações perde a borda superior para reduzir ruído visual.

## Consequências

- A vitrine do psicólogo fica mais fiel ao protótipo mobile-first e sem navegação concorrendo com o conteúdo.
- A API expõe novos campos public-safe já persistidos, sem migration e sem dados fictícios.
- Formações aparecem na vitrine pública sem criar seeds ou conteúdo artificial; perfis sem formação mantêm mensagem vazia controlada.
- A prévia do vídeo depende de avatar público real; quando não existir avatar, a UI usa iniciais do profissional como fallback visual, sem mock externo.
- A tela fica acessível também sem sessão, coerente com a leitura caller-neutral do diretório.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em `390x1200` e desktop `1366x1000` na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - sem navegação inferior;
  - sem card lateral de contato/agenda;
  - banner com `VALOR SOCIAL`;
  - vídeo com prévia e play local;
  - atendimento, formação/títulos e público atendido vindos da API real.

Ajuste complementar de 2026-06-09:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px e desktop 1440px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - vídeo renderizado em proporção 16:9 (`videoRatio=1.78`);
  - texto "Sem avaliações" ausente abaixo do nome;
  - espaço entre hero e menu removido (`heroBottom` igual ao topo do menu em mobile);
  - strip promocional oculto corretamente porque o perfil local persistido está com os três selos desmarcados (`discount_first_session=false`, `accepts_insurance=false`, `social_value=false`).

Ajuste complementar de header/tags:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - header com `border-bottom: 1px`;
  - avatar redondo no hero;
  - disponibilidade com fundo transparente;
  - tags de experiência, convênio, valor social e desconto abaixo da bio;
  - menu de abas com `border-top: 0px`.

## Pendências

- Nenhuma pendência externa nova. Legendas/transcrições para vídeos de profissionais continuam fora deste recorte e devem ser tratadas em task futura de acessibilidade/conteúdo.
