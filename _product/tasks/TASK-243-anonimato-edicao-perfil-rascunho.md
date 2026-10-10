# TASK-243 - Anonimato com edicao de nome e rascunho temporario

## Escopo

Enxugar a orientacao exibida ao ativar a publicacao anonima, aproximar o aviso da
linguagem visual da Lectum e oferecer acesso direto a edicao do nome do paciente.
Como essa navegacao interrompe a composicao, preservar temporariamente comunidade,
titulo e texto na propria jornada da modal. Nao criar pagina ou listagem de
rascunhos. A referencia visual enviada em 09/10/2026 e a modal real sao a fonte de
verdade. Builder/Quick Copy nao esta exposto neste cliente. ADR-0586.

## Aceite

- [x] Usar o texto aprovado sobre publicacao identificada e privacidade.
- [x] Exibir a orientacao em fundo azul claro e o link de edicao em azul mais escuro.
- [x] Abrir a edicao de perfil na mesma aba e oferecer retorno direto ao post.
- [x] Preservar comunidade, titulo e conteudo durante a ida ao perfil.
- [x] Nao persistir o anonimato; o retorno deve ocorrer com publicacao identificada.
- [x] Isolar o rascunho por usuario e rota, expirar dados antigos e limpar ao publicar ou descartar.
- [x] Nao criar pagina, endpoint, tabela, migration ou dependencia para rascunhos.

## Validacao

- Teste focado de apresentacao e persistencia: 26 testes aprovados.
- `pnpm --dir frontend check`: aprovado; 553 testes principais, todas as suites
  complementares e apenas o skip conhecido de symlink sem permissao no Windows.
- `pnpm --dir frontend build`: aprovado; compilacao, tipos e 90 paginas concluidos.
- Checks de ADRs, tasks, encoding, Biome direcionado e `git diff --check`: aprovados.
- Frontend e backend locais responderam em `localhost:3000` e `localhost:3001`.
- A automacao do navegador interno bloqueou navegacao para localhost nesta sessao;
  por isso a validacao visual autenticada ficou pendente, sem tentativa de contorno.

## Impacto de deploy

Frontend apenas. O rascunho usa `sessionStorage`, permanece no dispositivo e na aba
atuais por no maximo 12 horas e nao e enviado ao backend. Sem banco, migration, env,
package novo, job ou mudanca de contrato. Rollback por reversao do commit desta task.
Commit local em `homolog`; sem push ou deploy ate autorizacao explicita.
