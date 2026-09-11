# Auditoria Lectum — acompanhamento

**Em andamento. Não é uma liberação para produção.**

## Correções validadas localmente

1. Atualizadas bibliotecas com alertas de segurança no frontend, Admin e backend.
2. Reforçada a recusa de campos de upload malformados, antes de consumir memória excessiva.
3. Preservado o limite exato dos arquivos após a atualização da biblioteca de uploads.
4. Ajustada a navegação interna para cadastro/login ao atualizar o Next, sem recarregar toda a página.
5. Campos obrigatórios e inválidos passaram a ter mensagens compreensíveis, sem `string`/`undefined`.
6. Corrigidos acentos perdidos nas mensagens de sugestões de comunidades.
7. Retiradas referências técnicas das mensagens de sessão, SMS e sugestões.
8. Falha de verificação profissional não atribui mais indisponibilidade ao Conselho sem evidência.
9. Corrigido texto de campos alternativos que mostrava um marcador de tradução quebrado.
10. Campos com tamanho fixo informam a quantidade exata, sem sugerir apenas mínimo/máximo.
11. Corrigido o build do backend no servidor: traduções faltavam durante a compilação.
12. Botão de mostrar/ocultar senha acessível por teclado, com foco visível e respeito ao campo desabilitado.
13. Rótulos de campos separados dos botões, descrições e erros para não confundir leitores de tela.
14. Apagar um dígito do código de confirmação não desloca mais os números seguintes.
15. Confirmação de e-mail descarta o estado antigo da navegação, que podia devolver a pessoa à verificação.
16. Opções de seleção respondem a Enter/Espaço, não apenas ao pressionar o mouse.
17. Escape fecha a lista e devolve o foco ao campo, preservando a escolha.
18. Falha ao validar uma sessão não é mais confundida com navegação de visitante.
19. Erros padrão de validação em inglês são substituídos por orientação segura em português.
20. Aviso de conexão Google não expõe mais configuração interna da integração.
21. Novas senhas longas passam a considerar todos os caracteres, inclusive acentos e o final da senha.
22. Publicações anônimas não entregam mais o identificador interno do autor a outros leitores.
23. Comentários do autor anônimo continuam anônimos também na lista de itens salvos.
24. Apelidos anônimos usam uma regra centralizada, sem cálculo público baseado no usuário.

Correções 1–11 publicadas em `0.1.311` (`fa6a6dce`). **Smoke de 10/09, 22:50 UTC:**
backend, frontend e Admin confirmados nessa versão; 16 verificações HTTP passaram, incluindo
`/health`, `/ready`, mensagens PT-BR, imagens e bloqueio de rotas privadas. Video privado não
consultado remotamente. Nenhum reset, limpeza de dados ou cobrança foi feito.

Correções 12–15 enviadas em `389b72c3`, versão `0.1.312`. Senha e código validados no Browser local e por 10
regressões. O novo ciclo completo de cadastro/confirmação em homolog ainda precisa ser repetido
após o deploy; teste isolado de controller não equivale a confirmação real por e-mail.

### Pendência impeditiva para promoção: documentos legais

- Cadastro exige aceite, mas não oferece links para ler os documentos.
- TASK-41 e ADR-0440 já registravam o bloqueio; as minutas de `_product/legal` não estão aprovadas.
- Versões de aceite nos cadastros ainda dizem `pending-legal-copy`.
- É necessário aprovar os textos, responsável/controlador, contatos, idade mínima e política
  comercial com revisão jurídica. Não publicar placeholders nem tratar esta auditoria técnica
  como parecer jurídico. Não existe edição jurídica pelo Admin implementada nesta task.

## Cobertura real até aqui

- Base: `70d6b726` / versão `0.1.309`, branch `homolog`.
- **3.121 arquivos versionados inventariados**. Isso não significa que todos já foram revisados.
- [Inventário por arquivo](AUDITORIA-2026-09-10-INVENTARIO.tsv): hash do Git, tamanho,
  classificação e estado de leitura na base. Arquivos alterados/criados depois entram no diff da task.
- [Entradas de rotas](AUDITORIA-2026-09-10-ROTAS.tsv): 449 entradas estáticas; caminhos de Express
  ainda precisam ser compostos com seus mounts e routers filhos. Não é lista certificada de endpoints.
- Baseline e check final aprovados: frontend 117, backend 292, Admin 35 e video 32 testes
  (476 testes, sem falhas ou skips) em `0.1.310`. Complemento `0.1.311`: 477 testes
  (backend 293) e quatro builds aprovados; build Docker completo Linux amd64 aprovado. Mais 13 testes executados na imagem final,
  sem rede externa, volume publicado ou conexão de banco.
- `pnpm check:dependencies`: zero avisos conhecidos nos cinco escopos.
- Dependências de produção: baseline com 8 ocorrências no backend e 4 em cada app Next;
  após atualização, zero avisos conhecidos nos cinco escopos. Não demonstra ausência de todas as falhas.
- Sete regressões do validador/catálogo passaram, incluindo um POST HTTP com Express e validador reais.
- Smoke HTTP local das builds `0.1.310`: login/erro e imagens PNG responderam 200; rotas privadas
  redirecionaram para login com 307; `/version` de frontend/Admin respondeu 200, sem cache e noindex.
  Isso não valida cliques, viewport, foco ou um navegador real.
- Teste HTTP local com parser real: arquivo no limite aceito, acima recusado, campos extras,
  índice de array excessivo e estrutura profunda recusados. Sem R2 ou provider simulado.
- Homologação: `/health`, `/ready` e `/ping` responderam 200 em `0.1.309`; três rotas privadas
  recusaram acesso anônimo com 401; rota inexistente respondeu 404 sem stack.
- Login vazio de usuário/Admin retornou 400 com termos técnicos nos campos: achado confirmado,
  corrigido e coberto por teste HTTP do validador real; smoke `0.1.311` confirmou as mensagens novas.
- Requisições Python receberam bloqueio 1010 na borda; a mesma verificação com curl chegou ao app.
  Bloqueio de borda não foi confundido com autorização do backend.

## Mapa de execução (a completar com evidência por fluxo)

| Fluxo | Superfícies | Evidência atual | Falta validar |
| --- | --- | --- | --- |
| Cadastro/login/recuperação | Frontend, Admin, API, e-mail/Google | Cadastro paciente próprio, e-mail confirmado, negativos, teclado e OTP; loop de navegação reproduzido | Repetir confirmação após patch, recuperação, Google, expiração e troca de identidade |
| Paciente/perfil/favoritos | Frontend e API privada | Perfil próprio e edição abriram após navegação completa | Permissões entre duas contas, salvar formulários e upload |
| Psicólogo/CRP/onboarding | Frontend, Admin, API, CFP/WhatsApp | Inventário estático | Conta dedicada, aprovação e falhas externas |
| Descoberta/perfis públicos | Frontend e API de leitura | Inventário estático | Anônimo vs dono, mobile e acessibilidade |
| Comunidades/posts/respostas | Frontend, Admin, API | Leitura inicial dos routers | IDOR, moderação, conteúdo anônimo, paginação, estados |
| Vídeo/upload/playback | Frontend, API, R2/Stream | Limites locais e parser testados | Upload/playback real, URLs assinadas, interrupção, Safari |
| Processamento de vídeo | API interna, fila, worker, volume | Inventário e baseline local | Smoke privado no servidor, egress e isolamento atuais |
| Assinaturas/pagamentos | Frontend, Admin, backend, gateway | Inventário estático | Contas/cartões exclusivamente de teste, webhooks/idempotência |
| Conta/privacidade/exclusão | Frontend, Admin, backend | Formulário próprio vazio, foco/erro PT-BR; leitura de serviço/repositório | Revogação/exportação e exclusão somente da conta de auditoria |
| Notificações/analytics | Frontend, Admin, API/jobs/socket | Inventário estático | Preferências e acessos; sem campanha para terceiros |
| Administração/catálogos/SEO | Admin, API administrativa | Dashboard autenticado desktop/mobile; menu fecha com Escape e devolve foco | Permissões de ações, validação de formulários, exportação |
| Infraestrutura/deploy | Quatro apps, manifests, Docker | Atualização focal de dependências | Builds/smoke novos, CSP, cache e headers por superfície |

## Próximos achados para reprodução

- Mapeamento Zod atualizado para a versão 4, preservando mensagens de domínio e sem ecoar valores.
  Conferir ainda todo o restante das mensagens client-side e validações de formulários no navegador.
- Verificar imposição server-side de confirmação de e-mail e troca obrigatória de senha;
  leitura inicial dos guards não mostrou essas condições, mas o cadastro completo ainda não foi
  exercitado. Também rastrear vínculo Google com conta manual pré-existente. Não é exploração confirmada.
- Autenticação opcional corrigida: falha real de conexão local ao banco agora retorna 503;
  visitante sem credencial e token inválido continuam sem autenticação nas rotas públicas.
  A captura da segunda consulta foi revisada em código; interrupção entre consultas ainda não
  foi exercitada com sessão persistida real. Não derrubar o banco publicado para reproduzir.
- Modais e formulários ainda precisam de teclado/foco/leitor de tela e medidas mobile reais.
- Worker possui egresso para render social no compose atual; o teste histórico de isolamento total
  não descreve essa versão. Auditar restrições de origem, redirects, DNS e mídia remota.

## Dependências externas

- Browser conectado; Admin autenticado e conta paciente dedicada criada pelo cadastro normal.
- Aceite autorizado apenas para auditoria; confirmação recebida por e-mail e concluída. Credenciais
  não entram no relatório, logs ou repositório. Conta profissional e segunda identidade pendentes.
- Safari/iPhone e Android reais não validados. Viewport pequeno em Chrome não equivale a Safari.
- Builder MCP passou a responder, mas só listou MUI, não o design Lectum, e não expõe o Quick Copy
  ativo por esta interface. Fallback: `proto/Login.jpg` e `proto/Verificação de E-mail com Código.jpg`.
  Browser local em 390px e desktop validou o patch; sem redesenhar as telas ou adotar MUI.

Detalhes técnicos e fontes: [ADR-0496](../adrs/0496-auditoria-pre-producao-e-dependencias.md).

## Evidências de interação — complemento 0.1.312

- Dashboard Admin: desktop e 375px; menu abre, fecha por Escape e restaura foco.
- Login e cadastro paciente: erros vazios em PT-BR; foco no primeiro campo inválido.
- Antes: Tab saltava o botão de senha; nome acessível do input incluía “Mostrar senha”.
  Depois: Tab/Enter alternam a visibilidade; rótulo contém só o nome do campo.
- Antes: `123456`, apagar terceiro dígito, resultado `12456_`. Depois: `12_456`; repor
  dígito não altera os demais. Colagem, zero inicial, limpeza e bloqueio de envio incompleto passaram.
- OTP: interação local com controller/RHF/schema reais em página temporária sem API, removida
  antes do build. Nenhum endpoint simulado e nenhuma verificação inventada.
- Confirmação real em homolog: conta confirmada, mas links retornavam à tela de confirmação;
  navegação completa ao mesmo destino abriu o perfil. Correção opt-in apenas nessa transição,
  mantendo guard e destino interno normalizado. Repetição completa pós-deploy ainda pendente.
- Capturas locais em `/tmp/lectum-audit-178-ui/` (01–10); antes/depois 07, 09 e 10 conferidos
  novamente a partir dos arquivos salvos. Capturas e credenciais não serão versionadas.
- A árvore de acessibilidade do diretório anunciou “Unable to play media” em players; podem
  estar inativos/fora da tela. Reprodução e visibilidade ainda precisam ser cruzadas antes de
  considerar falha real. Não desativar assinaturas/permissões para investigar.
- Select customizado: Enter e Escape sem efeito reproduzidos em homolog. Corrigidos em 0.1.313;
  testes de teclado passaram localmente nas três variantes customizadas. Setas, leitor de tela e
  toque em iOS/Android reais continuam pendentes; não é certificação completa WAI-ARIA.

**Validação local 0.1.312:** check agregado aprovado (487 testes), build do frontend aprovado,
cinco manifests sincronizados. Sem a rota temporária no artefato. Publicação/smoke a acompanhar.

## Continuação — seletores e publicação

- 0.1.312: frontend/Admin publicados; backend alcançou a mesma versão às 23:56 UTC. Houve
  três respostas 502 durante a substituição do backend; smoke final deve ser repetido após ready.
  No Browser, conta já confirmada retornou da verificação ao perfil, sem o loop anterior.
- 0.1.313: Enter/Espaço selecionam, Escape fecha e restaura foco. Busca do estado e dependência
  da cidade preservadas; escolha testada somente em formulário local sem envio, com hooks reais.
- 12 regressões dos controllers passaram; `pnpm check` passou com 489 testes; build frontend
  aprovado. Harness e seus tipos gerados removidos antes do build; sem mudança de banco/env.
- Dimensões verificadas nos arquivos: Admin/cadastro/OTP antes em 375×812; login local e
  controllers depois em 390×844; desktop 1280×720 e 1320×953. Não são dispositivos móveis reais.
- Capturas 11/12 registram o select antes/depois; 12 inspecionada do arquivo salvo.

## Continuação — autenticação e mensagens 0.1.314

- Smoke final 0.1.312: 16/16 aprovados em 10/09 às 23:57 UTC, após recuperação do backend.
- Smoke 0.1.313: 16/16 aprovados em 11/09 às 00:07 UTC; backend/frontend/Admin na mesma versão.
- Browser homolog 0.1.313: Enter selecionou; Escape fechou/restaurou foco no perfil real. Saída
  sem salvar os valores de teste. Captura 13; conta não recebeu alterações demográficas.
- Tela pública de erro reproduziu `Invalid field` em homolog. O filtro existente passa a cobrir
  erros padrão de validação; mensagens de domínio PT-BR continuam preservadas. Captura 14.
- Autenticação opcional: Express, Passport/JWT e Prisma reais em processo local isolado, sem .env
  do workspace. Banco aponta para socket inexistente temporário, sem acessar banco real ou provider.
  Antes: credencial assinada com consulta impossível seguia como visitante (204 no teste do guard).
  Depois: 503 seguro. Visitante/token inválido preservados; guard privado também respondeu 503.
- Catch dentro do callback impede que uma rejeição de validação de sessão fique sem tratamento;
  falha operacional síncrona também não segue como visitante. Sem mudar regras público/privado.
- Formulário da conta vazio mostrou orientação PT-BR e foco em novo e-mail. Nenhuma senha,
  e-mail, vínculo Google ou exclusão foi alterado pelo teste.
- Leitura integral das duas minutas confirmou placeholders e checklist de aprovação pendentes.
- Check agregado aprovado: 495 testes (132 frontend, 296 backend, 35 Admin, 32 video), sem skips.
  Builds backend/frontend aprovados. Página de erro real na build local substituiu o inglês por
  orientação PT-BR; desktop 1280×720 e mobile 390×844 sem overflow. Capturas 15/16 conferidas do disco.
  Não há API ou provider simulado. Publicação/smoke desta versão ainda pendentes deste registro.

Revisão de identidade ainda pendente: confirmar comportamento de contas manuais não verificadas
quando o mesmo e-mail entra por Google e imposição de confirmação/troca obrigatória no servidor.
Leitura de código não equivale à exploração confirmada nem autoriza alterar vínculo de contas reais.

## Continuação — senhas e leitura de permissões 0.1.315

- 0.1.314: backend/frontend/Admin confirmados; 16/16 smokes aprovados em 11/09, 00:23 UTC.
  Browser publicado confirmou a mensagem PT-BR na página de erro. Video privado não consultado.
- Admin: formulário vazio de nova comunidade recusado com mensagem PT-BR e foco no nome;
  saída sem criar comunidade. Captura 17, 375×812, conferida do arquivo salvo.
- Reproduzido localmente: com bcrypt, duas senhas diferentes depois do byte 72 eram aceitas
  como iguais. Agora novas senhas maiores usam Argon2id já instalado. Limite de 128 caracteres,
  espaços e acentos preservados; nenhuma conta foi alterada para este teste.
- Seis testes reais de hash/comparação passaram com configuração bcrypt, argon e parâmetros
  publicados; antes, os casos de sufixo ASCII e UTF-8 falhavam. Não usa hash/provider simulado.
- **Limitação importante:** hashes bcrypt antigos não permitem recuperar o trecho que foi
  descartado. A correção protege novos cadastros/trocas de senha; avaliar redefinição controlada
  das contas legadas antes da produção. Não há reset automático nem regravação em login.
- Routers de comunidades/posts e guard Admin lidos; criação/edição/exclusão exigem sessão,
  com verificação de dono nos repositórios examinados. Isso não conclui testes entre identidades.
- Revisão de confirmação de e-mail: formato exato, janela temporal e obrigatoriedade nas demais
  ações ainda em análise; nenhuma regra de acesso público foi modificada nesta correção.

Sem migration, package ou env nova. Argon2 em ambiente publicado já usa 128 MiB por operação;
observar memória/concorrência ao testar cadastros reais. Medição local não certifica capacidade
do servidor. Build, check agregado e publicação de 0.1.315 serão registrados após execução.

Validação local 0.1.315: 499 testes passaram (132 frontend, 300 backend, 35 Admin, 32 video),
build backend e imagem Docker Linux amd64 aprovados. Os seis testes de hash também passaram no
artefato final, não root, sem rede, somente leitura, limitado a 768 MiB/2 CPUs. Nenhum entrypoint,
migration ou banco foi iniciado. Publicação/smoke pendentes. Sessão Admin solicitou novo login;
usuário reautenticou e a lista de comunidades abriu. Paciente permaneceu conectado.

## Continuação — anonimato 0.1.316

- Smoke de 0.1.315: 16/16 em 11/09, 00:39 UTC; backend/frontend/Admin na mesma versão.
- Reproduzida exposição do identificador de autoria anônima com a imagem anterior e PostgreSQL
  temporário real. Não foi necessário consultar identidades de usuários publicados.
- O dono conserva a edição; outro leitor recebe um pseudônimo. Identificação administrativa
  depende do guard autenticado, não de um campo enviado pelo cliente.
- Listas de comentários próprios/salvos agora respeitam o anonimato herdado da publicação.
- Onze verificações HTTP com banco, JWT, login, guards e repositórios reais passaram: visitante,
  leitor, dono, administrador, feed, comentários, salvos, edição e recusa de exclusão alheia.
  O banco foi criado em rede Docker interna, sem portas públicas/credenciais reais, e removido
  ao final. Não representa teste de OAuth, notificações enviadas ou cadastro por e-mail.
- O número do apelido anônimo muda com este deploy e em futuras rotações da chave JWT. Continua
  estável por usuário com a mesma chave. Não muda a autoria armazenada nem apaga conteúdo.
- O novo cálculo reaproveita segredo existente; sem chave, a apresentação fica genérica.
  Nenhuma env nova, migration, dependência ou reset é necessário.

Durante o teste, um validador legado recusou endereço com sufixo longo; a mesma expressão também
recusa aliases com `+`. Achado separado para correção seguinte, ainda não corrigido em 0.1.316.
Cobertura da auditoria permanece parcial; não liberar produção com base nesses onze cenários.

Validação 0.1.316: `pnpm check` aprovado, 507 testes (132/308/35/32), além dos seis testes
da política de versão. Build backend, imagem Docker e onze cenários de integração aprovados.
Inventário: 146 arquivos com leitura inicial, 11 parciais e 2.964 ainda não revisados na base.
