# ADR-0054: Corrigir container de telefone para evitar overflow em viewport móvel no setup do perfil

## Status

Accepted

## Task relacionada

Ajuste pontual de responsividade solicitado para a tela `/app/professional/profile/setup`.

## Contexto

Na revisão de usabilidade em `375x667` (iPhone SE), a tela de configuração de perfil apresentava corte lateral à direita.

Ao inspecionar o código de estilos, a causa principal estava no componente de telefone (`PhoneController`):

- o `select` do código do país tinha largura fixa (`w-32`);
- o input de número usava `w-full` sem comportamento de flex adequado no mesmo container;
- isso faz o par entrar fora do limite do `flex` pai quando havia elementos adjacentes (ex.: link de teste do WhatsApp ao lado), gerando overflow horizontal.

## Decisão

- Manter o seletor do código do país com largura fixa e evitar que ele encolha (`shrink-0`).
- Forçar o container do campo de telefone a ocupar largura controlada (`w-full`, `min-w-0`).
- Converter o campo principal do número para flexível dentro do par (`min-w-0 flex-1`), preservando `w-full` visual sem quebrar o fluxo de linha em dispositivos estreitos.
- Não introduzir `overflow-x` como solução de arquitetura; o ajuste é estrutural no layout de fluxo.

## Consequências

- A linha do campo WhatsApp passa a caber no espaço disponível sem exceder o viewport.
- Elementos adjacentes à esquerda/direita deixam de ser empurrados para fora da área útil.
- O comportamento visual do campo de telefone permanece idêntico em telas maiores, com melhor estabilidade em mobile.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação manual sugerida em `/app/professional/profile/setup` em viewport `375x667` com conferência de ausência de scroll horizontal.

## Pendências

- Manter monitoria em outras telas que reutilizam `PhoneController` com componentes irmãos, para confirmar se o padrão de overflow foi neutralizado em todos os fluxos.
