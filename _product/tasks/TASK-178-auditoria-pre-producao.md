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
- [x] Smoke publicado de 0.1.319: 16/16 às 01:35 UTC de 11/09, três apps na versão esperada.

Sem schema, env ou package novo. Script manual de regressão cria e remove apenas seu próprio
banco descartável; é proibido adaptar a execução para usar dados publicados. Cadastro real,
SMTP e Google permanecem com evidências/pendências separadas.

## Continuação — formulários Admin 0.1.320

- [x] Mensagem inglesa reproduzida no Browser ao exceder o nome de uma categoria.
- [x] Duas regressões de limites/PT-BR e confirmação forte aprovadas, sem simular API.
- [x] Controllers com label separado, erro associado e indicação ARIA validados no browser local/estrutura.
- [x] Check agregado: 518 testes; check/build Admin e browser local aprovados; regressão estrutural aprovada.
- [x] Smoke publicado de 0.1.320: 16/16 às 01:46 UTC de 11/09; erro PT-BR repetido no Admin em 390×844.

Sem env, migration ou alteração de categorias. Uma validação isolada de componente não será
apresentada como criação/edição real de catálogo nem certificação de Safari/dispositivo real.

## Continuação — pré-requisitos da conta 0.1.321

- [x] Bypass de confirmação reproduzido em HTTP com PostgreSQL real isolado.
- [x] Troca de senha privada confirmava o e-mail sem código: reproduzido na imagem anterior.
- [x] Guarda central aplica confirmação/troca obrigatória sem bloquear bootstrap de autenticação.
- [x] 17 cenários de conta, oito de recuperação e onze de privacidade aprovados com banco real isolado.
- [x] Check agregado: 523 testes; build backend e Docker Linux amd64 finais aprovados.
- [x] Publicação `78c14408` e smoke 16/16 aprovados em 11/09, 02:17 UTC; três apps na 0.1.321.

Sem nova env, schema, reset publicado ou mudança do contrato de sucesso. Contas pendentes recebem
403 com orientação PT-BR; login/hidratação/confirmação e segurança da própria conta continuam
acessíveis, com sessão válida. Não confundir este teste com registro SMTP real ou revisão Google.

A rota de senha usada pelo painel Conta e a troca de e-mail também invalidam recovery anterior,
com helper central e transação movida para o módulo de sessões existente. A entrega SMTP da troca
de e-mail não foi simulada: essa parte foi testada no repositório real, não como envio ponta a ponta.

## Continuação — foco do player 0.1.322

- [x] Controle de som ficava invisível/aria-hidden mesmo mantendo foco de teclado em homolog.
- [x] Guarda de visibilidade do player protege foco visível, sem mudar acesso aos vídeos.
- [x] Browser local 390×844 validou Enter, mute, avanço e saída por Tab com componente/vídeo reais.
- [x] Check agregado: 524 testes; build frontend aprovado; harness local removido.
- [x] Publicação `c54e98c9` e smoke 16/16 em 2026-09-11T02:27:55Z; três apps na 0.1.322.
- [x] Browser publicado confirmou foco de mute visível durante reprodução; sem aria-hidden.

Sem API, schema, env ou pacote novo; não muda o design do player, upload ou URLs assinadas.
A reprodução real de um vídeo fora da tela funcionou após carregar; o texto inglês da árvore
acessível com source vazio não demonstrou falha do Stream. Não alterar segurança por essa hipótese.

## Continuação — saída do vídeo ampliado 0.1.323

- [x] Escape perdia a posição e pausava a reprodução: reproduzido no vídeo real em homolog.
- [x] Teclado e botão compartilham fechamento que captura o estado antes de remover o portal.
- [x] Browser local validou saída em reprodução e saída pausada/mutada no mesmo instante.
- [x] Check agregado 525 testes e build frontend aprovados; harness removido.
- [x] Publicação `a6ababbd` e smoke 16/16 em 2026-09-11T02:38:31Z; três apps na 0.1.323.
- [x] Stream real em homolog: Escape em 31,36s retomou reprodução após metadados, sem voltar ao início.

Sem mudanças em permissões, HLS, APIs, packages, migrations ou envs. Vídeos publicados não alterados.

## Continuação — troca administrativa de e-mail e emissão concorrente 0.1.324

- [x] Reproduzida manutenção indevida do link anterior nos dois repositórios administrativos.
- [x] Invalidação central reutilizada, na mesma transação de e-mail, sessões e auditoria.
- [x] 28 cenários de credenciais, emissão antiga, recuperação nova e rollback em PostgreSQL real isolado.
- [x] Repetidas as suítes de confirmação (17) e reset (8), totalizando 53 cenários reais adicionais.
- [x] Check agregado: 527 testes; build backend e imagem Docker Linux amd64 aprovados.
- [x] Smoke de homologação 0.1.324: 16/16 em 11/09, 02:57 UTC; frontend, Admin e backend nessa versão.

O rastreamento encontrou também emissão concorrente: uma entrega iniciada antes da troca podia
persistir o código depois dela. Incluir emissão pública/privada e administrativa condicionada ao
e-mail/hash de origem; falha de entrega antiga não pode apagar uma emissão mais recente. Manter
resposta pública genérica sem enumeração e recusa PT-BR de conflito nos fluxos autenticados.

Escopo: repositórios administrativos de paciente/psicólogo. Sem envio de e-mail real, alteração de
contas publicadas, env nova, schema, package ou contrato incompatível. A correção deve impedir que
um link enviado ao endereço antigo altere a senha e confirme o endereço novo. Rollback somente de
código, reintroduzindo o risco; não restaura links já invalidados.

## Continuação — campos simultâneos do Admin 0.1.325

- [x] Modal real de regra reproduziu `description` e `description-error` duplicados.
- [x] Input, textarea, select e grupo de checkboxes recebem IDs próprios com React `useId`.
- [x] Regressão com React/RHF reais e dois formulários: 14 IDs únicos, associação e SSR estáveis.
- [x] Componente real local validado em 390×844 e 1280×720: erro isolado, foco e Escape corretos.
- [x] Admin check (39 testes) e build limpo aprovados; harness temporário removido.
- [x] Smoke publicado .326: 16/16 às 11:25 UTC de 11/09; modal com IDs únicos, erro/foco exclusivos repetidos no Browser publicado.

Nenhuma env, banco, contrato de API ou package alterado. IDs DOM não são nomes de campos; payloads
permanecem iguais. Builder/Quick Copy foi tentado: resource recusou acesso por espaço diferente
(`Wrong space detected`). Usado proto Admin Comunidades/Comunidades - Detalhes.png e tela real,
sem redesenhar layout. Build inicial recusou source maps inline antigos em `.next/dev`; sem dev
server e com build local limpo passou. Não reduzir a checagem de source maps para mascarar isso.

Conta profissional de auditoria criada com aceite autorizado e confirmação real SMTP concluída;
plano grátis levou ao WhatsApp obrigatório. Número controlado foi solicitado, não inventado.
Comunidade `auditoria-lectum-178` e uma regra criadas pelo Admin para testes isolados de conteúdo.
Isso não certifica ainda publicação, moderação, pagamentos nem onboarding completo.

## Continuação — integrações de comunidades, billing e vídeo

Correções compatíveis publicadas na .327 (`4bcd50e6`). Sem alteração de schema,
migration, packages ou envs. Manter as quatro aplicações independentes.

- [x] Histórico financeiro: 13 cenários HTTP/Prisma/PostgreSQL reais na imagem local integral .326.
- [x] Comunidades: 16 cenários reais de concorrência/moderação em PostgreSQL, sem mounts de runtime;
  controles .324 reproduziram dez falhas. Não confundir retorno de serviço com HTTP.
- [x] Vídeo: check/build e 13 casos HTTP/Redis/fila/arquivos/FFmpeg, mais nove casos TLS/FFmpeg, repetidos.
- [x] Denúncia real entre contas próprias e resolução Improcedente no Admin geral, com confirmação forte.
- [x] Anonimato preservado após edição e logout; ações de edição/exclusão não disponíveis à outra conta.
- [x] Artefatos integrais .327 de backend/video, check agregado 578 e build Admin limpo;
  repetidos billing13, denúncias10, estado de posts48, concorrência16 e smoke da imagem video8.
- [x] Browser local da aba de denúncias em 390×844/1280×720 com módulos Admin e PG reais;
  filtros, vazio legítimo, erro real de rede e recuperação por retry conferidos.
- [x] Publicação das correções de backend/video/Admin em `4bcd50e6`, push em homolog concluído.
- [x] Smoke público 16/16 às 12:29:33 UTC de 11/09: backend/frontend/Admin .327, health/ready 200.
- [x] Browser publicado repetiu denúncias, seguimento em Salvos e remoção da resposta filha da lista/contagem.
- [x] Operador confirmou check privado pelo backend: vídeo .327, autenticação válida, ready e rede privada.

O check privado confirma conectividade e autenticação; não equivale a testar upload/render com
Cloudflare/R2 nessa versão. Esses fluxos continuam pendentes na matriz funcional.

Riscos de rollout: handles antigos de render e tokens antigos de partes de upload são recusados
por segurança; reiniciar somente operações em andamento. Réplicas backend antigas ainda aceitam
os interleavings defeituosos até concluir o rollout. Nenhum dado antigo será apagado/backfillado.
Checkout com resultado incerto e reconciliação canônica de eventos continuam pendências P1,
assim como os documentos legais aprovados. Não recomendar produção.

Próximas verificações dentro da auditoria: preferências não podem reativar opt-outs após GET
falho; documento estático e 109 leituras de notificações incorporados ao inventário, sem alegar
reprodução visual ou envio de todos os canais. Dados profissionais reais autorizados ainda
pendentes; WhatsApp foi salvo pelo fluxo real, mas perfil de auditoria não foi publicado.

## Continuação — contatos, validação e preferências

Recorte seguinte dentro da TASK-178, após push `4bcd50e6` da .327. Sem novo package, env ou schema;
não migrar contatos antigos nem alterar preferências de usuários como reparação automática.

- [x] Preservar DDD quando coincide com DDI; separar hidratação internacional e serialização nacional.
- [x] Recusar telefone excedente no backend sem convertê-lo silenciosamente em outro contato.
- [x] Limites do perfil profissional em PT-BR, incluindo tamanho do nome composto.
- [x] Inputs nativos ocultos; abertura por Enter confirmada para capa do perfil, foto e Trocar vídeo.
- [ ] Capa de vídeo existente e cancelamento nativo completo: dependem de mídia e suporte do Browser. Não confundir seletor aberto com upload concluído.
- [x] Formulário de notificações só pode editar/salvar um snapshot carregado e válido; erro oferece retry.
- [x] Alias inglês de preferências respeita o mesmo controle manual de permissão de push.
- [x] Aba Conteúdo aceita todos os tipos oferecidos; erro/carregamento não se apresentam como zero registros.
- [x] Check agregado: 614 testes das apps + 6 de versão; backend359, frontend159, Admin53, video43.
- [x] Imagem backend integral .328 e integração HTTP/PG23; Browser local real, erro e recuperação.
- [x] Builds finais frontend/Admin, sem source maps de produção; Admin sincronizou30 manifests.
- [x] Publicação2d1cb07b: smoke16/16, backend/frontend/Admin .328, health/ready200; filtros/preferências repetidos no Browser.

Outros riscos permanecem registrados, não incluídos silenciosamente nesse recorte: compensação
de upload após persistência incerta, checkout durável e confirmação canônica de eventos financeiros.

## Continuação — foco das denúncias

Bug reproduzido na .327: Tab alcança o fundo e fechamento perde o gatilho. Revisão de29 fontes
não encontrou uma fundação modal completa; copiar apenas Escape/autoFocus mantém a falha.
Implementar fundação pequena com dialog nativo, sem package, inicialmente somente denúncias de
posts/respostas. Não migrar os demais modais sem validar suas camadas e fluxos particulares.

- [x] Dialog modal com foco inicial, fundo inerte e navegação por teclado contida.
- [x] Retorno explícito ao botão persistente correto antes de desmontar o menu de ações.
- [x] IDs por instância; rerenders de campo, Escape, Cancelar, X e reabertura testados localmente.
- [ ] Navegação SPA enquanto aberto, camadas simultâneas e teclado virtual real: repetir em dispositivo.
- [x] Scroll lock compartilhável com cleanup e múltiplos donos; não prometer reparar locks legados.
- [x] Preservar RHF/Zod, visual e política de envio/fechamento existente.
- [x] Testes reais: frontend171/backend359/Admin53/video43 + versão6; build frontend e Browser local.
- [x] Publicação d367fee5/.329: smoke16/16 e modal repetido em homologação390px.

Safari/iOS, camadas de terceiros e outros modais permanecem na matriz até teste específico.
Nenhuma mudança de banco, API, env ou dependência prevista. Não enviar denúncias a terceiros.

## Continuação — integridade financeira e duração de analytics

A .329 foi validada em homologação antes deste recorte. Corrigir os parsers paralelos do
Financeiro Admin reutilizando o helper estrito já existente; não tratar evento bruto como
consulta canônica nem alterar sem decisão regras de dedupe, MRR/cortesia ou receita líquida.
Também foi reproduzida no PG descartável a regressão de duração por atualizações concorrentes
e a gravação em evento removido enquanto uma atualização aguardava lock (controle .328:6/8).
Sem novos campos, envs ou serviços; sem reprocessamento de dados publicados.

- [x] Financeiro recusa falsos status pagos, quantias malformadas/não finitas e vínculo por substring.
- [x] Histórico financeiro não entrega status_detail técnico bruto; contrato preservado com valor seguro.
- [x] Casos negativos pelos helpers/consumidores reais; sem mock de provider/banco para concluir.
- [x] Duração de página só cresce, atomicamente; evento removido ou outro visitante/sessão não muda.
- [x] Regressões concorrentes reais em PG isolado, baseline e imagem corrigida, cleanup verificado.
- [x] Checkglobal662, buildbackend e imagem integral .330, integrações PG8+48 aprovados.
- [x] Publicação056b09ab e smoke16/16 da .330 em homologação; health/ready200.

Continuam P1 externos: tentativa durável de checkout e liquidação canônica/inbox. Série incompleta,
CSV cortado e dedupe de tentativas precisam recorte próprio com semântica explicitada; não
corrigir valores reais por inferência nem executar cobrança para preencher a lacuna.


## Continuação — hidratação consistente da sessão

H1 reproduzido em Browser390/1280 no source congelado056b09ab com sessões locais válidas.
O primeiro render cliente produzia loading diferente do HTML do servidor. Reutilizar fundação
neutra existente, sem afrouxar autorização ou esconder o aviso.

- [x] Snapshot inicial coincide entre SSR e hidratação; cookie só participa depois.
- [x] Boundary e template compartilham assinatura, timer e cleanup; sem imports entre features.
- [x] Cinco testes SSR reais incluídos no runner; checkglobal667 e build otimizado local aprovados.
- [x] Browser local: público/privado, com/sem sessão, falha de rede, retry e revogação real.
- [x] Bump/commit/push c56c6ca4 e smoke16/16 .331; recargas públicas390/1280 e perfil privado390 em homologação sem novo erro de hidratação.

Nenhuma env, migration ou dependência nova. Checklist não certifica Safari/iOS/Android reais,
cleanup cliente sob todas as camadas nem replay de intents. Configurações/SEO e conversão têm
novos riscos estáticos no registro de evidências; permanecem em execução, não corrigidos por H1.

## Continuação — leitura e manutenção segura de metadados

Controle real na imagem .330/PG descartável confirmou quatro falhas: duas leituras frias
concorrentes conflitam ao criar defaults; GET público modifica dados legados; sincronização
atrasada sobrescreve canônico recém-editado e altera registro removido enquanto aguardava lock.

Direção: leitura pública sem escrita e projeção PT-BR dos aliases conhecidos, sem inventar
registros/datas; provisionamento explícito nos serviços Admin, idempotente e com verificação de
colisões; manutenção usa comparação atômica dos valores lidos e recusa registros removidos.
Preservar campos editoriais, IDs, defaults existentes e contrato JSON. Sem migration/env/package
novo, sem reparação em massa de dados publicados. Réplicas antigas mantêm risco até fim do deploy;
rollback somente de código, sem apagar metadados já criados.

- [x] GET público e findByKey não escrevem nem criam defaults, mesmo com PostgreSQL recusando gravações.
- [x] Inicializações administrativas concorrentes não geram conflito nem substituem IDs.
- [x] Manutenção não sobrescreve customização concorrente nem modifica tombstone.
- [x] Controles de aliases, timestamps, auditoria administrativa e colisão de ID passam no PG real:18/18 na imagem final .332; colisão provoca rollback total.
- [x] Checks/build/imagem, commit372e534d/push e smoke16/16 .332 registrados; health/ready200, Admin SEO conferido sem edição. Primeiro deploy falhou no auth Docker Hub500 antes do build; repetição do usuário publicou sem mudança de código.

## Continuação — associação e cancelamento de vídeo sem disputa destrutiva

M2/M3a reproduzidos duas vezes em PostgreSQL descartável/imagem .330: cancelamento concorre
com criação/edição de post/resposta ou associação de perfil; os cinco casos deixam referência
persistida a ativo cancelado. Testes não acionaram Cloudflare/R2 nem dados publicados.

Implementar admissão e cancelamento na mesma decisão transacional serializável, reutilizando
retry existente e validação tx-aware de domínio. Preservar mídia R2, regras de acesso, contexto,
dono, remoção deliberada e CAS da migração. Nenhum provider dentro de transação/retry.

Separar abort de tentativa de remoção explícita por endpoint aditivo autenticado
`DELETE /api/private/video-assets/uploads/:id`, que recusa qualquer ativo associado, inclusive
perfil. Frontend novo só usa esse endpoint para cleanup; não recorre ao DELETE antigo em 404.
Assim, frontend novo/backend anterior degrada para retenção temporária, não exclusão destrutiva.
O DELETE legado continua compatível; clientes antigos mantêm risco semântico até atualização.
Sem schema, migration, env ou dependência nova. Sem reparo/limpeza em massa. M1/M4–M7 permanecem
separados até prova/correção própria; não chamar este recorte de conclusão de uploads.

- [x] Associação/cancelamento confirmam somente uma ordem válida nos dois sentidos em PG real.
- [x] Perfil revalida ativo atual, mantém newest/CAS, não referencia ativo cancelado.
- [x] Cleanup de tentativa não remove vídeo associado; remoção explícita permanece possível.
- [x] Frontend não usa DELETE destrutivo como fallback de cleanup durante rollout.
- [x] Admissão por dono/contexto/finalidade, controles R2 e payloads existentes preservados.
- [x] Checks673, builds/imagem, PG28+16HTTP+16concorrência+48post-state e Browser local registrados.
- [x] Commit8dc679b9/push .333 e smoke17/17 publicados; backend/front/Admin.333, health/ready200.

## Continuação — recuperação usa o endereço realmente enviado

AF4: onSuccess lê o campo mutável do formulário, enquanto a requisição já carrega outro valor.
Corrigir estado de confirmação/reenvio para usar as variáveis da mutation; contrato do caller
pode expor esse argumento sem quebrar callbacks antigos. Reenvio valida o mesmo schema e nunca
recorre ao campo editável. Fundação Form só-leitura durante envio, sem novo controller/package.
Não alterar tokens, prazo, respostas anti-enumeração, API nem envio no backend. Sem migration/env.

- [x] Confirmação vincula-se ao payload submetido, não ao campo alterado depois.
- [x] Reenvio usa somente endereço confirmado e passa pelo schema existente.
- [x] Campo/ações bloqueados durante envio e erro permite corrigir/tentar novamente.
- [x] Checks/build e Browser local/mobile executados; entrega de e-mail não presumida.
- [x] Commit/push e smoke registrados na integração0.1.335 (c2daa015,17/17).

Validação .334:679 testes do workspace, build frontend, Browser390/1280 com vazio/inválido
e falha real de transporte. Pending em Form/controller SSR reais; vínculo da mutation e
reenvio têm contratos estáticos explícitos. Não afirmar entrega, sucesso ou reset concluídos.

## Continuação — integração com atualização concorrente .334

O push de2aa02fa9 foi recusado porque58b071e9 publicou outra.334 (campo Cidade e auxiliares).
Integrar ambos por merge revisado, sem force/rebase destrutivo. Nova versão única.335 em novo
commit de integração; o bump.334 anterior não será repetido naquele commit. Preservar ajustes
Cidade/Estado, limpeza de diretivas e junction de teste, salvo regressão demonstrada.

O merge revelou5MiB+1 aceito pelo middleware real com Multer2.3.0 fixado no lock. Restaurar
fileSize inclusivo nativo; manter fieldNestingDepth0 para campos simples. Sem env/schema,
provider ou dados publicados. Reexecutar checks/builds dos apps afetados e imagem backend.

- [x] Merge preserva os dois históricos e mudanças de interface concorrentes.
- [x] HTTP local aceita limite exato e recusa excesso de um byte com dependência travada.
- [x] Checks, builds e Browser da integração executados e documentados.
- [x] Versões335/health/ready e push confirmados em c2daa015; smoke17/17, sem atribuir smoke334 à correção não publicada.

## Continuação — identidade de contato, confirmação e modalidade (PF1–PF3)

Baseline por imports reais, sem provider: conversor do WhatsApp perde DDD igual ao DDI e
schema admite16dígitos ao aplicar a mesma remoção; perfil exclusivamente presencial usa
rótulo híbrido. Três contratos falham e controle online passa no artefato335. Corrigir usando
conversões compartilhadas do perfil já corrigido, sem import entre formulários de páginas.
Hidratação retira DDI uma vez; serialização/validação recebem número nacional intacto.

Durante confirmaçãoCFP, impedir reinício/seleção concorrente e envios duplicados na tela;
nenhuma promessa de cancelar aprovação no backend ou mudança em check_id/result_key.
Preservar rótulo presencial/híbrido ao acrescentar cidade/UF. Sem env/migration/API/provider.
Não inventar CPF/CRP nem chamar verificação com identidade de terceiros. Prova da consulta
real e conclusão de cadastro continuam dependendo de dados autorizados.

- [x] WhatsApp das duas telas compartilha conversão e validação sem remover DDD.
- [x] Excesso de tamanho é recusado sem truncar/transformar a entrada em outro contato.
- [ ] Confirmação pendente bloqueia ações conflitantes e recupera controles após erro.
- [x] Modalidades online/presencial/híbrida e localização parcial mantêm significado correto.
- [x] Testes/build/Browser e limites de prova documentados, sem provider simulado.
- [x] bf18ba4c publicado;16/16 smoke336, backend/frontend/Admin alinhados, health/ready200.

Validação336:692 testes do workspace (197frontend/393backend/53Admin/43video/6versão),
build frontend final e gate real de sessão no Browser local390px, com validação de vazio
PT-BR e foco no e-mail. SSR usa componentes/Form/RHF reais;2 testes CFP são de composição
estática explicitamente, não simulação do provider. Confirmação pendente está bloqueada no
código e no card SSR; repetição visual após erro permanece pendente de sessão/identidade
profissional autorizada. Não houve consultaCPF, contatoWhatsApp, alteração cadastral ou cobrança.

### Próximo recorte reservado, após336 — vocabulário Admin e teclado em comunidades

Implementação delegada de BA02/04/05/07 (rótulos canônicos, notas PT-BR e tipos de suspensão)
e CP1/copy resposta-comentário. Sem env/schema, pagamentos, provider, publicação de conteúdo
ou alteração de autorização. Escopos de escrita distintos; não incluir mudanças ainda não
integradas no commit336. CP2/3, BA01/03/06 e demais achados continuam pendentes de validação
focal; não declarar reprodução runtime a partir somente de fonte.

### PF4 — máscara nacional com seletor de país

O PhoneController aplica máscaraBR também a países estrangeiros e esconde dígitos longos;
no campo com DDI separado, a entrada nacional não deve ser interpretada como internacional.
Preservar todos os dígitos para validação, manter máscaraBR apenas quando compatível e
apresentar número nacional sem máscara inventada nos demais países. Não alterar formatter
legado de exibição usado fora do controller. Sem contato real, pacote, schema ou env.

- [x] Regressão SSR demonstra perda de dígitos exibidos no controller real antes da correção.
- [x] Campo com país preserva os dígitos e mantém feedback de tamanho no schema existente.
- [x] Testes/componentes reais e limite do Browser documentados, sem certificar titularidade.


### Integração337 — teclado, vocabulário e campos profissionais

- [x] CP1 remove exclusão do Tab e mantém foco em cliques de teclado; ponteiro conserva retorno ao editor.
- [x] Copy distingue resposta/comentário sem alterar permissão, exclusão ou silenciamento.
- [x] BA02 reconhece self_harm/abuse em classificação derivada do resumo, preservando demais fallbacks.
- [x] BA04/BR05 traduzem gênero permitido e garantem fallback textual para chaves não próprias/vazio.
- [x] BA05 mantém ressalvas de métricas em PT-BR, sem nomes internos de colunas.
- [x] BA07 alinha tipo de duração à suspensão, sem alterar o validator HTTP1..90 existente.
- [x] 731testes/checks, builds frontend/backend e Docker real +17testes compilados aprovados.
- [ ] Browser autenticado de paciente valida sequência Tab/Space/Enter e teclado móvel em CP1.
- [x] Publicação337:3c8b356a,16/16 smoke em11/09 16:45UTC; backend/frontend/Admin337 e health/ready200.

Browser337local: gate/login observado em1280px após reload do build; sem sessão autenticada
local, não certifica formulário privado. Prova do handler é unitária; não chamar input.detail=0
em Node de uma tecla real do Browser. Para CF P/WhatsApp/provider continuam os limites336.

### Continuação338 — histórico administrativo e diagnósticos controlados

Antes de editar: confirmar BA03 (histórico de profissional inativo), BR05 (rótulos de
notificações obtidos por propriedade herdada) e V05 (diagnóstico FFmpeg fora do catálogo)
com funções/validadores reais e controles. Não simular banco/provider nem executar M1.
Preservar autorização administrativa, contratos públicos, filtros conhecidos e histórico;
nenhuma env, migration, pacote ou reparo de dados. Video mantém deploy independente.

- [x] Filtro do histórico mantém exclusão/IDs/papel sem exigir conta ativa; contrato6/6, sem simular banco.
- [x] Resolução de títulos e diagnósticos usa chaves próprias/fallback seguro;16/16 e9/9 focais.
- [x] Regressões, check758, builds e imagens backend/video aprovados; limites de prova registrados.
- [x] Publicação338:18/18 smoke, três apps públicas338; operador confirmou vídeo338 autenticado/pronto via rede privada.
- [ ] Histórico de uma conta inativa dedicada validado emHTTP, sem suspender usuários reais.

### Continuação339 — falhas operacionais de vídeo e precisão do E2E

Recorte V02/V06: confirmar a classificação do timeout interno de ffprobe, preservando
cancelamento e rejeição permanente de arquivo inválido; o relatório do script E2E deve
distinguir cancelamento realmente executado de etapa opcional não testada. Sem alterações
de API/banco/credenciais/env/dependências ou recursos publicados. Não executar M1.

- [x] Classificador do timeout preserva falha operacional/retry;22/22 focais e política da fila revisada por fonte.
- [x] Sumário do E2E distingue cancelamento omitido;5/5 testes de relatório/composição, sem executar E2E.
- [x] Check774, build/imagem de video e22testes compilados aprovados, sem equivaler a job real publicado.
- [ ] Publicação339 e smoke de homologação; conexão/versão privada de vídeo confirmadas.

BR08 reanalisado: writer vigente persiste apenas±1 e marca voto desfeito como deleted=true.
A hipótese de registro0 ativo segue sem ocorrência demonstrada; não alterar dados nem
classificar como incidente confirmado a partir apenas da ausência de filtro na leitura.

### Continuação340 — consistência das interações e limites do render

Escopo de fechamento: CP2 (props novas versus snapshots locais de votos/salvos), CP3
(rollback preservando outros alvos/campos/operações) e V03 (dimensões do render social
dentro da configuração vigente). Confirmar por contratos reais e processos locais; não
equivaler teste puro/React/QueryClient a integração autenticada ou incidente publicado.
Em paralelo, localizar documentos legais e registrar precisamente o requisito externo,
sem inventar texto aprovado nem desbloquear produção por presunção.

Branch homolog; preservados os arquivos locais do usuário em admin. Sem novos packages,
schema/migrations, env obrigatória, reset ou alteração em dados publicados. Frontend e
video mantêm publicação independente. Rollback de código não exige restaurar banco.
Builder acessível lista somente MUI, sem referência Lectum/Quick Copy disponível por essa
interface; usar proto local de Feed Comunidade/Posts Salvos, preservando layout mobile-first.

- [x] CP2 reconcilia dados novos sem apagar interação pendente e sem reutilizar estado de outro alvo/usuário.
- [x] CP3 rollback limita-se ao alvo/campos da operação e preserva atualização mais recente.
- [x] V03 respeita limites configurados sem relaxar inspeção da saída nem mudar o default visual.
- [x] Checks/builds e provas locais aprovados; leitura registrada sem contar duplicatas.
- [x] Publicação/smoke340 registrados; limites funcionais restantes explícitos.

Atualização da publicação339: em11/09 às17:35UTC, backend/frontend/Admin339 e18/18smoke,
health/ready200. Serviço privado de vídeo ainda tem como última prova do operador a338;
isso não bloqueia os trabalhos locais independentes nem comprova encode/playback publicado.

Complemento de integração340: commit/rollback exigem mesma instância Query; recibos devem
corresponder ao post/tipo/resposta iniciado. CP3 tem106/106 contratos locais (88 do executor
+18 de recibos pelo integrador), não equivalentes a requisições autenticadas. 13 testes CP2
e11 transições do hook real no Browser passaram; baseline de estado extraído dos três
cards reproduziu valores antigos. Build local da comunidade retornou estado de falha de
conexão após hidratação; não contar como integração local bem-sucedida nem contornar CORS.

Minutas e versões provisórias do aceite localizadas; URLs previstas de termos/privacidade
retornaram404 em homologação. Aprovação dos textos solicitada ao responsável, sem publicar
minutas nem modificar aceites antigos. Base:1461 leituras iniciais,5parciais,1655pendentes.

### Continuação341 — convite de cadastro após recuperar sessão

CP4 reproduzido no Browser em390px após publicar frontend340: voto/salvamento na comunidade
dedicada persistiram, mas reload abriu convite de criar conta; depois de fechar o convite,
Perfil confirmou a mesma conta autenticada sem novo login. Rastrear hidratação/conversão,
sem desligar autorização nem presumir que cookie/sessão deixaram de existir.

- [x] Causa demonstrada por fonte e contrato real, mantendo gates de ações privadas.
- [x] Correção testada localmente e repetida em homologação; sem mocks como prova de integração.
- [x] Publicação340/341, ações da auditoria e limites restantes registrados com precisão.

Sem migration/env/package previsto; não operar M1, produção, dados de terceiros ou credenciais.

CP4: callbacks antigos ignoravam autenticação atual; timeouts0/250ms não eram cancelados e
o prompt aberto sobrevivia à hidratação autenticada. Guard atual, limpeza dos timers e
descarte/ocultação da oferta corrigidos sem mudar boundary, autorização, intents ou textos.
Baseline36:16pass/20fail; final36/36 (34contratos reais locais +2checks estáticos).
ReactDOM/StrictMode no Browser:6transições locais aprovadas, não equivalentes a login real.
Frontend check371/371 e build otimizado aprovados. Publicação341 ainda exige smoke/Browser.

Leitura lateral:97arquivos de migrations/lock,3061linhas, todos integrais e hashes conferidos;
nenhum novo defeito vigente demonstrado, nenhuma operação de banco. Preservar distinção
users.id/perfil.id, reativação de vínculos soft-deleted e validação de alvo no writer.
Pré-condições históricas de upgrade não comprovam incidente publicado nem autorizam reset.
Ledger integrado por path+hash:1561leituras iniciais,5parciais,1555pendentes na base3121.

Publicação341:632566df em homolog;18/18smoke às18:50UTC de11/09, três apps341,
health/ready200. Nova aba em390px: recargas/rolagem e Perfil mantiveram sessão sem convite.
Reload da ferramenta voltou ao topo; não afirmar restauração da rolagem nem todos os timings.
Durante rollout houve estado de sessão/comunidade indisponível; reload posterior recuperou
sem novo login, sem identificar causa exata. Nenhuma nova mutação persistida neste reteste.

### Continuação342 — campos de período, teclado e scanner de imports

Leitura lateral frontend68arquivos revelou três achados P2. FE341-03 confirmado no Browser
publicado341: limpar uma parte da data e Aplicar fecha o editor e substitui os dados por erro.
Todo o período recuperou a consulta; só leitura de dados da conta dedicada, sem mutação.
FE341-02: remover anexo explicitamente fora da sequência Tab; corrigir sem mudar permissões.
FE341-01: inversão do eixo de retenção não corresponde ao SVG; baseline aritmético/SSR confirmado.
Scanner de ciclos ignora resolução de imports.js para fontes.ts no vídeo; provar e corrigir
sem afirmar existência de ciclos reais antes do grafo completo.

- [x] Datas com RHF/Zod/controllers; inválidas mantêm editor/consulta e erro local PT-BR.
- [x] Remoção de anexos acessível por Tab/Enter/Espaço, mantendo disabled/permissões/foco.
- [x] Scanner resolve fontes de imports emitidos sem confundir tipos e dependências externas.
- [x] Baseline/final, Browser mobile, builds, leituras e publicação registrados (interfaces342 incorporadas343).

Sem nova env/package/migration; não ampliar acesso nem editar dados de terceiros.

- [x] Retenção usa CTM nativo do SVG/eixo existente e slider com teclas/gates preservados.
- [x] Root check1034 testes:1028 aprovados/6skips conhecidos de drawtext; frontend427/427 e build.
- [x] Ledger:82novas leituras da base,1643iniciais/5parciais/1473pendentes;1622paths no ledger.

Browser local com componentes/fontes e CSS reais, sem respostas API substituídas:
390px: data vazia mantém editor/consulta; cancelar descarta rascunho; válido aplica uma vez.
Anexos: Tab/Shift+Tab, Enter/Space e mouse removem item correto e retornam ao editor;
disabled fica fora do Tab. Retenção: cliques no eixo0/50/100 resultam0/50/100; setas,
Home/End e gate locked; Enter/Space não buscam início. Desktop1280: clique inteiro no
marco central resultou49,66%, coerente com arredondamento do pixel (não exigir precisão subpixel).
Conta dedicada publicada sem vídeo/plano: não declarar prova remota de seek, métricas ou upload.
Minutas legais, aparelhos reais e fluxos restantes mantêm TASK178 em andamento.

### Continuação343 — editor bloqueado e eventos nativos

Leitura integral do controller antes parcial revelou hipótese confirmada no Browser local:
com disabled/readOnly=true, o campo aceita texto e altera RHF. CSS WebKit força edição apesar
de contentEditable=false; handlers também não têm gate. O evento de digitação usado pelo
React não garante inputType: startsWith direto lançou exceção na mesma interação nativa.
Sem envio à API ou mutação persistida. Screenshot e fonte original em /tmp/lectum-task178-contenteditable-343.

- [x] CSS e handlers respeitam disabled/readOnly sem bloquear seleção/cópia/navegação.
- [x] beforeinput tolera forma real do evento e mantém teto, exclusão, nova linha e colagem.
- [x] Contratos reais + Browser local com controles ativo/bloqueado, check/build e publicação.

Reusar controller/fundação existentes; helper adjacente somente se necessário. Sem env,
package, migration/reset ou regra remota nova. UI mobile-first/tokens preservados; rollback
frontend independente. Não generalizar este teste como certificação IME/Safari/aparelhos reais.

Mesmo controller, teto200: palavra longa expandia o item grid para1885px em container360px
(viewport390). DOM real confirmou min-width:auto e overflow-wrap:break-word. Acrescentar
min-w-0 ao editor conforme padrão dos campos; não alterar limites. O output diagnóstico do
harness também precisa quebrar linhas, mas não é código de produto nem parte do finding.

343:14/14 contratos locais (política/SSR/wiring), Browser nativo390 e1280 com RHF real.
Disabled/readOnly juntos e isolados não alteraram DOM/RHF sob digitação/Enter/paste; ativo
conservou nova linha, teto200, exclusão e substituição. Palavra longa em390:1885→360px;
em1280:398px no container398, sem overflow do campo. Sem autenticação/API nesta prova.
Root check1048:1042pass/6skips drawtext conhecidos, frontend441/441 e build otimizado aprovados.
Bump343 uma única vez; publicação/reteste do formulário integrado ainda não creditados.
Leitura parent28paths atuais:26da base, completando5parciais. Base1669iniciais/0parciais/
1452pendentes; ledger1650. Os dois subagentes ainda leem Admin/backend; não contar progresso
incompleto como cobertura integral.

Deploy342: operador mostrou Done do05f1506d. Backend342,health/ready200 confirmados11/09
19:43UTC; frontend/Admin ainda341. Registro não equivale a publicação das interfaces.
A342-03 confirmado no Admin publicado341: alterar Até com De vazio em Comunidades remove
os controles e mostra período inválido. Tentar novamente restaurou all; sem mutação.
Corrigir em patch próprio após343; não confundir com analytics profissional FE341-03.

### Continuação344 — preservar dashboard durante edição de datas

A342-03 confirmado no Admin homolog341 e rastreado ao período selecionado usado na query antes
do commit de datas. Reusar separação selecionado/aplicado já presente no dashboard pacientes
junto ao hook useDateRangeCommitOnBlur existente. Extrair somente coordenação local testável.

- [x] Digitar data incompleta/invertida conserva dashboard, consulta e campos para correção (prova local).
- [x] Commit válido troca consulta uma vez; presets e rótulos usam o período aplicado correto (estado local).
- [x] Contratos de estado React real, Browser local, admin check/build e smoke de publicação.

Sem nova env/package/migration ou mudança remota; UI/tokens e conteúdo existentes preservados.
Não usar mocks/API substituída para concluir integração nem alterar dados reais nesse teste.

Publicação343: aaf0dddf emhomolog;18/18smoke11/09às19:53:57UTC,backend/frontend/Admin343,
health/ready200. Analytics autenticado em390: data vazia+Aplicar mantém editor e mensagem
Informe a data de início; cancelar descarta rascunho; intervalo válido carrega e volta sem erro.
RestauradoTodooperíodo. Conta gratuita/semvídeo: não afirmar seek/playback pago ou salvarpost.

344:9/9regressões (8estado ReactSSR +1wiring), Browserlocal390/1280 com componentes e
hook reais. Up emAté quandoDe vazio mantém all aplicado; blur mostra erro; presetmês limpa;
mover foco entre datas conserva mês; sair aplica custom01–10/09. SemAPI/substituições.
Admincheck62/62,buildotimizado e rootcheck1057 (1051pass/6skipsdrawtext) aprovados.
Bump344uma vez; publicação344 validada posteriormente (18/18smoke). Nenhumenv/package/migration.

LeituraSocrates dos275alvosAdmin/58.723linhas completa,1suporte; hashcongelado e versões
concorrentes separados. Parent releucliente e diff344, sem creditar fonte antiga comhashnovo.
Base1944leiturasiniciais,0parciais,1177pendentes;ledger1927. NoveachadosAdmin documentados;
A342-03corrigido localmente, demais emtriagem/execução. TASK178segue emandamento.

### Continuação345 — busca estável e minimização de documento

A342-04: Browser Admin343 confirmou busca pacientes perdendo foco após debounce/URL;
input remontado por key=query.q. Corrigir pacientes e psicólogos mantendo navegação/rascunho.
C13: helper cpf_masked da verificação retornava documento inteiro, enquanto auditoria pessoal
já usava máscara real. Centralizar a política existente sem importar serviços com efeitos.

- [x] Busca mantém identidade/foco, sincroniza valor externo e cancela callbacks obsoletos (contrato/Browser local).
- [x] cpf_masked oculta dígitos nos consumidores atuais e nunca devolve entrada inválida bruta (fonte/contratos).
- [x] Contratos reais, Browser de busca, checks/builds e publicação registrados.

Não mudar CPF completo do formulário privado autorizado nem aprovações/identidade (C17 em
triagem de requisito separada). Sem env/package/migration/reset/provider; nenhum teste de M1.

345: hook compartilhado elimina duplicação de coordenação nas buscas. 17 contratos focais
aprovados; root1078 (1072pass/6skips drawtext), Admin79/79+build otimizado, backend439/439+
build aprovados. Sem migração/env/package. Publicação345 validada depois: 5/5GETs públicos e busca autenticada nas duas listas.

### Continuação346 — contenção do menu administrativo

A342-08 reproduzido no menu recolhido do Admin344: Tab permite focar a página atrás do
overlay. Usar fundação existente para conter foco, Escape/retorno e preservar sidebar
desktop, mudança de rota e scroll. Sem redesenho, novo pacote, env ou migração.

- [x] Menu aberto mantém navegação de teclado dentro do conteúdo e fecha/restaura foco corretamente.
- [x] Contratos reais, Browser local/publicado e admin check/build aprovados.
- [x] Template de ADR e complemento0441 incluem quatro apps/cinco manifests, preservando histórico.

Decisão expressa do responsável11/09/2026: selo=registro ativo aprovado (CFP ou humano),
sem promessa de comprovação de identidade. Registrada no ADR0496; não adicionar KYC.

A345-01 observado na lista publicada: um resultado dizia “1 psicólogos encontrados”.
Ajustar singular nas duas listas, preservando zero/plural e estado sem resumo.
- [ ] Um resultado usa singular; zero e múltiplos usam plural (Browser e build).

C24: parseCrpRegistrationDate comparava o instante normalizado ao meio-dia com agora e
recusava a data civil de hoje pela manhã. Comparar dias em America/Sao_Paulo usando a
mesma referência temporal; manter armazenamento12h-03, formatos e allowFuture existentes.
- [x] Hoje é aceito durante todo o dia civil; amanhã continua recusado sem allowFuture.
- [x] Casos de meia-noite/mês/ano/bissexto e legado passam sem relógio global falso.

346 validação local: root1096 testes (1090pass/6skips drawtext conhecidos), backend450/450,
Admin86/86; builds backend e Admin aprovados. C24:11/11 em3fusos; reprodução anterior6falhas.
Menu:7 contratos estáticos e hook real no Browser em390/1280; ciclo Tab/ShiftTab, Escape,
retorno, pilha aninhada e preservação da busca atrás. Não equivale ao shell completo;
resize/navegação, plural e reteste do menu publicado ainda pendentes. Bump346já executado.

### Continuação347 — nomes acessíveis e onboarding de desenvolvimento

A342-05: parent confirmou no Admin345 seletores de Especialidades/Abordagens sem nome
acessível. Reusar nomes contextuais e padrão existente de paginação; sem redesenho ou
mudança de payload/RHF. FS345-01 e DOC-01: substituir READMEtemplate frontend e alinhar
instruções Cursor/GitHub a quatro apps/cinco manifests, sem executar receitas históricas.

- [x] Expansores e paginação têm nome/estado acessível coerente; ações anteriores preservadas.
- [x] Browser local/publicado, checks e build Admin registrados com limites explícitos.
- [x] READMEfrontend e regras de release citam pnpm, homolog, cinco manifests e gates vigentes.

Sem nova env/package/migration/reset; rollback independente. Esta continuação não resolve
requisitos externos de documentos legais ou integração CFP/pagamento. KYC não faz parte da promessa do selo.

D2 do suporte backend: revisar interpolação e limites em mensagens Zod, e rastrear copy
excessivamente técnica até os consumidores. Corrigir apenas contrato textual estabelecido,
sem adivinhar regras Gratuito/Profissional ou alterar domínio/provider.
- [x] Mensagens alcançáveis e defeitos de interpolação corrigidos com contratos reais do tradutor.

Publicação346 a4fc2219:5/5smoke,3apps0.1.346,health/ready200; menu móvel/resize/histórico e filtro existente repetidos no Admin. Nenhum teste CFP remoto.

347 local: root1123 testes (1117pass/6skips drawtext), Admin93/93, backend470/470; builds Admin/backend aprovados. Bump347executado uma vez. Browserlocal390/1280 e testes de controles reais; publicação ainda pendente.

### Continuação348 — rascunho e Cancelar da comunidade

A342-01: sincronização indiscriminada do formulário após atualização independente do
avatar pode descartar campos dirty. A348-01: Cancelar apenas chama onDone, que é noop
na aba Dados; reproduzido no Admin346 com rascunho exclusivo da comunidade de auditoria,
sem Salvar. Reload confirmou o nome persistido original. Reusar RHF/controllers existentes,
sem nova fundação, mudanças em upload/callers/limites, env, pacote ou migration.

- [x] Refetch da mesma identidade mantém dirty (inclusive vazio) e atualiza campos limpos.
- [x] Cancelar descarta rascunho/erros para os últimos dados persistidos, mesmo sem navegar.
- [ ] Salvar aplica o retorno normalizado, limpa dirty e mantém mensagens/callbacks; falha preserva edição.
- [x] Outra comunidade não herda rascunho; refetch/save não restaura valores já confirmados.
- [x] Estado RHF real, Browser local e publicado, Admin check/build e smoke registrados.

A interface não possui revisão remota; não prometer controle de concorrência entre dois
administradores. Não manipular dados de terceiros nem redefinir upload para demonstrar o bug.

Adendo prévio348: durante Salvar, os campos ainda editáveis permitiriam digitação posterior
ser descartada pelo reset da resposta. Reusar disabled dos três controllers e bloqueio de
Cancelar durante submit, sem desregistrar valores RHF; falha mantém draft e libera controles.
Upload de avatar independente não deve bloquear esses campos por si só.

347 publicação e938f7a1: smoke5/5 às21:21:57UTC, trêsapps347; backendhealth/ready200. Reteste profissional/publicações autenticado e mobile nativo375×812 sem Salvar, nomes/expandido e paginação preservados. Não certifica leitor de tela físico ou Safari.

348 local aprovado: root1138testes (1132pass/6skips drawtext),Admin108/108,buildAdmin
aprovado. Submissão RHF passa a ser criada no evento, não no render: refs são lidas
apenas em efeitos/handlers, sem desativar regra React. Reteste local da fonte final
conserva dirty/refetch e Cancelar limpa estado. Salvar publicado/upload ainda pendentes.
Sem env, migração ou pacote; cinco manifests348. Não repetir o bump neste commit.

### Continuação349 — coerência de cor do gráfico de tráfego

A342-07: geometria remove categorias sem contagem, mas gráfico escolhe cores pelo índice
filtrado e legenda pelo índice original. Reusar padrão de paciente/psicólogo: cor atribuída
a cada item antes da geometria, usada tanto no arco como na legenda. Não alterar
contagens, percentuais, ordem, filtro, geometria, API, env, pacote ou banco.

- [x] Cores de arco e legenda coincidem com zeros no início/meio e ciclo da paleta.
- [x] Total/ordem/descrições/estado vazio mantidos; entradas não são alteradas.
- [x] Componente real em SSR, Browser local/publicado, check/build e smoke registrados.

Sem redesenho; evidência de fonte não implica incidente financeiro ou erro de contagem.

348 publicada c0eee4a6: smoke5/5; Browser confirmou Salvar normalizado, bloqueio pending,
Cancelar com defaults recentes e limpeza de validação. Nome QA restaurado e conferido
após reload. Falha de rede e upload de avatar não foram executados; não marcar como E2E.
349: baseline3pass/3fail e final6/6; Browser local991×964, sem comprovação de viewport390.

349: check global aprovado com1144testes (1138pass/6skips drawtext);Admin114/114.
BuildAdmin aprovado; source-safety/ESLint/Biome/TypeScript preservados. Um único bump349
sincronizou cinco manifests. Sem env/migração/pacote; publicação aguardando commit/push.


349 publicada47da3541: cinco GETs públicos aprovados22:18:11UTC, backend/frontend/Admin349,
health/ready200. Cadastros por perfil conferido novamente com0pacientes/4psicólogos:
arco verde coincide com legenda. Browser nativo375×812 e1265×889; não equivale a Safari
ou aparelho físico. Não houve alteração de registros. Serviço privado de vídeo não consultado.

### Continuação350 — cliques de cada formato de conteúdo

A342-06: badge de Posts soma total de Posts com Respostas, embora contrato e cartões
sejam separados. Usar somente distribution.posts.total_whatsapp_clicks, preservando
fallback0, singular/plural, total e itens dos dois grupos, período e estado Atualizando.
Referência visual: proto Admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png e cartões
atuais, sem redesenho. Builder indisponível. Sem env, pacote, migration ou alteração de API.
Rollback independente do Admin; nenhuma gravação ou recálculo histórico.

- [x] Badge de Posts não inclui Respostas; zero/campo legado ausente continuam seguros.
- [x] Testes executam JSX/formatadores reais, incluindo SSR e estado de atualização.
- [x] Browser local, check/build e reteste publicado registrados, sem confundir teste com integração.

350 local:8/8regressões (baseline4pass/4fail),1152testesglobais/1146pass/6skipsdrawtext,
Admin122/122 e build aprovado. Browser991×964/375×812; sem mutação remota. Publicação pendente.


### Continuação351 — idioma dos avisos acessíveis

A349-02: Sonner expõe região Notifications e botão Close toast em inglês. Configurar
containerAriaLabel e toastOptions.closeButtonAriaLabel nos layouts próprios dos dois apps,
sem novo wrapper, dependência, ícone ou alteração de posição/duração/atalho/política de fechar.
Referência: toast real Admin e componentes existentes; sem redesenho ou nova tela.
Sem env/API/migration; rollout e rollback Next independentes, sem dados persistentes.

- [x] Região e botão de fechar têm nome PT-BR no componente real.
- [x] Posição, richColors, closeButton de cada app e duração/atalho padrão preservados.
- [x] Checks/builds/Browser local e publicação verificados com limites explícitos.


350 publicada b230217e:smoke5/5,3apps350,health/ready200. ContaQA1post/2respostas,0cliques:
reteste preservou contagens/layout; caso nãozero validado somente no componente real local.
351:3/3testesporapp,1158globais(1152pass/6skips),buildsNext aprovados. BrowserlocalAdmin991×964
com teclado,front390×844 com clique. Sem promessa de teste físico/Safari. Deploy pendente.


351 publicada7bb9f140:5/5GETspúblicos;3apps351,health/ready200. Região frontend e aviso
real Admin emPT-BR, sem alteração nos campos da comunidadeQA. Fechamento permanece prova
local. Consulta de advisories11/09:cincoescopos sem vulnerabilidades conhecidas.
Registro352 somente documental/versões. TASK178 segue InProgress: achados ainda abertos,
requisitos legais/profissionais/integrações e dispositivos reais não certificados.


### Continuação353 — remover o próprio seguimento indisponível

C16: o requisito de publicação é aplicado também ao DELETE, impedindo desfazer a relação
própria após despublicação/inativação. Aplicar esse requisito somente ao follow; manter
papel paciente, autoria pela sessão, transação serializável e DELETE idempotente existente.
Não liberar leitura de perfil privado/listagem nem modificar publicação, aprovação ou
relação de terceiros. Sem env runtime, schema/migration/package; rollback backend isolado.

- [x] Follow continua exigindo profissional publicado; unfollow só altera relação do ator.
- [x] Despublicação/inativação/remoção lógica e repetição/concorrência testadas em PG local real.
- [x] Backend check/build aprovados sem manipulação de perfis reais.
- [ ] Smoke publicado da353 confirmado.

353: dez cenários PG aprovados (11pass incluindo contêiner). Check global1158,1152pass/6skips
drawtext, buildbackend aprovado. Laboratório próprio removido após limpeza validada; sem
alteração de banco preexistente. Um bump353; publicação pendente.
