# Design QA - Boas-vindas do paciente

final result: passed

## Escopo

- Tela validada: `/patient/welcome` em viewport mobile `390x844`.
- Referências visuais: `tela 1.svg` e `tela 2.svg` fornecidas pelo produto em `C:\Users\tulio\Downloads`.
- Implementação validada: fundos normalizados em `frontend/public/images/patient-welcome/` renderizados via `next/image`, com textos, CTA e cards como UI real por cima.

## Evidências

- Capturas locais finais:
  - `%TEMP%\lectum-welcome-logo-cdp\welcome-step-1.png`
  - `%TEMP%\lectum-welcome-logo-cdp\welcome-step-2.png`
- Usuário temporário real criado via endpoint do backend para acessar o fluxo e removido do banco ao final da validação.

## Resultado

- A ilustração do background agora usa os SVGs fornecidos pelo produto, preservando a composição do caminho/montanhas das referências.
- A primeira tela usa o SVG oficial `Logo icon.svg` versionado no projeto, mantendo o tamanho visual do ícone atual.
- A primeira tela mantém título, descrição e CTA em camadas acessíveis, com texto do botão proporcional ao componente.
- A segunda tela mantém título e cards em camadas acessíveis sobre o background fornecido, sem o texto auxiliar removido por pedido de produto.
- O badge da opção comunidade exibe `Espaço gratuito`.
- Não houve alteração em backend, banco, contratos de API ou pacotes.

## Observação

Os arquivos SVG fornecidos contêm PNGs embutidos em base64 e máscaras. A escolha foi aceita para esta iteração porque a prioridade era fidelidade visual exata do background.

## Atualizacao 2026-06-27 - responsividade

- Validacao adicional em desktop `1920x879` e mobile `390x844` confirmou que o shell visual preserva a proporcao `390x844` em telas maiores e que as duas etapas cabem sem corte.
- Capturas locais finais:
  - `%TEMP%\lectum-welcome-responsive-cdp-3\desktop-step-1.png`
  - `%TEMP%\lectum-welcome-responsive-cdp-3\desktop-step-2.png`
  - `%TEMP%\lectum-welcome-responsive-cdp-3\mobile-step-1.png`
  - `%TEMP%\lectum-welcome-responsive-cdp-3\mobile-step-2.png`
- Usuario temporario real criado via endpoint do backend para acessar o fluxo e removido do banco ao final da validacao.
