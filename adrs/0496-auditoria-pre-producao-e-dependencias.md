# ADR-0496: Auditoria pré-produção e correções de dependências

## Status

Accepted

## Task relacionada

TASK-178 — Auditoria integral antes da produção (em andamento).

## Contexto

O baseline de `pnpm check` passou em `0.1.309`. Entretanto, a consulta atual de dependências de
produção encontrou 8 ocorrências no backend e 4 em cada app Next. Checks funcionais não substituem
a checagem de vulnerabilidades, e o resultado registrado em agosto deixou de refletir os lockfiles
frente aos avisos atuais. Não há evidência de invasão ou exploração em homologação nesta análise.

## Decisão

- Priorizar atualização focal das dependências existentes, sem adicionar stack ou framework.
- Backend: Multer `2.3.0` e Nodemailer `9.1.1`, versões mínimas corrigidas dos avisos encontrados.
- Frontend e Admin: Next e eslint-config-next `16.3.3`; override Sharp `0.35.4` e
  baseline-browser-mapping `2.11.0`, mantendo instalações e lockfiles independentes.
- Habilitar limites de índice/profundidade do Multer 2.3 e remover o ajuste legado `+1` de
  `fileSize`, mantendo `fieldSize`/`parts` compatíveis com Busboy. Teste de fronteira detectou
  e confirmou a correção dessa regressão durante o upgrade.
- Expor `pnpm check:dependencies` para repetir o audit nos cinco escopos antes da promoção.
- Usar o router Next nos dois destinos do convite de cadastro/login. Preservar navegação
  completa na rejeição confirmada de sessão do Admin e na falha de sessão Google do frontend:
  descartar caches e estado em memória faz parte da limpeza. Exceções locais documentadas,
  sem desabilitar a regra de lint globalmente nem introduzir client paralelo.
- Não executar payload de RCE/DoS contra o ambiente publicado. Validar versões, avisos oficiais,
  regressões locais, todos os builds e smoke publicado.
- Atualizar o mapeamento legado de erros para o contrato tipado Zod 4 (`input`, `origin`,
  `format`), preservando precedência das mensagens explícitas de domínio. O catálogo PT-BR não
  interpola entradas, tipos internos ou opções de enum em erros públicos. Sem mudar status/códigos,
  validações aceitas ou modelos de dados. Mensagens de sessão/SMS deixam de expor detalhes
  técnicos; erro da consulta profissional orienta análise manual sem atribuir culpa ao Conselho.
  Corrigido também um marcador de interpolação incompleto em validação de campos alternativos.
- Inventário de arquivos não significa revisão manual concluída. Registrar separadamente
  metadados, leitura, execução funcional e dependências externas pendentes.
- Manter a auditoria aberta até concluir fluxos autenticados, mobile e navegadores. Ausência de
  Browser conectado não autoriza extrair sessões ou criar bypass de autenticação.

## Fontes primárias consultadas em 10/09/2026

- [Next / otimização AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).
- [Multer / campos multipart](https://github.com/expressjs/multer/security/advisories/GHSA-wc9g-mqfw-jrwm).
- [Nodemailer / resolução de conteúdo](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-8m3c-c648-2xjj).
- [Sharp / libheif](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c).
- `pnpm audit --prod --json` nos cinco escopos e metadados das versões no registro npm.

## Consequências e rollout

- Sem migration, env obrigatória, alteração de dados ou provider novo.
- Rebuild obrigatório de backend/frontend/admin; não basta alterar env ou reiniciar imagem antiga.
- Testar otimização de imagens e uploads após deploy. Correção Next pode alterar processamento de
  AVIF; não contornar o bloqueio de segurança para preservar um formato vulnerável.
- Rollout continua compatível entre as quatro apps. Push somente em homolog, com aviso e smoke.
- Rollback de imagem é possível sem restaurar banco, mas reintroduz versões vulneráveis: preferir
  correção adicional antes de considerar promoção para produção.

## Validação

Baseline e `pnpm check` final aprovados (476 testes das apps); quatro builds aprovadas em
`0.1.310`, sem mudanças de schema. Audit repetido com zero avisos conhecidos nos cinco escopos.
Smoke HTTP local das builds Next passou. Push/smoke publicado e execução no Browser permanecem
pendentes deste registro; a auditoria integral não está concluída.

## Complemento — limites exatos e smoke inicial

O teste ampliado de mensagens cobre agora `string.length` e `array.length`: a mensagem
precisa informar valor exato, não mínimo/máximo. Preservado o indicador tipado `issue.exact`
sem afrouxar a validação. Mudança aditiva apenas de mensagem, sem env/migration.

Commit inicial `1e10422a` enviado. Smoke de 10/09, 22:36 UTC confirmou frontend/Admin
`0.1.310`, rotas privadas redirecionadas, imagens e leitura pública funcionais. O backend
continuava saudável, mas em `0.1.309`; não considerar as mensagens antigas uma regressão
do código novo nem certificar deploy sem versão. Estado/log do Dokploy solicitado.

O log real do Dokploy confirmou uma falha introduzida no build inicial: importação de JSON
pelo teste novo sem `locales/` no estágio builder. O runtime já copiava esses arquivos.
A correção copia o mesmo catálogo no builder, preservando testes no typecheck e traduções reais.
Validar imagem completa `linux/amd64` (Node 22, pnpm fixo e sem env local) antes do novo push;
não iniciar o entrypoint da imagem nesse teste, pois ele aplica migrations em runtime.

Validação complementar concluída: `pnpm check` (477 testes), quatro builds e Docker completo
`linux/amd64` aprovados em `0.1.311`. Na imagem final, 13 testes compilados de multipart e
mensagens passaram com `--network none --read-only --cap-drop ALL` e entrypoint Node explícito,
sem banco ou migrations. A validação Docker cobre a diferença que o build local não detectou.

## Complemento — formulários e confirmação (0.1.312)

A conta dedicada foi criada pelo cadastro real, com autorização expressa para aceite e código do
usuário. Foram reproduzidos: botão de senha fora da ordem de Tab; label englobando botão/erro;
OTP deslocando casas após apagar um dígito; retorno indevido à confirmação após confirmação real.

Decisões:

- Corrigir a fundação existente: Container com label somente no título, descrição/erro associados
  por ID, preservando layout e reserva de erro. Senha respeita disabled/readOnly, tem foco visível.
- RHF guarda espaços apenas como casas vazias transitórias no OTP; schema continua exigindo seis
  dígitos. Botão de envio também valida completude, sem enviar espaços ou mudar contrato da API.
- Confirmação opta por `reloadAfterSet` no hook existente: persiste sessão antes de navegar para
  destino normalizado, descartando redirects/cache de hidratação antigos. Os demais fluxos mantêm
  router client-side. Não remover o guard nem confiar no cookie como autorização de backend.
- Testes Node usam React/RHF reais em render estático e TypeScript já instalado para TSX; nenhum
  pacote novo. Interação local de OTP usa controller e schema reais, sem API, em harness descartável.
- O novo cadastro ponta a ponta após patch ainda deve ser repetido; teste de wiring não certifica
  a integração. A auditoria não está encerrada nem autoriza produção.
- TASK-41/ADR-0440 permanecem bloqueados por texto jurídico aprovado ausente. Não publicar minutas
  ou substituir versões de aceite por uma aprovação fictícia. Escopo técnico não é parecer jurídico.

Fontes: código atual; documentação Next local `use-router.md` (Client Cache/prefetch/refresh);
proto/Login e Verificação de E-mail com Código; interação real em homolog e Browser local.
Builder MCP só retornou MUI nesta retomada, sem Quick Copy Lectum utilizável; não adotá-lo.

Deploy: somente código frontend, compatível com backend anterior; cinco manifests sincronizados.
Sem env nova, migrations, dados removidos ou alteração de provider. Smoke 0.1.311 aprovado antes
deste complemento; publicação 0.1.312 e novo ciclo de confirmação ainda pendentes no registro.
