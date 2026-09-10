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

Correções 1–9 enviadas em `1e10422a` (`0.1.310`). Frontend/Admin publicaram, mas o build
do backend falhou. Correções 10–11 compõem `0.1.311`; nova publicação pendente deste registro.

**Smoke de 10/09, 22:36 UTC:** frontend/Admin em `0.1.310`; páginas de login, redirecionamento
privado, imagens e versões passaram. Backend saudável (`/health` e `/ready` 200), mas ainda
em `0.1.309`: mensagens novas não apareceram. Deploy do backend ainda não confirmado;
log do Dokploy confirmou traduções ausentes na etapa de compilação. Leituras públicas de comunidades/psicólogos mantiveram 200.
Não há aprovação para produção. Video privado não foi consultado remotamente. Nenhum reset, limpeza de dados ou cobrança foi feito.

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
  corrigido localmente e coberto por teste HTTP do validador real; smoke pós-deploy pendente.
- Requisições Python receberam bloqueio 1010 na borda; a mesma verificação com curl chegou ao app.
  Bloqueio de borda não foi confundido com autorização do backend.

## Mapa de execução (a completar com evidência por fluxo)

| Fluxo | Superfícies | Evidência atual | Falta validar |
| --- | --- | --- | --- |
| Cadastro/login/recuperação | Frontend, Admin, API, e-mail/Google | Rotas e sessão em revisão; negativos HTTP | Cadastro próprio, OTP, expiração, troca de identidade |
| Paciente/perfil/favoritos | Frontend e API privada | Inventário estático | Permissões entre duas contas, formulários e upload |
| Psicólogo/CRP/onboarding | Frontend, Admin, API, CFP/WhatsApp | Inventário estático | Conta dedicada, aprovação e falhas externas |
| Descoberta/perfis públicos | Frontend e API de leitura | Inventário estático | Anônimo vs dono, mobile e acessibilidade |
| Comunidades/posts/respostas | Frontend, Admin, API | Leitura inicial dos routers | IDOR, moderação, conteúdo anônimo, paginação, estados |
| Vídeo/upload/playback | Frontend, API, R2/Stream | Limites locais e parser testados | Upload/playback real, URLs assinadas, interrupção, Safari |
| Processamento de vídeo | API interna, fila, worker, volume | Inventário e baseline local | Smoke privado no servidor, egress e isolamento atuais |
| Assinaturas/pagamentos | Frontend, Admin, backend, gateway | Inventário estático | Contas/cartões exclusivamente de teste, webhooks/idempotência |
| Conta/privacidade/exclusão | Frontend, Admin, backend | Inventário estático | Revogação/exportação e exclusão somente da conta de auditoria |
| Notificações/analytics | Frontend, Admin, API/jobs/socket | Inventário estático | Preferências e acessos; sem campanha para terceiros |
| Administração/catálogos/SEO | Admin, API administrativa | Anônimo recusado no dashboard | Permissões de ações, validação de formulários, exportação |
| Infraestrutura/deploy | Quatro apps, manifests, Docker | Atualização focal de dependências | Builds/smoke novos, CSP, cache e headers por superfície |

## Próximos achados para reprodução

- Mapeamento Zod atualizado para a versão 4, preservando mensagens de domínio e sem ecoar valores.
  Conferir ainda todo o restante das mensagens client-side e validações de formulários no navegador.
- Verificar imposição server-side de confirmação de e-mail e troca obrigatória de senha;
  leitura inicial dos guards não mostrou essas condições, mas o cadastro completo ainda não foi
  exercitado. Também rastrear vínculo Google com conta manual pré-existente. Não é exploração confirmada.
- Callback assíncrono de autenticação opcional não tem captura local de falhas; investigar rejeição
  de persistência depois de validar JWT, sem derrubar o banco publicado para reproduzir.
- Modais e formulários ainda precisam de teclado/foco/leitor de tela e medidas mobile reais.
- Worker possui egresso para render social no compose atual; o teste histórico de isolamento total
  não descreve essa versão. Auditar restrições de origem, redirects, DNS e mídia remota.

## Dependências externas

- Usuário informou Admin autenticado. Browser ainda não descoberto pela ferramenta (lista vazia).
- Aguardando endereço dedicado para verificar e-mail das contas que serão criadas pelo cadastro.
- Safari/iPhone e Android reais não validados. Viewport pequeno em Chrome não equivale a Safari.
- Builder indisponível como ferramenta; referência `proto/Login.jpg` (390px) conferida, sem mudança
  de layout. Comparação visual do app renderizado continua pendente do Browser.

Detalhes técnicos e fontes: [ADR-0496](../adrs/0496-auditoria-pre-producao-e-dependencias.md).
