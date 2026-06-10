# ADR-0040: Ajuste responsivo do overlay do card de psicólogo

## Status

Accepted

## Task relacionada

Refinamento responsivo do card de psicólogo (ícone de navegação, nome, linha de dados, selos e botão WhatsApp).

## Contexto

As especificações de UI passaram a exigir comportamento estável em largura variável no overlay inferior do card:
- nome com até 2 linhas sem deslocar a seta,
- seta fixa no canto superior direito do overlay,
- linha de profissão/experiência/avaliação com tipografia escalável,
- selos em largura uniforme de 3 colunas sem quebra por texto,
- botão de WhatsApp com tamanho e espaçamento responsivos.

## Decisão

- Mantive o conteúdo do overlay em um container relativo (`relative`) e removi a seta do fluxo normal do `flex`, posicionando-a com `position: absolute` no canto `top: 20px` / `right: 16px`.
- Ajustei o bloco de nome para `flex-1` com `paddingRight: 44px`, `line-clamp: 2`, `font-size: clamp(18px, 5vw, 22px)` e `line-height: clamp(24px, 5.4vw, 27px)`.
- Ajustei a linha de dados para `font-size: clamp(10px, 3vw, 12px)` com `truncate` para não exceder a largura útil.
- Ajustei os chips para `flex: 1` com `min-width: 0`, `flex-nowrap`, `gap: 8px`, altura responsiva (`clamp(26px, calc(22px + 2vw), 28px)`), fonte `clamp(10px, 2.8vw, 12px)` e `truncate`, garantindo ocupação de 100% da largura útil do overlay.
- Padronizei o botão de WhatsApp como `w-full`, `height: clamp(44px, 12vw, 52px)`, `margin-top: clamp(14px, 3vw, 18px)` e conteúdo centralizado.

## Consequências

- O overlay permanece funcionalmente alinhado em breakpoints menores sem desalinhamento de ação (seta) e sem quebra inesperada de layout.
- O layout passa a ser mais previsível em cartões com textos curtos e longos, com comportamento estável de truncamento.
- Mudanças foram tratadas apenas no nível de UI, sem impacto em contrato de dados ou regras de negócio.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Pendências

- Nenhuma.
