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

## Complemento — seleção por teclado (0.1.313)

Enter/Espaço não selecionavam porque as opções disparavam somente em mousedown. Usar click nativo
mantém ativação por teclado e mouse; mousedown apenas preserva foco até o clique. Escape é tratado
somente enquanto a lista está aberta e o foco pertence ao componente; devolver foco antes de fechar
impede que o onFocus da variante de busca reabra a lista. Refs RHF adicionadas aos dois triggers.
Não trocar biblioteca, controles nativos, contrato de formulário, permissões ou dados.

Fonte consultada: [WAI-ARIA APG / Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
Correção focal, não declaração de conformidade completa: navegação por setas/aria-activedescendant,
leitores de tela e toque em dispositivos reais ainda precisam de revisão na TASK-178.

Browser local testou o formulário de perfil real em harness temporário sem API; Enter/Espaço,
Escape/restauração de foco, busca e campo dependente passaram. Duas regressões adicionais cobrem
markup e wiring; não substituem interação. Check 489 testes e build frontend aprovados.
Sem migration/env nova. Versão sincronizada 0.1.313, publicação/smoke pendentes neste registro.

## Complemento — sessão opcional e mensagens (0.1.314)

A estratégia JWT já distinguia credencial inválida de indisponibilidade (503), mas o middleware
opcional ignorava esse erro e seguia como visitante. Agora propaga 503 seguro, sem mudar o acesso
anônimo quando não há sessão válida. Captura dentro do callback é necessária porque Passport não
aguarda sua Promise; catch externo não captura rejeição de `passToken`. Logs usam classificação
literal e sanitizador existente. Não se adiciona regra nova de autorização por papel/objeto.

Regressão usa subprocesso com env mínima, diretório sem .env, catálogos copiados e socket PostgreSQL
inexistente local: Express/Passport, assinatura JWT e Prisma são reais. Não há mock de provider,
seed ou acesso a credenciais publicadas. Antes devolvia 204 no endpoint de teste; depois 503,
preservando 204 para visitante/credencial inválida. Isso cobre indisponibilidade na primeira
consulta; a segunda consulta foi protegida por análise de controle, não por queda E2E do banco.

Erros comuns `Invalid field`, `Invalid input`, `Too small` e semelhantes passavam no sanitizador.
Ampliar o filtro já existente, sem substituir mensagens úteis em PT-BR por fallback genérico.
Tela `/auth/error` reproduziu o achado no Browser de homolog. Aviso da conta que explicava OAuth
não configurado passa a orientar uma nova tentativa sem detalhar infraestrutura.

Smoke final 0.1.312 (23:57 UTC de 10/09) e 0.1.313 (00:07 UTC de 11/09): 16/16 aprovados.
Browser publicado confirmou seleção/foco; valores do formulário não foram salvos. Sem alteração de
banco, env, provider, pacotes ou contrato entre versões. Novo bump único para 0.1.314.

Validação final local: 495 testes aprovados, Prisma/TypeScript/Biome e builds backend/frontend
aprovados. Browser na build final confirmou `/auth/error?error=Invalid%20field` em desktop/mobile,
sem API simulada; screenshots 14–16 evidenciam antes/depois. Separados os testes de mensagens em
`frontend/src/api/errors.test.mjs` para não aumentar arquivo de testes legado além de 700 linhas.
Teste isolado não herda PATH ou outra env do host e não exige variáveis novas na aplicação.

## Complemento — senhas longas (0.1.315)

O produto aceita 10–128 caracteres (ADR-0176), mas o modo padrão bcrypt descarta tudo depois de
72 bytes UTF-8. A reprodução com bcrypt real aceitou outro sufixo tanto em ASCII como em texto
acentuado. Não basta limitar por caracteres nem alterar a UI; o hash deve preservar o contrato.

Decisão: manter a escolha existente até 72 bytes e usar o Argon2id já instalado quando o valor
exceder esse limite, mesmo com configuração bcrypt/vazia. `CRYPTO_ALGORITHM=argon` continua
selecionando Argon2 em todos os novos hashes. Não criar pré-hash caseiro, novos parâmetros,
dependências ou migração. Todos os pontos de gravação de senha encontrados usam este wrapper;
o uso direto de bcrypt para tokens de recuperação não faz parte desta alteração.

O comparador atual e versões anteriores já identificam ambos os formatos pelo hash, permitindo
rollout/rollback sem interromper contas antigas. Não regravar automaticamente na autenticação:
um bcrypt antigo não comprova o sufixo digitado nem informa o comprimento original. Senhas legadas
continuam com a limitação e exigem decisão de redefinição controlada antes de certificar segurança
desse conjunto. Não ler/expor hashes de contas publicadas nem resetar usuários da auditoria.

Mantidos os parâmetros Argon2 existentes, inclusive 128 MiB por operação em ambiente publicado;
o custo adicional atinge senhas novas longas no modo bcrypt. Testes locais verificam correção,
não capacidade/concorrência do servidor. Nenhuma env nova é necessária. Exemplo de env documenta
o comportamento; API e frontend não mudam de contrato.

Fontes primárias: [limite documentado do bcrypt](https://github.com/kelektiv/node.bcrypt.js/)
e [orientação OWASP para armazenamento de senhas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Seis regressões com hashes reais passaram nos modos bcrypt/argon e com NODE_ENV=homolog.
Smoke 0.1.314 confirmado 16/16 em 11/09, 00:23 UTC; nova publicação ainda pendente.

Validação final: `pnpm check` aprovado, 499 testes; build backend e Docker Linux amd64 aprovados.
Seis testes reais de hash passaram dentro da imagem final não root, rede bloqueada, filesystem
somente leitura, 768 MiB e 2 CPUs. Sem boot/migration/banco. Bump único sincronizado 0.1.315.

## Complemento — autoria anônima (0.1.316)

Os mappers mascaravam nome/avatar, mas conservavam `author.id`; quatro helpers calculavam o
apelido com hash público previsível do mesmo ID. A lista de respostas salvas também desativava
expressamente o anonimato, mesmo para o autor do post anônimo. Reprodução feita em banco isolado.

Preservar ADR-0167 (apelido estável por usuário), autoria persistida e compatibilidade de edição
com frontend anterior. O sanitizador existente de resposta aplica a identidade anônima quando
o objeto `author`/`actor` paciente ou sua publicação indica anonimato. Recebe somente contexto
autenticado do servidor: o dono conserva seu próprio ID; outros leitores recebem pseudônimo;
guard Admin pode preservar identidade. Nenhuma opção de bypass vem do request body/query.
Papéis profissionais e publicações identificadas não mudam. Rotas privadas usam no-store existente.

Centralizar em `anonymous-author.ts`: HMAC-SHA256 com chave JWT existente e domínio próprio,
identificador opaco de 128 bits e número visual de quatro dígitos. Este número não é identificador
único nem credencial; pode coincidir. Não criar env obrigatória nem hash público como fallback:
sem chave, apresentação genérica. Trade-off explícito: apelido muda neste rollout e ao rotacionar
a chave JWT. Não atualizar registros nem expor a chave. Rollback reabre o problema de privacidade.

Oito regressões novas cobrem resposta HTTP, estabilidade/separação, ausência/rotação de chave,
dono, outro leitor, admin e papéis preservados. Imagem anterior falha no cenário de ocultação;
imagem nova passa onze cenários com PostgreSQL 17, login/JWT/Passport/guards/repositórios reais.
Fixtures são temporárias em banco criado só para o teste, rede interna e nenhum volume publicado.
Migrações existentes aplicadas somente nesse banco; todos os recursos temporários removidos.
Não há mocks de autenticação/banco, chamadas de e-mail/OAuth ou alegação de pentest completo.

Smoke 0.1.315: 16/16, backend/frontend/Admin confirmados às 00:39 UTC de 11/09.
Build backend e imagem Linux amd64 0.1.316 aprovados; publicação ainda pendente neste registro.

## Complemento — formato de e-mail (0.1.317)

A expressão do pacote de validators impunha TLD de 2–6 letras e excluía `+`/apóstrofo, divergindo
de `z.email` usado nos formulários atuais. Testes HTTP também demonstraram aceitação indevida de
ponto inicial ou duplo. Centralizar o formato no Zod já instalado, sem outro regex ou package.
Manter o wrapper declarativo e seu tratamento de vazio/optional/nullable; minúsculas continuam
sendo a normalização existente. Recusar espaços periféricos/controles, sem trim silencioso,
remoção de sufixos ou união de contas. Mensagem usa catálogo PT-BR (`invalid_string.email`).

Referência primária: [formatos de e-mail do Zod](https://zod.dev/api#emails).
Não prometer RFC completo, existência de caixa, domínio/MX ou confirmação do endereço. A política
fica alinhada ao frontend, não pretende redefinir identidade conforme regras de um provedor.
Dados existentes não são alterados; endereço malformado aceito pelo backend antigo exigirá
correção individual se houver caso real. Não migrar automaticamente nem apagar conta.

Quatro regressões HTTP reais (três falhas antes), 511 testes no check agregado, build backend e
imagem Docker Linux amd64 aprovados. Erro de tipagem do corpo JSON no teste foi corrigido antes
da aprovação das builds, sem ignorar typecheck. Sem schema/env/dependência nova, bump único .317.
Smoke .316 confirmado 16/16 às 00:57 UTC; não certificar deploy durante divergência de versões.

Validação final 0.1.317: onze cenários HTTP/PostgreSQL repetidos com aliases/domínio longo
passaram; recursos isolados removidos. Quatro testes de formato passaram dentro da imagem final
não root, somente leitura e sem rede externa. Nenhuma mensagem de e-mail foi enviada no teste.

## Complemento — validade e consumo de confirmação (0.1.318)

TASK-06 define seis números e janela controlada por CODE_API_USER_VALID_MINUTES. O uso de
`differenceInMinutes` com `>` aceitava quase um minuto adicional e timestamps futuros. Além disso,
leitura e atualização incondicional permitiam confirmar uma emissão substituída/consumida.

Decisão: reutilizar `utils/code.ts` para predicado temporal estrito (idade >= 0 e < validade),
schema Zod customizado no validator existente e `updateMany` por ID com comparação de estado,
código, emissão observada e intervalo. A atualização afeta no máximo um usuário e limpa o código;
count=0 não hidrata outra sessão. Não criar tabela, lock distribuído, novo endpoint ou segredo.
O filtro de emissão também impede que uma rara repetição numérica no reenvio valide snapshot antigo.

Não mudar a geração, a env, o cooldown, as sessões de contas confirmadas nem o contrato de sucesso.
Um código fora do prazo requer reenvio; essa é a diferença intencional no rollout. Relógios devem
estar sincronizados: emissão no futuro falha fechada. Rollback restaura a tolerância indevida e
a atualização incondicional, portanto não é correção de dados nem motivo para reset.

Baseline PostgreSQL real: validade de um minuto aceitou 61 segundos (200). Imagem corrigida passou
sete cenários: expirado/futuro/malformado/incorreto, sucesso seguido de replay, duas requisições
concorrentes com apenas um sucesso e snapshot de emissão substituída recusado pelo repositório.
Fixture temporária em DB isolado, sem secrets publicados, envio SMTP ou mock de provider.
Quatro testes novos; check 515 testes, build/Docker aprovados e quatro testes no artefato final.
Smoke 0.1.317 aprovado 16/16 às 01:06 UTC; 0.1.318 ainda pendente de publicação.

## Recuperação de senha — continuação 0.1.319

Na imagem 0.1.318, banco PostgreSQL isolado demonstrou: link aceito após o prazo e com data
futura; duas redefinições simultâneas concluíram; troca autenticada não apagou link anterior.
Não houve alteração de senha publicada, SMTP simulado ou envio de mensagem.

Decisão: reutilizar `isCodeWithinValidity` também antes/depois do hash de senha. O repositório
existente consome o link por compare-and-set de usuário, código e data de emissão. A troca da
senha, limpeza do link e revogação das sessões existentes ficam na mesma transação, somente para
o vencedor. `updateAndClearTokens` invalida links quando recebe nova senha; mantém a ordem de
locks usuário → tokens e não devolve tokens que acabou de revogar.

Contratos, auto-hidratação e status de conta existentes são preservados nesta correção; não
criar fluxo paralelo nem alterar e-mails/links já emitidos dentro da validade. Sem nova env,
package, schema/migration ou reset. Um link vencido, usado ou anterior à troca de senha exige
novo pedido. Rollback não exige banco, mas reintroduz a falha e não é recomendado.

Referência primária: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html),
consultada em 11/09/2026, sobre expiração/uso único e invalidação de sessões. A recomendação de
login normal após reset difere da auto-hidratação histórica (TASK-05); essa decisão de UX/auth,
a notificação de troca e a análise de timing/limites de envio permanecem para revisão, não são
certificadas por este patch.

Teste repetível manual em `backend/scripts/password-reset-integration.mjs` e probe separado,
reaproveitando a pasta de scripts e runner Node existentes, sem dependências novas. Exige imagem
local já construída, gera credenciais efêmeras e PostgreSQL em tmpfs/rede interna sem portas.
Apenas containers/redes com label aleatório da execução são removidos. Não usa `.env` do
workspace, não aceita URL externa de banco e não executa automaticamente no deploy/check normal.

Validação 0.1.319: oito cenários no PostgreSQL real passaram (seis HTTP, dois de repositório),
incluindo formato de link vigente e senha do vencedor. Check agregado 515 testes, build backend
final e Docker Linux amd64 aprovados. Recursos temporários removidos. Falhas transacionais
injetadas, envio SMTP e demais fluxos concorrentes não foram certificados por estes testes.

## Formulários Admin — continuação 0.1.320

Browser autenticado reproduziu `Invalid input` no limite de 160 caracteres do catálogo.
Decisão: mensagens explícitas no schema Zod existente. Schema/tipos de formulário extraídos para
`modules/catalog-schema.ts`, como separação já usada em outras páginas do Admin, permitindo
regressão com Node sem carregar JSX, API ou simular providers; reexports preservam consumidores.
Limites, normalização e confirmação forte de exclusão não mudam.

Os controllers Admin de input/select/textarea passam a separar label e slot de erro, seguindo a
correção já aplicada na fundação frontend. Preservados componentes, estilos e altura reservada;
obrigatoriedade agora é informada por ARIA sem introduzir validação nativa em inglês.
Erro permanece associado por aria-describedby e ganha anúncio de alerta. Não há novo design
system, package, env ou schema de banco. Apps continuam independentes, sem imports cruzados.

Referência: `PROTO-INVENTORY.md` e `_product/proto/admin/Configurações.png` inspecionados.
Builder disponível retornou apenas MUI global, não o Quick Copy Lectum; fallback local registrado.
Capturas mobile reais do Admin preservam a comparação com o produto vigente, sem redesenho.

Validação local: modal real com nome excessivo, seleção e textarea em 390×844; foco e slot
preservados. Harness sem persistência removido, login restaurado, servidor local encerrado.
Duas regressões de schema e uma estrutural aprovadas; build/check Admin aprovados. A diferença
de cor local/homolog vem da configuração visual não carregada no teste isolado, não deste patch.
Safari/dispositivo real e anúncio por leitor de tela não são equivalentes à árvore acessível.

## Pré-requisitos da conta no backend — continuação 0.1.321

Em HTTP real com banco descartável, a imagem 0.1.319 permitiu onboarding sem e-mail confirmado
e leitura privada de posts próprios. O frontend orientava confirmação, mas `_auth` só exigia
sessão ativa. A rota privada de troca de senha também gravava `confirmed=true` sem prova de e-mail.

Decisão: reutilizar `_auth`, aplicando por padrão os pré-requisitos recarregados do banco:
`need_reset` primeiro (senha temporária), depois `confirmed`. Orientações PT-BR em 403, sem vazar
dados internos. Não depender do pathname, flags do cliente ou claims antigos do JWT. Provedores,
roles, ownership, revogação, device e view-as somente leitura continuam nas guardas existentes.

A variante nomeada `authenticateUserSession` preserva o mesmo JWT/device/estado ativo, sem liberar
acesso anônimo, e é restrita aos cinco routers de bootstrap de auth e segurança da própria conta
(security, logout, alteração de e-mail/senha e exclusão com reautenticação). Dicas da conta mantêm
guarda completa. Rotas privadas de negócio herdam a guarda completa por import/mount já existente;
leitura pública/optionalAuth não passa a exigir confirmação ou login. Trocar senha autenticada
não altera mais o estado de confirmação; somente fluxos que provam o e-mail podem fazê-lo.

Não há schema, env, nova dependência ou backfill. Contrato de sucesso permanece. Contas pendentes
que burlavam o frontend passam a receber 403 até completar a etapa; não confirmar em massa nem
redefinir senhas publicadas. Rollback de código reabre essas falhas e não é recomendado; correção
progressiva é preferível. O ambiente antigo/novo permanece compatível com as telas já existentes.

Runner Docker da recuperação reutilizado em `scripts/auth-integration.mjs`, com duas suites
fechadas por nome; entrada antiga permanece como wrapper. Rede, banco e credenciais efêmeros,
sem portas públicas/.env/provedores simulados, cleanup por label aleatório. Recursos do produto
não são apagados. Envio SMTP e Google reais não são certificados por essa integração isolada.

Referência primária: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html),
consultada em 11/09/2026: autorização em cada requisição e recusa por padrão, sem substituir a
regra de produto de TASK-06/DATA-MODEL. Validações finais da mudança ainda em execução.

A continuação encontrou o mesmo risco de recuperação em outra entrada: a rota usada pelo painel
Conta chamava `AccountRepository`, não `LoginRepository` corrigido na 0.1.319. Os links também
sobreviviam à troca de e-mail. Duas regressões adicionais reproduziram isso na primeira imagem
candidata de 0.1.321 (não publicada). Centralizada a invalidação em `utils/account-credentials`
para os dois repositórios, preservando o estado `confirmed`. A transação da conta foi movida
para o `account-session-store` existente; não aumentar o repositório legado acima de 700 linhas
nem relaxar o limite de arquitetura. A atomicidade com a revogação das sessões foi preservada.

Validação final 0.1.321: 523 testes automatizados de apps + seis da política de versão;
17 cenários de pré-requisitos/credenciais, oito de recuperação e onze de privacidade com banco
isolado real. Build backend e imagem Linux amd64 aprovados. Relações do validador legadas são
ativadas nos probes por `x-refine=true`, como no cliente, sem ignorar diferenças do ambiente test.
Sem alterações de dados publicados. Gate de publicação/smoke continua sendo registrado à parte.


## Foco de teclado nos controles de vídeo — continuação 0.1.322

O timer imersivo ocultava controles focados por Tab durante reprodução, mantendo o foco em um
ancestral aria-hidden. Reproduzido em homolog. Reutilizar hook, shell e predicado existentes:
visibilidade protege `:focus-visible` e volta ao modo automático ao sair do player. Captura de foco
na raiz cobre botão central, controles inferiores e o portal, sem criar player/layout paralelo.
Foco de mouse/toque não fixa controles; pausa e opção `always` continuam soberanas.

Sem mudanças de acesso, HLS, API, dados, env ou package. Patch exclusivamente frontend e rollback
somente de código (reintroduz o defeito de acessibilidade). Teste de política e browser local com
vídeo real, sem mocks de API. Rótulos/medidas/proto preservados; certificação de dispositivos reais
permanece pendente. A observação anterior de mídia inglesa na árvore acessível não foi confirmada
como falha de reprodução e não justifica enfraquecer a autorização ou renovar links sem diagnóstico.


## Escape e continuidade do vídeo — continuação 0.1.323

Reproduzido em homolog: Escape pausava e zerava o vídeo ampliado. O botão já usava snapshot,
mas a tecla removia diretamente o portal. Decisão: única função de fechamento, com callback
anterior à desmontagem, reutilizando useVideoPlaybackContinuity. Ref atualizado por efeito evita
recriar locks de scroll por timeupdate; não adiciona novo player ou persistência. Snapshot mantém
posição, pausa, mute, volume e taxa conforme o contrato já existente.

Validação local real confirmou reprodução contínua e caso pausado/mutado em 4,5s. Sem API, env,
schema ou pacote novo; frontend compatível com backend antigo. Rollback de código reintroduz
a perda de posição por teclado, sem efeito em dados. Continuidade em renovação de URL HLS e
gestão completa de foco no portal são pontos separados ainda não certificados.

## Credenciais e emissão concorrente — continuação 0.1.324

Os repositórios administrativos mantinham recovery ao alterar e-mail. Na imagem anterior, o
link do endereço antigo redefiniu a senha e confirmou o endereço novo (HTTP 200), tanto para
paciente quanto para psicólogo. Reutilizar `withInvalidatedRecovery` na transação já existente
de e-mail, sessões e auditoria; não duplicar regra nem migrar dados.

Também foi reproduzida gravação de código com snapshot antigo depois da troca: invalidar só os
links já persistidos não basta. Emissão pública/privada/Admin passa a comparar e-mail, hash e
conta não excluída no próprio update condicional. Confirmação requer ainda `confirmed=false`.
Falha de entrega de recuperação só remove o código exato daquela tentativa, não um posterior.
Helper puro centraliza o predicado; nenhum hash/credencial entra em resposta, log ou relatório.

Admin devolve 409 seguro em português quando a conta mudou durante a entrega. Recuperação pública
mantém resposta genérica 200, sem revelar existência/alteração da conta. Não se introduz provider,
env, schema, dependência ou acoplamento ao deploy Next. Entrega real SMTP fica fora do teste:
integração executa repositórios/transações e rota real de reset em PostgreSQL descartável, sem
acesso externo, com rollback de FK verificado. A sequência intercalada usa snapshots reais,
não relógio/provedor/banco simulado.

Rollout compatível com clientes antigos. Rollback reintroduz a falha, mas não restaura links
invalidados. Nenhuma conta ou sessão publicada foi alterada durante os testes.

### Campos simultâneos no Admin — 0.1.325

Usar `useId` por instância nos quatro controllers existentes. Derivar rótulo, controle e slot de
erro do mesmo identificador, sem alterar `name`, payload ou espaço reservado. A repetição de nomes
entre formulário da página e modal é legítima; a repetição de IDs DOM não. Não criar um segundo
form engine nem corrigir só o modal específico. React/RHF reais, renderização SSR repetida e Browser
local móvel/desktop validaram os vínculos. Rollout independente do backend; rollback só de código.

O teste SSR carrega somente a lista explícita dos controllers e `utils.ts` pelo
[loader nativo do Node](https://nodejs.org/api/module.html#moduleregisterhooksoptions), compilados
pelo TypeScript já instalado; o hook é removido no teardown. Sem execução por string de função,
sem relaxar a guarda de código e sem substituir React/RHF por doubles. O pre-push recusou a primeira
implementação de teste em 0.1.325; a publicação será retomada com correção na 0.1.326.

### Limites de confiança de comunidades, billing e processamento de vídeo

Decisão em integração na TASK-178: preservar os contratos do produto e fortalecer a admissão
e autorização nas camadas já existentes, sem novo package, env ou schema.

- Render social: o identificador interno do job não concede acesso. Emitir handle HMAC com
  namespace, dono, post e resposta; verificar antes de consultar ou baixar o job. Continuar
  verificando elegibilidade atual e comunidade ativa. Não devolver URL interna do serviço.
- O handle permanece string opaca no campo existente. **Impacto de rollout:** jobs de render e
  partes multipart emitidos no formato anterior precisam ser reiniciados; não aceitar tokens
  legados sem vínculo/tamanho como fallback. Réplicas em versões distintas podem recusar uma
  operação em andamento. Conteúdo persistido e arquivos existentes não são apagados.
- Mídia R2 legada: reutilizar o resolvedor canônico de origem/chave, sem criar outra política
  de URL. Isso valida admissão, não prova propriedade nem torna um bucket público privado.
- Billing: centralizar leitura de referência/status/valor; texto livre e prefixos não provam
  vínculo. Referências conflitantes falham fechadas. Estado do pagamento é diferente do estado
  da assinatura/parcela. Eventos antigos continuam no banco; histórico/LTV podem diminuir pela
  exclusão de associações falsas. A prova HTTP/PostgreSQL não substitui reconciliação no gateway.
- Cartão: chave de idempotência por assinatura e token da operação, sem expor o token. Webhook:
  digest completo e headers não ambíguos, preservando comparação constante. A guarda de plano
  compara BRL, mês, estado e valor; não certifica trial, collector ou condições comerciais extras.
- Vídeo: download HTTPS com resolução validada no socket, sem redirects; playlists remotas
  limitadas ao formato assinado do Stream, protocolos remotos reduzidos e TLS verificado.
  A exceção first-party continua estreita para mídia pública Lectum. O backend mantém a decisão
  de acesso, sem converter todo conteúdo público em login obrigatório.
- FFmpeg: texto passa pelas duas gramáticas de escape, sem expansão. Armazenamento verifica
  diretórios estruturais e reservas; output publicado válido sobrevive à falha transitória de
  progresso. Prazo cobre a tentativa inteira e retries continuam finitos.

O formato de URL de manifesto com token substituindo UID é documentado pelo
[Cloudflare Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/).
A configuração de protocolos/TLS segue o [FFmpeg](https://ffmpeg.org/ffmpeg-protocols.html).
Nenhuma credencial ou exemplo externo dessas páginas foi executado. Testes reais locais usam
recursos descartáveis; a imagem WIP de laboratório .326 não equivale ao commit .326 publicado.

Pendências financeiras bloqueiam recomendação de produção: intenção durável de checkout para
resultado incerto/concorrência; inbox e reconciliação canônica de pagamento com validação de
dono, ambiente, moeda e valor. Não improvisar cancelamento, backfill ou nova migration sem
especificar transições e obter evidência de provider em conta autorizada. Rollback de código
reintroduz riscos corrigidos, não exige reset nem desfaz conteúdo publicado.

### Concorrência, edição e consultas administrativas

- Criação/exclusão de replies revalida alvo, pai, subárvore e proteção de contribuições profissionais
  dentro de cada tentativa serializável. A contagem é calculada no snapshot transacional; retries
  não reutilizam IDs/contadores anteriores. Não há reparação em massa de registros legados.
- Edição de post paciente passa pela mesma classificação textual da criação. Conforme ADR-0145,
  uma tentativa bloqueada/retida é registrada sem substituir ou bloquear o conteúdo já publicado;
  edição sensível permitida registra seu evento. Autorização precede moderação.
- Consulta de denúncias omite datas vazias no Admin e as tolera no backend para clientes anteriores;
  o limite do tipo comporta os identificadores oferecidos pelo endpoint. Não ampliar silenciosamente
  a janela histórica padrão. Tela só exibe métricas/resultado vazio quando a consulta tiver sucesso.
- Testes de UI usam componentes/controllers/React Query reais para regressão de estado. Isso é
  prova unitária, distinta da suíte HTTP/PG isolada e da validação no Browser local/publicado.
- Mapeamento de origem pública usa propriedade própria: chaves herdadas não podem mudar o tipo
  serializado da resposta. Não há mudança de payload de sucesso para valores suportados.
- Filhas de replies contam somente registros ativos, assim como a árvore exibida. Mine/saved
  reutilizam a busca em lote de memberships por usuário/comunidade, encaminhando `following`
  como argumento opcional final ao mapper. Sem N+1, alteração de schema ou reordenação de flags.

### Contatos, limites e preferências — continuação .328

- Separar hidratação de contato internacional e serialização do valor nacional controlado por
  RHF. DDD igual ao DDI não é prefixo removível nessa segunda etapa. O backend rejeita excesso de
  dígitos em vez de salvar silenciosamente outro contato. Não reparar contatos legados em massa.
- Mensagens dos limites existentes do perfil são PT-BR; nome composto usa o mesmo normalizador
  do payload e respeita o limite160 já obrigatório no backend, sem truncamento.
- Pickers usam o padrão local de input nativo oculto acionado pelo botão com rótulo. Preservar
  handlers/ref/accept; validar teclado e abertura/cancelamento no Browser antes de concluir.
- Preferências só podem ser editadas após leitura bem-sucedida; erro oferece retry, nunca defaults
  editáveis como se fossem escolhas persistidas. Rota traduzida e alias mantêm permissão de push
  manual. Não disparar pedido de permissão ou regravar opt-outs automaticamente.
- Aba Conteúdo reutiliza política de Denúncias: tipos oferecidos cabem no contrato, contagem/vazio
  e paginação dependem de sucesso, não da ausência temporária de dados ou de erro da consulta.

Sem novo package, env, schema/migration ou mudanças em contatos/preferências publicadas como
reparação. Rollout compatível entre versões; cliente anterior pode continuar com a falha visual
até seu deploy. Reverter código reintroduz riscos, não exige reset de banco.


Validação .328: formulário de preferências extraído como apresentação real consumida pela
mesma lógica, para testar sem substituir hooks. Mantém `useFormList`, controllers e schemas;
merge preserva categorias não renderizadas e controles ficam bloqueados durante PUT. PG real
confirmou preservação após falha de GET/restauração/retry. Inputs ocultos seguem o padrão já
existente; abertura nativa confirmada, upload/cancelamento completo continuam na matriz.
Não adicionar pacotes de modais ou mudar o fluxo de mídia nesta correção.

### Foco de denúncias — decisão após .328

Adotar uma primitive pequena de `<dialog>`/`showModal()` no frontend, começando somente na
denúncia. Não instalar Radix nem criar outro motor de formulário. A revisão de29 fontes não
localizou solução completa equivalente; os padrões existentes cobrem apenas partes do problema.
Semântica ARIA sozinha não impede interação no fundo. O nativo fornece top layer e inércia;
ciclo de foco/escape deve ser validado no Browser real, não apenas por SSR.

O menuitem é desmontado ao abrir: capturar e encaminhar o botão persistente correto como alvo
de retorno, sem transportar DOM em API/Redux. Não restaurar em nó removido ou roubar foco da
rota seguinte. Título por instância, callbacks não devem reabrir o modal. Compartilhar aquisição
idempotente do lock de scroll, preservando estilos anteriores; consumidores legados ainda não
migrados não são cobertos por essa garantia. Política atual de fechamento durante envio não
muda neste recorte. Rollback é de frontend, sem reset/env/migration.

Referências: [W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
[W3C H102](https://www.w3.org/WAI/WCAG22/Techniques/html/H102.html) e
[HTML dialog](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element).
Suporte e comportamento de teclado/scroll em dispositivos devem ser comprovados antes de
classificar a matriz como completa; não usar polyfill ou fallback silencioso.

Browser local validou mobile390/desktop1280, post/comentário/filha e rota dedicada com backend
.328 real em PG descartável. Select consome seu primeiro Escape; fechamento normal e sucesso
restauram gatilho persistente; erro real preserva dados. Foco perdido ao desabilitar Enviar é
recuperado no alerta apenas se documento ativo e foco em BODY/dialog; não interromper edição
em outro campo. Native Tab pode ir ao chrome do navegador, não aos controles do fundo do app.
SSR/ownership puros complementam, não substituem essa prova. Outros modais/Safari/SPA/camadas
permanecem em matriz, sem afirmar cobertura total. Runner permanente inclui os12 novos casos.

### Parsers financeiros e duração concorrente — após .329

O Financeiro geral possui parser paralelo que aceita substring de status/referência e quantia
permissiva; convergir para os helpers estritos de billing já adotados no detalhe individual.
Preservar contrato, regras de receita/MRR e dados existentes; detalhes técnicos devem sair nulos,
não retornar mensagem de provider em sucesso. Isso corrige integridade local, não certifica
liquidação: recurso canônico e tentativa durável permanecem P1, sem operação remota nesse recorte.

Duração de analytics deve usar escrita condicional atômica com ownership e soft-delete no mesmo
WHERE, seguida da leitura do evento elegível; read/Math.max/update separado perde a monotonicidade.
Validar com locks reais em PG descartável e mesma imagem integral, não mock. Reaproveitar o runner
isolado existente extraindo infraestrutura compartilhada apenas se necessária à regressão nova;
sem credenciais OAuth fictícias ou bootstrap de schedulers. Rollback não precisa migração, mas
reabre defeitos; não resetar dados. Nenhuma variável obrigatória/dependência nova.


A escrita condicional usa a reavaliação de WHERE após uma atualização concorrente em
[PostgreSQL Read Committed](https://www.postgresql.org/docs/current/transaction-iso.html).
O teste sincroniza locks reais observados no servidor descartável; o polling só observa a
barreira. Não altera isolation global nem exige migration. O runner compartilhado preservou
48/48 controles de posts na imagem anterior e reproduziu os dois defeitos de duração.

Mapeamento financeiro puro de cobrança/vínculo fica junto dos demais mapeamentos de assinatura;
charges-lists reexporta as mesmas funções para preservar imports e mantém orquestração externa
separada. Assim testes importam consumidores reais sem inicializar gateway/Prisma, em vez de
simular dependências. Nenhuma função de provider foi substituída; parser compartilhado não mudou.
O Financeiro passa a distinguir zero explícito válido de quantia ausente/malformada, como billing:
zero continua receita0, mas deixa de marcar valor indisponível. Ausência, negativo ou texto
inválido continuam nulos, nunca convertidos em zero. Denominador do LTV, MRR, cortesia e dedupe
legado permanecem; vínculo ambíguo é recusado por conta, inclusive no LTV agregado.
