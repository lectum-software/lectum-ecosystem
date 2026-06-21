# ADR-0144: Abas integradas em Meus posts e respostas

Data: 2026-06-21

## Contexto

A tela "Meus posts e respostas" usava um controle em formato de cápsula para alternar entre posts e respostas/comentários. Esse padrão ocupava mais altura e ficava visualmente solto em relação ao header, enquanto o perfil público do psicólogo já vinha consolidando uma navegação mais integrada em cards de seção.

Builder/Quick Copy não ficou acessível neste ambiente; a decisão foi guiada pelo padrão visual já implementado no perfil do psicólogo e pelas telas locais em execução.

## Decisão

- Substituir a cápsula de alternância por abas textuais integradas ao card de header da tela.
- Manter o botão de voltar, título e abas dentro da mesma superfície visual.
- Indicar a aba ativa por texto mais forte e underline azul da Lectum.
- Manter abas inativas sem fundo preenchido, apenas com tipografia discreta.
- Exibir contadores inline ao lado dos rótulos, sem chips preenchidos.

## Consequências

- A navegação ocupa menos altura e fica mais próxima do padrão de seções do perfil do psicólogo.
- A tela reduz a sensação de componente isolado entre header e conteúdo.
- O comportamento funcional de troca entre posts e respostas permanece o mesmo, sem alteração de API, paginação ou regras de domínio.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
