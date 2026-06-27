# Design QA - Boas-vindas do paciente

final result: passed

## Escopo

- Tela validada: `/patient/welcome` em viewport mobile `390x844`.
- Referências visuais: `tela 1.svg` e `tela 2.svg` fornecidas pelo produto em `C:\Users\tulio\Downloads`.
- Implementação validada: fundos normalizados em `frontend/public/images/patient-welcome/` renderizados via `next/image`, com textos, CTA e cards como UI real por cima.

## Evidências

- Capturas locais finais:
  - `%TEMP%\lectum-welcome-cdp\welcome-step-1-wait12.png`
  - `%TEMP%\lectum-welcome-cdp\welcome-step-2.png`
- Usuário temporário real criado via endpoint do backend para acessar o fluxo e removido do banco ao final da validação.

## Resultado

- A ilustração do background agora usa os SVGs fornecidos pelo produto, preservando a composição do caminho/montanhas das referências.
- A primeira tela mantém símbolo, título, descrição e CTA em camadas acessíveis, alinhados à referência mobile.
- A segunda tela mantém título, descrição e cards em camadas acessíveis sobre o background fornecido.
- Não houve alteração em backend, banco, contratos de API ou pacotes.

## Observação

Os arquivos SVG fornecidos contêm PNGs embutidos em base64 e máscaras. A escolha foi aceita para esta iteração porque a prioridade era fidelidade visual exata do background.
