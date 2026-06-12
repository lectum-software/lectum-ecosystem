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
- A capa do vídeo de apresentação passa a ser o próprio vídeo pausado, sem `poster` derivado de avatar/foto de perfil, para evitar divergência entre imagem de capa e conteúdo do vídeo.
- A faixa promocional azul foi retirada do perfil; a comunicação de selos fica concentrada nas tags abaixo da bio para evitar duplicidade visual.
- A linha de profissão/CRP do hero passa a reutilizar a tipografia do rótulo `Psicólogo` do card de listagem (`text-[0.66rem]`, `font-extrabold`, `uppercase`, `tracking-[0.16em]`, `text-subtle`) e fica mais próxima do indicador de disponibilidade.

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

Ajuste complementar de capa do vídeo:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - nenhum `<img>` dentro do card de vídeo (`imageCountInsideVideo=0`);
  - preview usa `<video aria-hidden="true">` com `src` igual ao `video_url` real;
  - preview sem `poster` de avatar;
  - proporção 16:9 preservada (`ratio=1.78`).

Ajuste complementar de tipografia e faixa:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - faixa azul superior ausente (`promoStripExists=false`);
  - texto `PSICÓLOGO • CRP 04/123456` com `font-size=10.56px`, `font-weight=800`, `text-transform=uppercase` e cor `rgb(148, 163, 184)`;
  - gap entre linha CRP e disponibilidade reduzido para `4px`.

## Pendências

- Nenhuma pendência externa nova. Legendas/transcrições para vídeos de profissionais continuam fora deste recorte e devem ser tratadas em task futura de acessibilidade/conteúdo.

Ajuste complementar de alinhamento ao PDF em 2026-06-12:

- O perfil público `/app/psychologist/[id]` foi refinado a partir do PDF `Perfil psicólogo (1).pdf` e do texto anexado pelo usuário como referência visual, mantendo a arquitetura e os dados reais existentes.
- A mídia do topo passou a ter altura maior e overlay suave; o card principal se sobrepõe à mídia com avatar maior, nome mais forte, selo verificado preso à última palavra e metadados compactos.
- Especialidades foram separadas em seção própria com chips derivados de `profile.specialties`, sem fallback fictício; a seção Atendimento concentra Modalidade, Abordagens, Serviços, Público atendido e Idiomas.
- O refinamento ficou restrito ao frontend da rota pública; não houve migration, alteração de contrato, novo pacote ou dado artificial.

Validação complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://localhost:3000/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
- Chrome headless em 390px confirmando hero maior, card sobreposto, abas e CTA fixo renderizados.

Ajuste complementar de navegação sticky em 2026-06-12:

- O menu de seções do perfil público deixou de usar abas tradicionais em barra plana e passou a ser um container `sticky` mobile-first com duas linhas: identificação compacta do psicólogo e chips de navegação.
- A primeira linha exibe nome em uma única linha com `truncate`, preservando o selo verificado como elemento `shrink-0` para não quebrar nem desaparecer em nomes longos.
- A segunda linha mantém a mesma lógica de abas existente, sem recarregar a rota e sem alterar dados, mas troca o rótulo visual `Geral` por `Sobre` e usa chips translúcidos com fundo glass, borda sutil e destaque azul Lectum na seção ativa.
- O sticky fica abaixo do card principal no estado inicial e usa `top: env(safe-area-inset-top, 0px)` ao fixar, com `z-index` abaixo do CTA fixo de WhatsApp para não cobrir o botão inferior.
- Não houve alteração de backend, contrato, banco, packages, conteúdo das seções ou lógica de WhatsApp.

Validação complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - menu existente abaixo do card principal (`top=468` antes do scroll);
  - após rolagem, menu fixado no topo (`top=0`, `position=sticky`, `z-index=20`);
  - chips `Sobre`, `Publicações` e `Avaliações` renderizados, com `Sobre` ativo;
  - selo verificado visível na linha do nome.

Ajuste complementar de hierarquia e previews em 2026-06-12:

- A capa do perfil público foi reduzida para preservar espaço na primeira dobra, mantendo-a como mídia independente de identidade visual.
- A ação `Editar perfil` foi adicionada sobre a capa apenas quando o usuário autenticado é o próprio psicólogo (`role=psicologo` e `user.id` igual ao perfil exibido), sem expor a ação a pacientes ou visitantes.
- A experiência deixou de aparecer como texto na linha de metadados do hero; permanece somente como chip de benefício, respeitando a preferência persistida `show_experience_tag`.
- A avaliação do hero passa a exibir apenas `⭐ N,N`, sem quantidade de reviews; a contagem fica concentrada nas áreas de avaliação.
- A bio curta no card principal e a apresentação textual da aba Sobre são renderizadas completas, sem mecanismo de expansão/truncamento, e com peso visual menor.
- O vídeo de apresentação do perfil passou para proporção vertical 9:16, evitando mídia achatada/horizontal quando o profissional usa vídeos verticais.
- O CTA inferior foi simplificado para apenas o botão fixo de WhatsApp; a caixa explicativa anterior foi removida para reduzir ruído.
- A aba Geral ganhou previews com dados reais de avaliações e publicações: avaliações antes de Atendimento e publicações após Formação & Títulos, reutilizando os endpoints paginados existentes também quando a aba ativa é `geral`.

Validação complementar do ajuste de hierarquia/previews:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`.
- Chrome headless/CDP em 360px, 375px e 390px:
  - sem `Ver mais`/`Ver menos` e sem caixa `Para consultar agenda...`;
  - CTA fixo de WhatsApp presente;
  - capa mobile com 196px;
  - linha de metadados sem experiência solta e sem quantidade de reviews entre parênteses;
  - vídeo de apresentação renderizado em 9:16 (`214x379`);
  - sem overflow horizontal;
  - seções da aba Geral em ordem: `Sobre`, `Especialidades`, `Avaliações`, `Atendimento`, `Formação & Títulos`, `Publicações`.
