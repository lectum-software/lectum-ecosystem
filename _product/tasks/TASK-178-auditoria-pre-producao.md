# TASK-178: Auditoria integral antes da produção

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-178 |
| Prioridade | P0 |
| Esforço | XL |
| Fase | Segurança e qualidade antes da produção |
| Status | In Progress |
| Dependências | TASK-177 |
| ADR alvo | ADR-0496 |

## Objetivo

Inventariar as quatro aplicações, rastrear fluxos e limites de confiança, corrigir defeitos
demonstráveis e produzir um relatório simples com evidência e lacunas explícitas. Inventário
automatizado, leitura de código e teste funcional são evidências diferentes; nenhum substitui outro.

## Escopo e regras operacionais

- Backend, frontend, admin, video, configuração de deploy, dependências e documentação vigente.
- Autenticação, autorização por objeto/função, sessões, uploads, playback, jobs, billing,
  notificações, privacidade, formulários, idioma, estados de loading/erro e mobile-first.
- Homologação somente; não promover para produção durante esta task.
- Não resetar, excluir dados em massa, limpar buckets ou disparar campanhas/pagamentos reais.
- Mutação funcional somente com contas e conteúdo dedicados à auditoria, rastreáveis e autorizados.
- Corrigir por mudanças compatíveis e commits coesos; preservar rollout independente das apps.
- Não adicionar dependências nem alterar schema sem decisão/validação específica.
- Safari real não é equivalente a emulação de viewport ou teste em Chromium.

## Critérios de aceite

- [x] Inventário de todos os arquivos versionados com classificação, hash e estado de revisão.
- [ ] Mapa dos fluxos, rotas, permissões, formulários e integrações das quatro aplicações.
- [ ] Revisão manual dos arquivos próprios registrada, sem contar varredura como leitura manual.
- [ ] Achados de segurança confirmados possuem correção e teste de regressão.
- [ ] Formulários e mensagens PT-BR revisados com estados vazio, inválido, pendente e falha.
- [ ] Fluxos autenticados e públicos testados em homologação com contas próprias da auditoria.
- [ ] Mobile-first, Chrome e Safari validados com evidência e limites do ambiente registrados.
- [x] Checks, dependências e builds das quatro apps passam; sem mocks como evidência de integração.
- [ ] Cada push informado e seguido de smoke de homologação; versões registradas.
- [ ] Relatório final simples enumera correções, riscos residuais e pendências.

## Dependências externas e situação inicial

- Branch confirmada: `homolog`, árvore limpa, base `70d6b726` / versão `0.1.309`.
- Usuário informou Admin autenticado em `https://homolog.admin.lectum.com.br/dashboard` e autorizou
  criação de contas no frontend. Em 10/09, a descoberta do Browser retornou lista vazia;
  reconexão solicitada, sem extrair cookies ou credenciais do navegador.
- Endereço de e-mail dedicado solicitado para cadastro/verificação real no frontend.
- Acesso a Safari/iPhone e Android reais ainda não confirmado.
- Builder não está disponível como ferramenta nesta sessão; referência visual local em
  `PROTO-INVENTORY.md` e `_product/proto`, a conferir por fluxo antes de alterar UI.

## Plano de execução

1. Registrar inventário e baseline de testes/dependências.
2. Rastrear entradas, permissões, saídas e efeitos de cada domínio.
3. Reproduzir achados, corrigir na fundação existente e adicionar regressões.
4. Validar código/build/browser; publicar correções compatíveis em homologação.
5. Repetir os fluxos afetados, completar cobertura e relatório, sem declarar pronto o não testado.

## Deploy e rollback

Nenhuma env obrigatória, migration, novo provider ou package previsto inicialmente. Qualquer
necessidade posterior deve ser registrada antes da mudança. Reverter commits de correção não deve
exigir restauração de banco; manter contratos antigos durante rollout. Não alterar segredos no chat.

## Evidências iniciais

- Inventário base de 3.121 arquivos e 449 entradas estáticas de rotas no relatório
  `../AUDITORIA-2026-09-10.md`. Leitura manual completa e resolução dos mounts continuam pendentes.
- Baseline `pnpm check` passou. Dependências corrigidas segundo ADR-0496; novo
  `pnpm check:dependencies` oferece repetição explícita nos cinco escopos, sem alterar runtime.
- Nova versão Multer já inclui o limite inclusivo: teste existente encontrou aceitação indevida
  do primeiro byte excedente após upgrade; removido `+1` somente de `fileSize`.
- Habilitados limites de profundidade/índice do parser; cinco casos HTTP locais passaram.
- Next novo trouxe avisos de navegação: router nos dois destinos do convite de cadastro/login,
  fechando o convite antes de navegar. Rejeição de sessão Admin e falha de sessão Google mantêm
  recarregamento completo por segurança, com exceção de lint local documentada.

- Login vazio em homolog revelou tipos internos (`string`/`undefined`) na resposta. Mapeamento
  da versão antiga do Zod foi substituído pelo contrato tipado Zod 4, com catálogo PT-BR e
  sem ecoar entrada, enum ou nomes de campos extras. Teste HTTP usa o validador real, sem banco
  ou autenticação simulada. Também corrigidas sete mensagens com acentos perdidos no catálogo.

- Removidos detalhes de tokens/dispositivo/provider SMS nas mensagens ao usuário; indisponibilidade
  da consulta profissional não culpa mais o Conselho sem evidência. Corrigido marcador de tradução
  em campos alternativos. Sete regressões do validador/catálogo passaram.
- Smoke HTTP local das builds Next passou (login, rotas privadas, versão/no-cache/noindex e imagem
  otimizada PNG). Browser real/mobile/Safari permanecem pendentes; não equivaler HTTP a UX.

## Validação da correção inicial — versão 0.1.310

- `pnpm check`: aprovado (117 frontend, 292 backend, 35 Admin, 32 video).
- Builds das quatro apps: aprovadas; frontend revalidado após ajuste de reset de sessão.
- `pnpm check:dependencies`: zero avisos conhecidos nos cinco escopos.
- `pnpm check:version`: cinco manifests sincronizados, um único bump por commit.
- Sem alteração de Prisma/schema/migrations, env obrigatória ou exclusão de dados.
- Push comunicado ao usuário; smoke pós-deploy será registrado após publicação real.

## Smoke e complemento de validação

- Commit `1e10422a` enviado a `homolog`; hooks repetiram checks com sucesso.
- Em 10/09/2026, 22:36 UTC: frontend/Admin `0.1.310`, `/version` sem cache/noindex,
  imagens PNG 200 e páginas privadas 307 para login. Backend `/health` e `/ready` 200,
  porém `/ping` ainda `0.1.309`: não certificar deploy das correções do backend.
- Leitura pública de feed e diretório continuou acessível sem sessão (200);
  rotas privadas mantiveram 401. Sem ler/expor dados pessoais nos registros do smoke.
- Estado/log de deploy do backend solicitado ao usuário; video privado não consultado.
- Regressão complementar: comprimentos fixos (`string.length`/`array.length`) devem informar
  quantidade exata em ambos os lados do limite. O mapeamento tipado preserva `issue.exact`,
  sem alterar quais valores são aceitos. Nova versão preparada: `0.1.311` (um bump).

- Usuário trouxe log do Dokploy: build `0.1.310` falhou porque o teste novo importa JSON de
  `locales/`, copiado anteriormente apenas no runner. Corrigido Dockerfile para copiar o mesmo
  catálogo real também no builder; sem excluir testes do typecheck nem simular traduções.
- Check agregado `0.1.311`: 477 testes passaram (117/293/35/32); quatro builds locais passaram.
  Imagem Docker completa Linux amd64 aprovada. 13 testes de parser/validador passaram na imagem
  final com usuário não root, rede externa bloqueada e filesystem somente leitura, sem iniciar
  o entrypoint/migrations ou conectar a banco.

## Continuação: Browser e formulários — 0.1.312

- [x] Backend/frontend/Admin `0.1.311` confirmados; 16 smokes de homolog passaram às 22:50 UTC.
- [x] Browser conectado: dashboard Admin e cadastro paciente exercitados em 390px/desktop.
- [x] Conta de auditoria criada e confirmada por e-mail real, com aceite expressamente autorizado.
- [x] Corrigidos foco da senha, semântica do label e deslocamento de dígitos OTP; 10 regressões
  com helpers reais e render React/RHF, sem instalação de dependências.
- [x] Browser local confirmou senha por Tab/Enter e OTP mantendo casas vazias; formulário
  temporário sem API removido antes do build. Não equivale a teste ponta a ponta do e-mail.
- [x] Loop de navegação depois da confirmação reproduzido: hard navigation passa, link client-side
  retorna à confirmação. Opt-in de navegação completa descarta cache antigo nessa transição.
- [ ] Repetir cadastro/confirmação real após publicar `0.1.312`, com nova conta dedicada.
- [ ] Concluir todos os demais fluxos e arquivos; auditoria continua aberta.

TASK-41 continua bloqueada: minutas jurídicas sem aprovação e links ausentes nos cadastros.
Não publicar texto inventado nem considerar aceite provisório regularizado. Esta pendência impede
recomendar promoção, mas não impede corrigir os demais defeitos técnicos na TASK-178.

Builder MCP disponível nesta retomada, porém só listou MUI; Quick Copy Lectum não acessível pelas
operações expostas. Conferidos protótipos locais de login/OTP e preservada fundação TASK-02.
Sem migration, env obrigatória, mudança de provider ou reset. Um único bump sincronizado para 0.1.312.

Validação 0.1.312: `pnpm check` aprovado (127 frontend, 293 backend, 35 Admin, 32 video;
487 testes), frontend build aprovado, `check:version` aprovado. Tipos temporários do harness
foram removidos de `.next/dev` antes da repetição limpa; rota não está no artefato final.

## Continuação — seletores 0.1.313

- [x] Enter e Escape sem efeito no select do perfil reproduzidos em homolog, sem salvar dados.
- [x] Opções passaram a usar click nativo; Escape fecha somente o dropdown focado e devolve foco.
- [x] Campos customizados registram ref RHF para foco de validação.
- [x] Browser local confirmou Enter/Espaço, Escape, busca e cidade dependente nas variantes
  customizada, busca em dropdown e busca no input; hooks reais, nenhum envio à API.
- [x] Check agregado: 489 testes aprovados; frontend build aprovado; bump único 0.1.313.
- [x] Repetir seleção no Browser publicado após deploy de 0.1.313: Enter, Escape e foco aprovados, sem salvar.

0.1.312: frontend/Admin publicados; backend /ping 0.1.312 e /ready 200 às 23:56 UTC.
Respostas transitórias 502 durante substituição do backend registradas; repetir smoke completo.
Conta confirmada chegou ao perfil via retorno da verificação no Browser publicado. Novo cadastro
com código real após patch ainda pendente. Capturas mobile variam entre 375px e 390px.

## Continuação — autenticação opcional e mensagens 0.1.314

- [x] Smoke final 0.1.312: 16/16 em 10/09, 23:57 UTC; 0.1.313: 16/16 em 11/09, 00:07 UTC.
- [x] Reproduzida falha real de conexão Prisma em processo isolado sem env/segredos publicados.
- [x] Autenticação opcional retorna 503 em indisponibilidade, sem tratar sessão incerta como visitante.
- [x] Erros padrão de validação em inglês filtrados na API/frontend, preservando mensagens PT-BR.
- [x] Mensagem técnica sobre configuração OAuth removida do painel de conta.
- [x] Check agregado 495 testes; builds backend/frontend; Browser local de erro em 1280px e 390px.
- [x] Smoke publicado de 0.1.314: 16/16 em 11/09, 00:23 UTC; backend/frontend/Admin na mesma versão.

Contrato público/privado preservado. Sem migrations, dependências ou variáveis novas, sem reset.
O teste isola Express/Passport/JWT/Prisma reais e catálogos reais; não simula um banco disponível.
O callback interno recebeu catch por revisão de fluxo; falta exercitar queda entre duas consultas
com sessão persistida real. Não declarar toda a autenticação ou o pentest integral certificados.

## Continuação — proteção de novas senhas longas 0.1.315

- [x] Reproduzida comparação incorreta de sufixos acima de 72 bytes, inclusive UTF-8.
- [x] Reutilizado Argon2id existente para novos hashes que excedem a capacidade do bcrypt.
- [x] Preservada compatibilidade de leitura de hashes antigos e política de 10–128 caracteres.
- [x] Seis testes de hash real passaram com bcrypt, argon e parâmetros de ambiente publicado.
- [x] Check agregado (499 testes), build backend e imagem Docker Linux amd64 aprovados.
- [x] Seis testes de hash na imagem final, sem rede, filesystem somente leitura e usuário não root.
- [x] Smoke publicado de 0.1.315: 16/16 em 11/09, 00:39 UTC, três apps na versão esperada.
- [ ] Avaliar redefinição controlada de senhas legadas; sem reset ou regravação automática.

Admin: formulário vazio de comunidade validado em mobile sem mutação. Ampliada a leitura de
guards/routers de comunidades e posts; não equivale a validação IDOR com segunda identidade.
Sem alteração de schema, env obrigatória ou dependências. Parâmetros Argon2 publicados existentes
(128 MiB por operação) mantidos; capacidade do servidor sob concorrência ainda precisa de validação.

## Continuação — anonimato 0.1.316

- [x] Exposição de ID anônimo reproduzida na imagem anterior com PostgreSQL isolado real.
- [x] Sanitizador central diferencia visitante/leitor, dono autenticado e guard administrativo.
- [x] Anonimato herdado preservado nos comentários próprios e salvos.
- [x] Quatro cálculos repetidos de apelido substituídos por helper HMAC centralizado.
- [x] Oito regressões adicionais passaram; build backend e Docker Linux amd64 aprovados.
- [x] Onze verificações HTTP com banco e autenticação reais passaram na imagem final.
- [x] Smoke publicado de 0.1.316: 16/16 às 00:57 UTC de 11/09, após fim do rollout.

Sem alteração do schema, novos segredos/envs ou dados publicados. Apelidos recalculados no rollout;
rotação da chave JWT também muda o pseudônimo. IDs reais somente para o próprio dono/guard Admin,
preservando clientes antigos. Rede e banco temporários removidos ao fim dos testes.
Teste inicial com domínio longo foi recusado pelo validador legado; usar domínio reservado curto
permitiu exercitar autenticação, sem e-mail enviado. Corrigir aliases/TLDs em mudança separada.

Check agregado 0.1.316: 507 testes aprovados, sem falha/skip; check:version aprovado.

## Continuação — e-mails 0.1.317

- [x] Divergência de formato entre frontend/backend reproduzida com HTTP real do validador.
- [x] Substituída expressão legada por Zod existente, mantendo caixa normalizada e identidade.
- [x] Quatro regressões de aliases/TLD, estrutura inválida, obrigatório/opcional passaram.
- [x] Check agregado: 511 testes; build backend e imagem Docker Linux amd64 aprovados.
- [x] Integração de login com aliases no banco isolado real: onze cenários passaram.
- [x] Smoke publicado de 0.1.317: 16/16 às 01:06 UTC de 11/09 e dois testes de formato de e-mail.

Sem banco/env/dependência nova. Não corrigir em massa e-mails inválidos anteriormente admitidos.
Browser publicado validou formulário vazio de posts em mobile sem publicar dados.

## Continuação — confirmação de e-mail 0.1.318

- [x] Aceitação após validade reproduzida na imagem anterior com banco isolado real.
- [x] Janela sem arredondamento, recusa de emissão futura e formato exato de seis números.
- [x] Consumo condicionado e atômico impede replay concorrente ou confirmação de emissão substituída.
- [x] Quatro regressões novas; check agregado 515 testes, build backend e Docker Linux amd64.
- [x] Sete cenários PostgreSQL reais passaram; quatro testes também passaram na imagem final.
- [x] Smoke publicado de 0.1.318: 16/16 às 01:20 UTC de 11/09, três apps na versão esperada.
- [ ] Repetir novo cadastro/confirmação por e-mail real, sem dispensar autorização da nova identidade.

Sem nova env, migration, reset, envio de e-mail ou alteração de contas publicadas nos testes.
Prazo configurado já existente passa a ser aplicado estritamente; código vencido exige reenvio.
Relatório leigo mantido curto em AUDITORIA-2026-09-10.md; detalhes movidos para o arquivo EVIDENCIAS.

## Continuação — recuperação de senha 0.1.319

- [x] Reproduzidos prazo excessivo, data futura, duas redefinições simultâneas e link antigo mantido.
- [x] Consumo de link/transação e expiração validados com PostgreSQL real isolado: oito cenários.
- [x] Troca autenticada invalida link anterior, mantendo contrato e sessões revogadas.
- [x] Check agregado: 515 testes; build backend e Docker Linux amd64 aprovados.
- [ ] Smoke publicado de 0.1.319.

Sem schema, env ou package novo. Script manual de regressão cria e remove apenas seu próprio
banco descartável; é proibido adaptar a execução para usar dados publicados. Cadastro real,
SMTP e Google permanecem com evidências/pendências separadas.
