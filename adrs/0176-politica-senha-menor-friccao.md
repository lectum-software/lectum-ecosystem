# ADR-0176: Politica de senha com menor friccao

## Status

Accepted

## Task relacionada

Ajuste de produto solicitado em 2026-06-29, sem task sequencial propria.

## Contexto

A politica anterior exigia senha com no minimo 12 caracteres e composicao obrigatoria
(letra maiuscula, letra minuscula, numero e caractere especial). Essa regra aumentava a
friccao no cadastro e divergia da experiencia esperada pelo produto para pacientes e
psicologos.

O Lectum ainda trata dados sensiveis, portanto a reducao de friccao nao deve remover
limites basicos nem quebrar os fluxos existentes de cadastro, recuperacao e alteracao de
senha. A referencia tecnica consultada foi o NIST SP 800-63B/63-4, que favorece politicas
orientadas a comprimento e nao depende de composicao obrigatoria por tipo de caractere:
https://pages.nist.gov/800-63-4/sp800-63b.html

## Decisao

- A politica padrao de `method:"password"` passa a ser:
  - minimo 10 caracteres;
  - maximo 128 caracteres;
  - sem exigencia obrigatoria de maiuscula, minuscula, numero ou caractere especial.
- Espelhar a mesma regra no frontend em:
  - cadastro de paciente;
  - cadastro de psicologo;
  - recuperacao/redefinicao de senha;
  - configuracoes de conta.
- Manter `password_confirm` e a validacao de igualdade inalteradas.
- Permitir frases com espacos como senha, sem aplicar `trim` no valor da senha.
- Atualizar documentos de produto que ainda descreviam a regra antiga.

## Consequencias

- Reduz a friccao de cadastro e redefinicao de senha.
- Evita divergencia entre backend, frontend e documentacao.
- Mantem limite maximo de 128 caracteres e confirmacao de senha.
- O backend continua sendo a fonte de verdade da validacao final.
- Um controle futuro desejavel e rejeitar senhas comuns/vazadas, mas isso exige nova decisao
  de produto/seguranca e possivelmente fonte externa confiavel; nao foi implementado nesta
  mudanca para nao introduzir dependencia nova.

## Validacao

Executada em 2026-06-29:

- `pnpm --dir backend check`: aprovado.
- `pnpm --dir frontend check`: aprovado.
- `pnpm check`: aprovado.
- `pnpm --dir frontend build`: aprovado.
- Smoke visual local com Edge headless em `/auth/reset-password?code=validacao-politica-senha`: aprovado; screenshot inspecionado confirmou a copy `Use pelo menos 10 caracteres` e o requisito `Minimo 10 caracteres`.

## Pendencias

- Avaliar em task futura uma lista de bloqueio para senhas comuns/vazadas, sem bloquear a
  entrega deste ajuste de UX.