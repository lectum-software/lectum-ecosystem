# Auditoria completa do Lectum — resumo das correções

Revisão realizada em **08/08/2026**, depois da publicação do produto em homologação e produção.
Este é o resumo simples. As decisões técnicas estão no
[ADR-0439](../adrs/0439-hardening-residual-auditoria-publicada.md).

## Escopo conferido

- Todos os arquivos próprios do monorepo foram lidos, incluindo backend, frontend, Admin, raiz,
  scripts, configurações, documentação, tasks, ADRs e arquivos criados durante as correções.
- O inventário final confirmou **2.727 arquivos próprios**, **122 arquivos visuais/documentos** e
  nenhum link interno quebrado, marca de texto corrompida ou arquivo desconhecido.
- Frontend, backend e Admin foram avaliados como aplicações separadas, como ocorre na publicação.
- Arquivos de ambiente foram conferidos sem revelar seus valores.
- Imagens, vídeos e PDFs foram validados com ferramentas adequadas ao tipo de arquivo.
- Dependências, caches e saídas geradas foram conferidos pelos checks próprios, sem serem tratados
  como código autoral.
- A pasta local `sample/` foi inventariada e lida, mas não foi usada como fonte de implementação.

## Itens corrigidos

1. O projeto passou a tratar homologação e produção como ambientes com dados reais.
2. Toda implementação deve começar na branch `homolog`.
3. O bloqueio local impede push acidental de `main`, tags, exclusões ou outra branch de deploy.
4. As instruções agora avisam que push em `homolog` publica automaticamente a homologação.
5. Frontend, backend e Admin continuam independentes para publicação e retorno de versão.
6. Reset, seed e limpeza de arquivos ficaram bloqueados fora de um ambiente local confirmado; um
   prefixo curto também não pode alcançar arquivos apenas por começar com o mesmo texto.
7. Mudanças futuras de banco devem preservar os dados existentes durante a publicação.
8. Variável obrigatória nova passou a exigir alerta claro antes do deploy.
9. Mudanças de API devem aceitar versões diferentes dos três aplicativos durante a atualização.
10. Mensagens públicas deixaram de mostrar erros internos do sistema.
11. Avisos de tela deixaram de repetir mensagens técnicas recebidas da API.
12. Logs identificados na revisão, inclusive falhas de atualização do banco no deploy, deixaram de
    registrar dados pessoais, tokens, credenciais e detalhes internos.
13. Falhas de serviços externos passaram a aparecer ao usuário como mensagens seguras.
14. Sessões de usuário passaram a usar um cookie que não pode ser lido pelo JavaScript da página e
    que nunca dura além do vencimento real da sessão.
15. Sessões do Admin receberam a mesma proteção e ficaram limitadas às rotas administrativas.
16. Clientes antigos continuam temporariamente compatíveis durante a troca do modelo de sessão.
17. O logout só aparece como concluído depois que a própria API confirma a saída; falha de conexão
    ou de revogação preserva a sessão para uma nova tentativa.
18. O logout também remove a inscrição de notificação do dispositivo de forma segura.
19. Sessões de medição são renovadas quando muda a identidade usada no mesmo navegador.
20. Rotas privadas e papéis de paciente, psicólogo e administrador ganharam conferência central.
21. A recuperação de senha não informa se um e-mail está ou não cadastrado.
22. Senhas, códigos temporários e confirmações deixaram de permanecer onde não são necessários.
23. O login Google ganhou proteção contra retorno falso e reutilização de código.
24. Redirecionamentos e o recurso “Visualizar como” passaram a aceitar somente destinos seguros.
    Essa sessão temporária agora abre corretamente, continua somente leitura e pode revogar a si
    própria ao sair.
25. Uploads passaram a conferir tipo, conteúdo, quantidade e tamanho dos arquivos.
26. Upload interrompido ganhou limpeza e limite de trabalho simultâneo.
27. A API deixou de criar armazenamento externo durante uma requisição comum.
28. Arquivos privados deixaram de ser servidos por uma rota pública genérica.
29. Imagens e vídeos remotos passaram a aceitar somente endereços confiáveis.
30. Requisições ganharam limites para reduzir abuso e consumo excessivo de memória.
31. O backend ganhou verificações de saúde e prontidão para publicações mais seguras.
32. O servidor passou a encerrar trabalhos com cuidado durante reinícios.
33. Chamadas externas ganharam tempo máximo e repetição somente quando faz sentido.
34. Campanhas e tarefas automáticas ficaram protegidas contra disparo indevido ou duplicado.
35. Falha de envio de e-mail deixou de ser tratada como sucesso.
36. Planilhas exportadas passaram a bloquear conteúdo perigoso e dados internos desnecessários.
37. Respostas de medição foram reduzidas aos dados realmente usados pelas telas.
38. Notificações do navegador passaram a aceitar somente serviços conhecidos e endereços válidos.
39. Inscrições de notificação inválidas ou vencidas passam por limpeza controlada.
40. Configuração inválida de notificação desliga apenas esse canal, sem derrubar o sistema.
41. Falha de armazenamento do navegador deixou de travar login, telas ou preferências.
42. Pedidos de instalação e notificação deixaram de disputar a tela ou reaparecer em excesso.
43. O player de vídeo ganhou limites e cancelamento correto ao trocar de conteúdo ou sair da tela.
44. O serviço offline passou a aceitar somente textos curtos e navegação interna segura.
45. Carregamento, erro, vazio e indisponibilidade passaram a terminar de forma clara e honesta.
46. Ações pendentes no Admin bloqueiam clique duplicado e fechamento acidental de diálogos.
47. Componentes e regras repetidos foram reunidos para reduzir divergências entre telas.
48. Arquivos muito grandes foram divididos sem quebrar os caminhos usados pelo restante do produto.
49. Checks automáticos passaram a bloquear ciclos, arquivos gigantes e padrões perigosos.
50. Texto corrompido, credencial versionada e diferença nos exemplos de ambiente ganharam checks.
51. O proxy local passou a aguardar o banco e a encaminhar somente rotas e cabeçalhos permitidos.
52. Permissões de execução acidentais foram removidas dos arquivos que não precisam delas.
53. ADRs duplicados foram renumerados e agora têm verificação automática de índice e título.
54. A ferramenta visual passou a usar versão fixa, e o inventário de imagens foi reconciliado.
55. A lista de tasks foi corrigida e a task das páginas legais ficou bloqueada até aprovação jurídica.
56. A documentação interativa da API ficou limitada ao próprio computador no desenvolvimento local
    e nunca é embarcada nem exposta em homologação ou produção.
57. O check de texto agora também encontra marcas invisíveis e caracteres de controle; o arquivo
    antigo de atualização do banco, já aplicado, foi preservado sem edição.
58. Produção, homologação e staging, inclusive seus nomes abreviados, usam a mesma política segura.
59. O logo do login administrativo voltou a ter contraste correto em celular e desktop.
60. A visualização administrativa agora se encerra sozinha no horário previsto, sem deixar aviso ou
    cookie obsoleto por vários dias.

## ALERTA DE DEPLOY — promoção bloqueada até validar homologação

- A branch atual deve continuar sendo `homolog`. **O push inicia deploy automático de homologação.**
- Esta revisão **não cria** variável obrigatória, dependência, coluna ou mudança na estrutura do banco.
- Mesmo sem variável nova, as configurações existentes precisam ser conferidas **antes do push**.
- Frontend, Admin e API precisam usar HTTPS externo e pertencer ao mesmo site, isto é, ao mesmo
  domínio-base. Em sites diferentes, os cookies de sessão podem não acompanhar as requisições.
- `WEB_URL` precisa listar exatamente as origens HTTPS do frontend e do Admin. A API deve liberar
  essas origens com envio de credenciais; não pode usar liberação genérica.
- Conferir, sem mostrar valores:
  - **API:** `WEB_URL`, `BASE`, `FRONTEND_URL`, `GOOGLE_OAUTH_BASE_URL`,
    `CALLBACK_URL_API_USER`, `CALLBACK_FAIL_URL_API_USER`, `RECOVERY_URL`,
    `MERCADO_PAGO_BACK_URL`, `IP_GEOLOCATION_ENDPOINT`, `VAPID_EMAIL`, `VAPID_PUBLIC_KEY` e
    `VAPID_PRIVATE_KEY`;
  - **Frontend:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS`,
    `NEXT_PUBLIC_LOGIN_URL`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_SITE_URL` e
    `NEXT_PUBLIC_WEB_URL`;
  - **Admin:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_FRONTEND_URL` e
    `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS`.
- Uma configuração inválida agora falha de forma segura: o recurso correspondente fica indisponível,
  sem tentar endereço local, origem aberta ou destino não aprovado.
- Mídias históricas podem apontar para hosts antigos. Antes de publicar, liberar apenas o host HTTPS
  aprovado ou fazer uma correção retomável dos registros; nunca apagar ou substituir em massa.
- Depois do deploy, testar com contas reais de homologação: login, recuperação da sessão,
  chamada de API protegida e logout, tanto no frontend quanto no Admin.
- Quando o backend for afetado, `/health` e `/ready` também devem responder corretamente.
- Qualquer falha nesses testes **bloqueia** o merge para `main`.
- Antes do merge revisado para produção, conferir a mesma configuração em produção, sem mostrar
  valores, e repetir os testes depois da publicação.
- O smoke publicado em homologação ainda não ocorreu nesta etapa; ele só poderá ser feito após o push.

## Validação local

- `pnpm check` e os checks individuais foram executados sem warning.
- Testes automatizados: **113 no backend, 19 no frontend e 11 no Admin**, todos aprovados.
- Os builds passaram: backend, **89 páginas** do frontend e **29 páginas** do Admin.
- A imagem final do backend foi construída e executada com usuário sem privilégio. Em banco local
  descartável, `/health` e `/ready` responderam `200`; documentação da API ficou `404` ao simular
  homologação, mesmo com as flags locais ligadas.
- Login e proteção de rotas anônimas foram verificados localmente em mobile e desktop, sem mocks nem
  credenciais. Fluxos autenticados permanecem reservados para homologação.
- A auditoria das dependências de produção foi repetida nas três aplicações e não encontrou
  vulnerabilidade conhecida.
- Nenhum reset, seed, exclusão em massa ou limpeza de bucket foi executado.
- Nenhuma estrutura ou atualização do banco foi alterada; por isso não houve comando de alteração.
- Nenhuma validação publicada foi declarada como concluída antes do deploy de homologação.

## Pendências conhecidas

- A TASK-41 aguarda textos, versões e dados aprovados pelo jurídico; placeholders não serão publicados.
- Login, recuperação de sessão, API protegida e logout ainda exigem QA autenticado em homologação.
- Hosts usados por mídias históricas precisam ser confirmados antes da promoção.
- O tema escuro/automático do Admin precisa de task própria, aprovação da dependência e ADR.
- O uso dos vídeos demonstrativos precisa de autorização do responsável antes de produção.
- O número público de WhatsApp do suporte CFP aguarda uma fonte operacional aprovada.
- Credencial antiga encontrada apenas em arquivo local ignorado deve ser revogada se ainda estiver ativa.
