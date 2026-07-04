# ADR-0206: Preservar regional e registro CFP no CRP do perfil

## Status

Aceita em 2026-07-04.

## Contexto

O fluxo de confirmação CFP persistia em `psychologist_profile.crp` apenas o campo `registro`
retornado pela InfoSimples/CFP. Na edição do perfil profissional, o contrato legado separava
`crp_region` e `crp_number` a partir de `crp` usando `/`; quando o valor salvo era apenas
`161904`, a UI tratava esse número como regional e deixava o número de registro vazio.

Além disso, a tela exibia uma faixa informativa azul "CPF e CRP validados" logo abaixo dos campos
travados, mas o produto pediu a remoção dessa faixa.

## Decisão

- A confirmação CFP passa a gravar o CRP canônico como `nome_regional/registro`, preservando os
  dois valores retornados pela busca pública autorizada do CFP/InfoSimples.
- A leitura do perfil profissional usa o `professional_registry_check.raw` confirmado como fonte
  preferencial para derivar `crp_region` e `crp_number`, corrigindo registros já confirmados antes
  desta ADR sem criar schema novo.
- O parser de `crp` separa regional e número pelo último `/`, para não quebrar regionais que
  contenham barra no próprio nome, como `PA/AP`.
- A faixa azul "CPF e CRP validados" foi removida da UI, mantendo os campos travados quando a
  identidade profissional já foi confirmada.

## Consequências

- Novas confirmações CFP preservam regional e registro exatamente como retornados pelo provedor.
- Perfis já confirmados podem exibir os campos corretos no setup a partir da auditoria real
  persistida em `professional_registry_check.raw`.
- Não houve migration nem package novo.
- A fonte autorizada continua sendo a InfoSimples `cfp-cadastro` via `DOCUMENT_TOKEN`; não há mock,
  scraping alternativo ou aprovação automática.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Consulta real ao endpoint `GET /api/private/psychologist/free-profile` com token temporario real removido ao final confirmou `crp="06ª Região - SP/161904"`, `crp_region="06ª Região - SP"`, `crp_number="161904"` e campos travados.
- Chrome/CDP headless em `/app/professional/profile/setup`, viewport mobile 390x844 via URL ngrok, confirmou os valores desabilitados de CRP e a ausencia da faixa `CPF e CRP validados`.
