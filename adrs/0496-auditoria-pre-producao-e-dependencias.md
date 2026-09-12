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


### Hidratação de presença de sessão — .331

Extrair a fundação já existente no boundary de conversão para hook neutro compartilhado;
PrivateTemplate não deve importar uma feature para controlar sessão. `useSyncExternalStore`
usa snapshot false no SSR e primeiro render cliente; cookie só é consultado após essa fase.
Conforme [React — SSR de store externo](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering),
o snapshot inicial precisa coincidir. Não suprimir erro, remover SSR nem persistir identidade
no HTML. Timer/listeners têm uma assinatura compartilhada com cleanup por consumidor.

Presença continua apenas sinal para autenticar: HttpOnly/bearer, reset obrigatório, onboarding,
query de sessão e erro/retry não são modificados. Rotas públicas podem transicionar do conteúdo
público inicial para validação; rotas privadas partem do estado restrito. Não reclassificar
sessão indisponível como anônima. Replay de intenções da conversão é risco separado registrado,
não usar cookie como autorização de nova operação. Nenhuma env/package/schema/contrato novo.

Baseline real em390/1280 demonstrou mismatch com contas locais válidas e PG real na imagem
backend.330; cinco testes SSR reais complementam, não substituem Browser. Artefato otimizado
compila; API localhost é rejeitada em NODE_ENV production por política existente, portanto não
relaxar CSP/validação de origem para testes. Autenticação end-to-end local usa dev e módulos
reais; deploy em homolog precisa reteste separado. Rollback apenas frontend reintroduz H1.

### Metadados públicos sem manutenção implícita — .332

`list` e `findByKey` tornam-se leituras: o tráfego público não deve criar registros nem
normalizar dados persistidos. O consumidor Next já possui fallback real por página; lista
vazia retorna `settings: []` e `updated_at: null`, sem simular linhas/data de criação. Serviços
administrativos inicializam explicitamente os defaults antes de listar/editar/autorizar upload,
preservando o comportamento do painel sem novo bootstrap obrigatório.

A mesma função pura resolve rotas gerenciadas na projeção DTO e na manutenção: somente aliases
canônicos exatos conhecidos mudam. Canônico customizado/nulo e campos editoriais/IDs/datas reais
permanecem; rotas dinâmicas mantêm placeholders. Projeção pública não altera `updated_at` nem
transforma mudança de apresentação em edição de banco. Chaves desconhecidas conservam o
mapeamento DTO legado; corrigir esse contrato é outra análise, não apagar registros existentes.

Inicialização usa `createMany` com `skipDuplicates`; verificar presença das chaves esperadas
após o comando, pois colisão de ID com outra chave também é ignorada pelo banco. Não escolher
novo ID aleatório nem sobrescrever linha conflitante silenciosamente. Em caso de conflito real,
recusar a manutenção e preservar os dados para diagnóstico interno. Soft-delete continua
contando como chave existente e nunca é ressuscitado por defaults.

Sincronização usa `updateMany` condicionado a id, deleted=false, rota e canônico observados.
Se edição/remoção ganhar a disputa, a manutenção não escreve por cima dela; próxima manutenção
pode tratar a rota ainda antiga, preservando o canônico escolhido. Campos editoriais e auditoria
do Admin não são atualizados pela projeção pública. Testar PostgreSQL real com barreiras de lock,
sem substituir métodos de repositório; primitivas experimentais são apenas prova da proposta.

Não há schema/migration, package, env obrigatória, provider ou reparação em massa. Implantação
independente de backend; clientes antigos continuam entendendo o DTO. Réplicas backend antigas
ainda podem executar manutenção no GET durante rollout; smoke só certifica depois da versão
publicada. Rollback de código reintroduz o risco, mas não exige reversão de banco.

CreateMany e verificação ficam na mesma transação: colisão preserva também a ausência dos
outros defaults, sem inicialização parcial. Manutenção ordena IDs antes de adquirir locks.
Imagem final .332 passou18 controles PG reais, inclusive edição pelo repositório administrativo
com trilha de auditoria; baseline final .330 falhou5/12. Regressão permanente reutiliza o runner
isolado; triggers/locks reais coordenam falhas/concorrência, nunca substituem métodos do app.

### Associação/cancelamento de mídia — M2/M3 (.333)

A prova na imagem .330 repetida duas vezes demonstrou cinco interleavings inválidos: publicação
ou edição de post/resposta e associação automática do perfil podem confirmar enquanto o cancel
aguarda a escrita do ativo; resultado contém referência a ativo cancelado. Não depende de
exclusão física no provider e não é bypass de acesso entre donos.

Decisão: admissão de referência e cancelamento compartilham transações Serializable com o helper
existente e revalidam a cada retry. Leitura do ativo/escrita da associação confronta leitura da
associação/escrita do ativo; nenhum lock global, parser alternativo ou provider dentro do retry.
Cancel retorna disposição tipada; só um cancel confirmado permite exclusão remota. Revalidar o
candidato de perfil dentro da transação mantém newest, origem/CAS da migração e idempotência.
Falha/resultado incerto de commit conserva mídia: retenção órfã exige reconciliação futura,
não compensação destrutiva baseada em leitura anterior.

O cancelamento de tentativa ganha endpoint autenticado aditivo `DELETE /api/private/video-assets/uploads/:id`.
Ele recusa ativos associados, inclusive apresentação. DELETE legado preserva remoção deliberada
do próprio perfil; para posts/respostas, associação ativa continua recusando ambos. Frontend usa
o endpoint novo para cleanup e nunca faz fallback para o antigo. Uma query/body opcional teria
sido ignorada pelo backend anterior, produzindo justamente o efeito destrutivo a evitar; 404 do
endpoint novo degrada para retenção segura durante rollout. Clientes antigos permanecem com a
semântica antiga até atualizar, e rollback de backend preserva esta proteção do cliente novo.

Não há mudança de schema, migration, env, dependência nem política de acesso público. Não reparar
histórico ou executar limpeza de mídias publicadas. M1 (R2 pós-commit), M4 (reconciliação ready),
M5–M7 e cancelamento de uma publicação já enviada continuam em escopos pendentes. Prova DB/HTTP
não certifica transporte TUS nem exclusão/reprodução física Cloudflare/R2.

A revisão final também remove `upload.abort(true)` do cliente. A [extensão Termination do
TUS](https://tus.io/protocols/resumable-upload#termination) pode terminar uploads concluídos;
`abort(true)` na biblioteca instalada envia DELETE direto à URL de upload. Não foi comprovado
que a Cloudflare aceita esse método nesse endpoint; a ausência dessa prova não deve ser a
barreira de integridade. Usar `abort(false)` apenas interrompe o transporte/retries, e o cleanup
passa pelo cancel autenticado/transacional. Tratar a rejeição do abort evita promise órfã.
Sem fallback destrutivo nem nova dependência; suporte físico do provider não foi inferido.

Prova final:28 invariantes PG,16 HTTP/JWT/cookie/dispositivo,16 regressões de concorrência e48
de estado de posts/respostas aprovadas na imagem .333. Os4 controles adicionais preservam newest
e CAS de origem/capa da migração; nenhum objeto R2 é lido/removido. Regressões frontend178,
backend393, Admin53, video43 e versão6 passam. Build frontend repetido após mudar abort parafalse.

### Recuperação — identidade do envio (AF4, validada localmente .334)

O callback de recuperação recebe o payload da mutation real, em vez de consultar campos que
podem ter mudado durante a rede. Reenvio não busca fallback no formulário: usa a identidade do
envio concluído e revalida o mesmo schema. Expansão somente de tipo de callback no cliente,
compatível com consumidores que ignoram argumentos. `onlyRead` da fundação Form desabilita campos
durante a operação; botão e handler recusam novo envio pendente. Sem nova camada de formulário.
Não alterar o contrato anti-enumeração/TTL/revogação/env nem alegar entrega de mensagem a partir
da resposta HTTP; integração com caixa de entrada depende de evidência separada.

Nos testes de AF4, o loader TS/TSX nativo antes copiado em quatro suítes foi centralizado em
`frontend/scripts/register-source-modules.mjs`. Mantém módulos reais, aliases restritos a src
e SSR React, sem mocks de requests/hooks/providers; não é enviado ao bundle. Testes de callbacks
são contratos estáticos explícitos, distintos dos testes reais de schema/Form e do Browser.

### Integração .335 de duas branches homolog locais

Recuperação2aa02fa9 e Cidade58b071e9 surgiram do mesmo8dc679b9 e ambos usaram.334. Push
recusado preserva proteção fast-forward. Decisão: merge revisado com versão única335, sem
forçar remoto, apagar commits ou modificar banco. Os registros334 indicam qual artefato
foi testado; o smoke334 sozinho não certifica a correção ainda apenaslocal de recuperação.
A integração conserva Cidade/Estado e parser plano, mas corrige a regressão HTTP de1byte
com Multer2.3 e restaura exceções ESLint justificadas de hard reload. Lock congelado deve
ser a base antes de alterar código por diferenças de dependências locais.

### Contato profissional e confirmação (PF1–PF3)

O formulário de perfil já separa número internacional salvo de campo nacional. O onboarding
WhatsApp mantinha outra implementação com remoção duplicada doDDI. Extrair apenas os helpers
puros compartilhados para utils, mantendo RHF/Zod/controller e contratos de retorno existentes;
não importar um formulário de página no outro. A validação de posse/telefone válido permanece
no backend, sem presumir que teste de comprimento certifica um número ou contato WhatsApp.

Confirmação de registro é uma operação em andamento, não uma tela cancelável sem efeito.
Bloquear ações conflitantes enquanto pending mantém o payload e a intenção visíveis; não altera
a autorização ou aprova/reprova pessoa automaticamente. Modalidade apenas presencial não pode
anunciar disponibilidade online. Correções frontend compatíveis, sem env/API/schema/provider.

ResultCard/ResultField foram separados da composição maior sem alterar marcação: reexport
compatível e prop disabled opcional. Isso mantém o card reutilizável/testável sem importar
navegação Next no teste de apresentação. Nenhum stub de Next/provider. O teste de modalidade
fica em utils para não desaparecer da execução por glob com [id]; importa o helper real.
Bump336 único, sem dependência/migration/env. Gate local de sessão foi observado, não contornado;
SSR/composição não substituem uma confirmaçãoCFP real nem certificam titularidade do telefone.

### Campo telefônico com DDI separado (PF4)

Reprodução SSR do PhoneController real: máscara esconde dígitos estrangeiros e apresenta
+55 dentro de um campo já nacional. O controller passa a observar país pelo useWatch já
usado no SelectController. MáscaraBR somente para nacionalBR até11dígitos; demais entradas
ficam inteiras, sem máscara de país inventada. Sem slice no campo com seletor: Zod existente
recusa tamanho inválido sem converter a entrada em outro contato. Exibição legada sem
seletor/formatPhone permanece inalterada. Baseline3falhas, controleBR e legado passam;
17testes controllers após correção. Não certifica número existente ou posse.


### Anonimato, copy e vocabulário administrativo337

Botão anônimo extraído da view sem novos estados/hooks; mantém Controller/RHF e autorização
por papel. Tab nativo volta a alcançá-lo; clique com detail0 não devolve foco ao editor,
ponteiro preserva comportamento móvel anterior. Sem handlers customizados de Space/Enter.
Helper de copy apenas faz concordância resposta/comentário, sem novas condições de domínio.

No backend, razões canônicas self_harm/abuse recebem alta no resumo; fallback legado e
cutoff da consulta permanecem. Gênero mantém IDs e aliases, adiciona rótulo aprovado e
Object.hasOwn com fallback textual. Notas de métricas continuam quatro e diferenciando
aceite de envio de leitura; nenhuma afirmação de entrega ao destinatário. Duração é movida
para o DTO de status, onde o serviço/validator já a esperavam. Sem env/migration/provider.
Helpers puros próximos dos serviços evitam inicializar Prisma/configuração nos testes, sem
substituir dependências. Teste semântico TypeScript do DTO evita Request.b:any mascarando o
contrato. Na imagem de produção só os17 testes puros são executados;20unitários no source
incluem3 testes de tipos dependentes do compilador de desenvolvimento. Nenhuma API remota
ou banco simulado para concluir integração; o alcance da prova permanece explícito.

### Catálogo de diagnóstico FFmpeg338

O retorno do classificador é código controlado, nunca o texto de stderr. Consulta em objeto
comum sem checar propriedade própria violava esse contrato para nomes herdados. Manter o
catálogo existente, guardá-lo com Object.hasOwn e preservar fallback genérico/todos os códigos
específicos. Sem novo sanitizador paralelo ou mudança no processo/retry/provider. Regressão
pura confirmada antes do patch; não interpretar como exploração remota reproduzida.
Deploy de video independente, sem env/migration; rollback apenas código/imagem, sem dados.

### Histórico administrativo e títulos338

Desativação/suspensão restringe a sessão do usuário, não remove do administrador existente o
acesso ao histórico. Alinhar somente a busca do alvo de atividades ao padrão administrativo
que admite inativos; exclusão lógica, papel, vínculo e IDs permanecem. Centralização adminAuth
inalterada. Teste verifica where, não consulta real nem conta desativada em homologação.

No título de log automático, extrair resolução existente para helper puro junto do serviço e
consultar somente chaves próprias do catálogo. Metadata salva continua prioritária e120caracteres
continuam o teto. Não normalizar eventos desconhecidos nem alterar envio/campanha/dados.
Sem schema/env/package ou contrato deAPI novo; rollback de código preserva persistência.

### Relatório do E2E de vídeo339

O sucesso do script só pode anunciar o que foi executado. Um booleano local é marcado após
a asserção terminal do cancelamento opcional; o formatter puro ao lado do script lista
controles obrigatórios e indica explicitamente caso omitido. O script de integração não roda
na suíte unitária; só o formatter e composição são testados, sem mocks de API/fila/provider.
Testes de scripts entram no runner Node nativo existente. Sem package/env novo, mudança de
contratoHTTP ou dados. Rollback é somente código/imagem do video;releases continuam separados.

### Timeout de sondagem de vídeo339

Falha de prazo do processo não demonstra arquivo inválido. Reutilizar as classes existentes
e classificar ManagedProcessError(timeout) como processing_failed com retryable=true,
compartilhando o tratamento entre sondagem local/remota e validação da saída. O encapsulamento
da saída conserva essa classificação; cancelamento continua terminal e falhas de mídia/JSON
continuam permanentes. Não inferir timeout por texto da mensagem.

Preservados os tetos de60/120segundos do probe, AbortSignal, deadline por tentativa do worker
e orçamento de tentativas/backoff da fila. Não há loop novo nem aumento de limites. Pode haver
mais tentativas para sondagens lentas, sempre dentro da configuração vigente. Sem env nova,
contratoHTTP novo ou migration. Testes puros não comprovam retry real do BullMQ ou provider.

### Interações consistentes340

CP2: três cards passam a compartilhar um hook de snapshot de interação, restrito ao
usuário/alvo. Props novas são autoridade quando não há ação pendente; durante a ação,
otimismo é preservado. Recibo local não se sobrepõe indefinidamente a refetchs, e callbacks
de uma geração anterior não alteram outro alvo/usuário. Reconciliar no render com guarda
por campos escalares evita frame antigo e efeito que apagaria otimismo pendente. Não é
novo store, API client ou regra de autorização. Layout e fundação visual permanecem.

CP3: atualizar/reverter somente os campos de voto ou salvamento do alvo nas queries reais,
nunca restaurar documento/lista inteira. A autoridade de operações sobrepostas fica
limitada ao QueryClient/alvo/tipo; revalidação das listas próprias/salvas acompanha as
famílias existentes. Testes usam callbacks reais e QueryClient real, sem substituir
mutationFn/queryFn nem concluir integração com servidor a partir de inputs de cache.
Snapshots/recibos exigem mesma identidade Query, não somente mesma chave após clear/remove;
rollback não herda resposta de outra vida do cache. Recibos validam post_id/target_type/reply_id
antes de aplicar campos; divergência desfaz somente a própria operação e mantém refetch.
Ordenação local não prova ordem de commits no servidor; refetch segue autoritativo.

### Dimensões do render social340

V03: canvas de composição continua1080x1920, como a prévia e os assets atuais. Se os tetos
VIDEO_MAX_WIDTH/VIDEO_MAX_HEIGHT exigirem menos, escalar a saída completa para múltiplos
pares de9:16, preservando texto/arte/proporção. Defaults não recebem uma escala adicional.
Não relaxar probe nem aumentar configuração; variantes standard/portable e com/sem assets
compartilham o limite. Teste local FFmpeg/ffprobe não comprova upload/Stream/job publicado.

Frontend/video são deploys independentes, sem env nova, package ou migration. Rollback é
de código/imagem, sem remoção de dados. Homologação continua sem recomendação de promoção.

### Dependência documental legal340

Minutas v0.1 existentes são explicitamente pendentes de aprovação e têm placeholders.
Cadastro já registra aceite provisório em user_background; não afirmar ausência total
nem regravar esse histórico como aceite de documento final. TASK-41 requer publicação
estática e links após pacote aprovado, não um CMS jurídico. Identificador SemVer da app
não substitui versão legal. A confirmação do responsável/revisão especializada é requisito
externo; nenhum texto foi inventado, publicado ou considerado aprovado nesta auditoria.

Referências técnicas para CP2/CP3: [React — ajuste por mudança de props](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
e [TanStack Query — optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates).

### Conversão e hidratação autenticada341

CP4 foi observado no Browser publicado340: convite de cadastro persistia após reconhecer a
conta. Callback estável de abertura não consultava autenticação atual e timers0/250ms podiam
sobreviver ao cleanup; prompt aberto não era descartado. Não interpretar isso como perda de
sessão nem relaxar autorização. Boundary mantém a combinação atual de identidade/marcador.

Extrair lifecycle e modal adjacentes permite testar React/callbacks reais sem substituir
Router, DOM ou provider. Opener consulta referência atual antes de analytics/estado; efeitos
cancelam timers; ajuste condicional de estado no próprio render descarta a oferta autenticada
antes do commit, e a view também a oculta. Somente esconder não bastaria: logout ressuscitaria
a oferta antiga. JSX/textos/tokens/handlers e contrato público permanecem iguais por AST.

Callbacks locais e SSR não comprovam ordem real de hidratação/scroll/cookies. Teste ReactDOM
controlado cobre6transições de componente; repetir fluxo publicado antes de fechar o aceite.
Nenhum package, migration, env ou contrato remoto novo. Frontend pode ser revertido isoladamente.

### Leitura histórica de migrations341

97arquivos remanescentes lidos sem executar SQL. Nenhuma correção vigente nova comprovada;
não editar migrations aplicadas para resolver riscos hipotéticos de um upgrade antigo.
Qualquer novo writer/backfill deve preservar: FKs distintas de usuário/perfil, chaves únicas
que incluem soft-delete, correspondência de alvo validada pela aplicação e cascatas/retenção.
Não tratar arquivos presentes como prova de checksums aplicados ou consistência do banco.

### Período de analytics, anexos e retenção342

FE341-03: abrir o editor não altera a consulta aplicada. Um formulário adjacente reutiliza
useFormList/React Hook Form, Zod e controllers da TASK02. Datas date-only e ordem são validadas
antes do callback; manter validação autoritativa do backend. Erro PT-BR no campo com espaço
reservado, inputs full-width na base mobile; cancelar desmonta o rascunho. Aplicar atualiza
intervalo e período juntos. Não generalizar em um novo framework de filtros.

FE341-02: retirar apenas tabIndex=-1 dos botões existentes de remoção; ativação nativa evita
handlers duplicados Enter/Espaço. Disabled, permissão, mousedown e foco do editor permanecem.

FE341-01: converter coordenadas do ponteiro pela matriz nativa getScreenCTM do SVG e limites
do eixo compartilhados, não pelo retângulo externo. Matriz ausente/singular não busca. Sem
posição de ponteiro, click não produz seek. Superfície slider acessível usa setas/Home/End,
passos do player existente e texto de tempo; gates de locked/duração/callback permanecem.
Não mudar curva, visual, playback ou regras de métricas por este patch. Baseline geométrico
não equivale a observação de reprodução autenticada; Browser contratual sem vídeo não a substitui.

### Scanner estático de ciclos342

Imports locais emitidos .js/.mjs/.cjs precisam resolver fontes .ts/.mts/.cts antes dos arquivos
runtime quando presentes. Excluir declarations e manter filtro de imports/exports somente de
tipo. Grafo do vídeo passou de0 para116arestas; nenhum ciclo real foi encontrado. Parser/DFS
continuam estáticos: não importar código da aplicação para fazer auditoria. Resolução fica
limitada a relativos e alias@/ já suportado, sem alegar resolver require/dynamic/package exports.
Regressões do scanner passam a integrar check:cycles. Referência: [TypeScript — substituição
de extensão](https://www.typescriptlang.org/docs/handbook/modules/reference.html#file-extension-substitution).

As correções342 não exigem env, package, migration, backfill ou reset; rollout de frontend
independente e compatível com backend341. Versões dos cinco manifests seguem sincronizadas.

### Editor de texto bloqueado e evento nativo343

O CSS WebKit de edição plaintext forçava escrita mesmo com contentEditable=false; handlers
sem gate propagavam a alteração ao RHF. Escolher read-only no estado bloqueado, recusar
beforeinput/paste/Enter e restaurar valor autoritativo do campo caso um input ainda chegue.
Não impedir eventos de cópia/seleção/navegação. Não mudar autorização remota ou limites.

React beforeinput pode encapsular TextEvent sem inputType; helper adjacente calcula tamanho
com guard de tipo e data opcional. Exclusões não são bloqueadas; quebras contam um caractere,
normalização CR/LF e corte final já existentes permanecem. Não alegar certificação IME.

O filho grid editável precisa min-w-0 para que break-words atue em palavras sem espaços.
DOM nativo confirmou largura1885px em container360 antes,360 depois. Preservar tokens e
estrutura; não criar componente ou pacote paralelo. Sem migration/env; rollback independente
no frontend, APIs anteriores compatíveis. Contrato de componente local não substitui salvar
uma publicação autenticada. Builder indisponível; fundação existente e protótipos exportados
continuam referência, sem novo desenho de produto.

### Período aplicado do dashboard de comunidades344

A342-03: seleção visual custom não significa intervalo aceito. Manter selectedPeriod para
controles e appliedPeriod para enabled/query/rótulo; a query all continua válida enquanto o
rascunho ainda está incompleto. Reusar useDateRangeCommitOnBlur e o padrão selected/applied
existente em Pacientes. Hook adjacente extrai só coordenação para exercitar estado React real.

onApply aplica o período selecionado no commit. applyRange também chama onApply: no preset,
fazer applyRange primeiro e setAppliedPeriod(nextPreset) por último no mesmo batch evita
sobrescrever o preset com o custom anterior. Não alterar assinatura/comportamento do hook
compartilhado nem todos os seus consumidores. Erro de rascunho permanece junto aos controles;
não virar indisponibilidade global de dados. Rótulo dos dados usa período aplicado.

SemnovaUI,controller,package,migration/env/contratoHTTP; rollbackAdmin independente. Browser
local testa hook+controles reais, não consultaautenticada; publicação deve repetir baseline.
Preservar cálculo dos seis meses fixos e métricas; nenhuma alteração de domínio neste patch.

### Busca estável e CPF minimizado345

A342-04: remover a key derivada da URL nas listas de pacientes e psicólogos. Preservar
a identidade do input, draft imediato, trim/debounce350ms e replaceParams existente.
Reconciliar mudanças externas de URL sem apagar digitação posterior no eco da própria
busca. Cancelar debounce no histórico/desmontagem; isso não cancela navegação já entregue
ao Next. Reusar admin/src/hooks para uma única política de busca, com os rótulos/markup
das duas rotas preservados. Sem foco imperativo ou dependência entre módulos de pacientes
e psicólogos. Contratos de estado/SSR não certificam efeitos/foco: repetir no Browser.

C13: usar a máscara efetiva já adotada pela auditoria pessoal também em cpf_masked da
verificação. Centralizar helper puro em backend/src/utils/cpf-mask.ts evita importar
serviços com efeitos só para formatar documento. Ocultar dígitos centrais; entrada inválida
nunca retorna bruta. Não é validador de CPF nem prova de identidade. O campo CPF completo
do formulário privado autorizado continua disponível; não alterar permissões/aprovações.

Sem nova env, package, migration ou reset; rollback independente Admin/backend. Contratos
HTTP permanecem com os mesmos campos/tipos. Tratar C17 em decisão separada: KYC não consta
do requisito atual, e nome editável não é prova de titularidade.

### Significado do selo — decisão do responsável em11/09/2026

O responsável confirmou: **registro ativo aprovado; sem promessa de comprovação de
identidade**. Aprovação pode vir da consulta CFP ou revisão humana conforme os gates
atuais. Não introduzir KYC, prova documental/liveness ou vínculo pessoal não especificado
como requisito novo. Não chamar ausência desse processo de bypass de KYC. A decisão não
remove as guardas contra consulta divergente/ambígua, sobrescrita de campos protegidos ou
controle de acesso; não revoga aprovações nem redefine automaticamente as cortesias.
Desambiguação, validade temporal e precedência de decisões continuam a exigir rastreio.

### Menu, data civil e contagem346

A342-08: o menu mobile passa a usar useAdminDialogLifecycle existente, sem novo trap,
listener Escape ou lock de scroll paralelo. Drawer é dialog; fundo inert; backdrop fora
do Tab. Retorno de foco opt-in escolhe gatilho visível após resize e mantém prioridade
da pilha de diálogos e comportamento padrão dos outros consumidores. Fechar em mudança
de rota/histórico/desktop e descartar estado da rota antiga impede reabertura ao voltar.
Classes/tokens e conteúdo do sidebar preservados. Testes de fonte protegem wiring, mas
não substituem Browser; harness local usa hook real e não simula sessão/API nem o shell.

C24: inscrição é uma data civil, não um instante futuro por ser normalizada ao meio-dia.
Comparar componentes em America/Sao_Paulo e capturar uma referência temporal por chamada;
now opcional permite testes determinísticos sem falsificar relógio global. Manter formatos,
normalização12h-03, limite anual e allowFuture. Nenhum registro existente é regravado,
aprovação/identidade/CFP executado ou contrato HTTP alterado. C17 continua separado.

A345-01: singular nas duas listas administrativas, sem novo helper ou mudança de layout.
Sem env/package/migration/reset; rollback Admin e backend independente. Cinco manifests
sincronizados346 em um único bump. Publicação deve repetir teclado e versões/health/ready.

### Semântica acessível e catálogos347

A342-05: nome estável do campo no expansor e estado alinhado à visibilidade(open&&!disabled),
sem rolelistboxinadequado nem redesenho. Paginação reusa texto sr-only das setas do padrão
AdminPagination e marca página atual. Preservar seleção, callbacks, janela e flagsRHF.
Testes extraem declaraçõesoriginais por AST para não carregar serviços; contratos SSR não
certificam DOM/AX. Browserlocalcomcontrolesreais e repetição autenticada são evidências
separadas. Arquivo de teste com[id] executado diretamente pelo Node evita zerotestes do
runnerglob; contador7confirmado. Não criar framework/componentes paralelos.

D2: ajustar valores dos catálogos existentes sem códigos/shape/status novos. Interpolação,
igualdade e orientação temporal não mudam validação. Não expor instruções/configuração
interna ao usuário; mensagens preservam indisponibilidade e não culpam credenciais.
Trocar termo técnico de exclusão pela informação registro preservado sem prometer apagar
fisicamente, reversibilidade ou política de retenção. Regras Gratuito/Profissional e KYC
ficam fora dessepatch. Sem migração/provider/alteração persistente/env/package.

Documentação: READMEfrontend específico, pnpm e gates homolog/main; Cursor/GitHub e DoD
com cinco manifests/quatro apps. TASK42 preserva histórico e aponta reintroduçãoTASK176,
não autoriza restaurar pipeline antigo. Rollback independente Admin/backend/documentos.

### Rascunho administrativo348 — requisito prévio

Conservar a fundação RHF e limitar keepDirtyValues à sincronização da mesma comunidade,
com assinatura explícita dos dirtyFields. Cancelar precisa resetar estado mesmo com onDone
noop; Salvar usa identidade devolvida pelo endpoint, não o draft bruto. Evitar estado
paralelo/reducer e remounts por referência de dados, que perderiam foco. Nenhuma promessa
de abortar request já enviado ou resolver conflitos multiadministrador. Sem contrato novo,
provider, migration, pacote ou env; rollback exclusivo Admin. Evidência remota de upload
fica separada de testes de estado e Cancelar; seletor nativo não foi controlado por ferramenta.

Proteção348 durante Salvar: impedir edição/Cancelar enquanto a escrita enviada ainda está
pendente, reusando disabled dos controllers. Não simular cancelamento de request ou construir
reducer de mesclagem concorrente. RHF mantém registro/valores; erro libera edição sem reset
bem-sucedido. O bloqueio não se aplica ao simples refetch/upload independente do avatar.

O harness348 de compilação AST fica em admin/scripts, fora das fontes de produto, usando
o diretório de scripts existente. A regra source-safety do runtime permanece intacta;
não há exceção nova para execução dinâmica ou cores na UI. O teste é executado
explicitamente pelo check do Admin, com React/RHF/Zod/controllers reais; dados locais
de transição não comprovam persistência remota, upload ou falha de rede.

O handler RHF é composto dentro do evento submit, não durante render: o callback de
sucesso verifica ref de identidade somente após await. Mantida a regra React de refs,
sem lint-disable e sem ref sendo consumida no render. Check global e build confirmados.

### Cores do tráfego349 — requisito prévio

Associar a cor da paleta existente ao item antes de filtrar segmentos vazios, como nos
donuts de pacientes/psicólogos. Não mudar geometria compartilhada nem contratos dos
callers; opção por cor no item evita índices incompatíveis e lookup quadrático.
Preservar porcentagens/totais e identidades. Sem env/migration/package.


### Universos dos cartões350 — requisito prévio

O contrato já separa posts e replies, cada um com items/total/total_whatsapp_clicks.
O badge deve usar o mesmo grupo que seu cartão, não uma agregação intergrupos implícita.
Corrigir apenas a referência no Admin; não alterar cálculo backend nem somar itens como
fallback, para preservar compatibilidade com respostas antigas (campo ausente =>0).
Teste compila declarações originais e componentes visuais reais, sem substituir APIs,
providers ou autenticação. Sem env/package/migration; rollback Admin independente.


### Avisos acessíveis351 — requisito prévio

Usar as duas props oficiais presentes na versão instalada do Sonner; frontend já reexporta
Toaster sem modificações. Não criar wrapper comum entre aplicações nem substituir o sistema
de toast. Só nome acessível é traduzido: Notificações/Fechar notificação. Atalho e política
de fechamento mantidos. Teste compila apenas o JSX original Toaster de cada layout e usa
Sonner/React reais; providers de negócio não são carregados ou simulados.


### Seguimento353 — requisito prévio

Publicação autoriza criar a relação, mas não revoga o direito do paciente de removê-la.
Conservar repository.unfollow com chave user_id/psychologist_id e transação serializável;
DELETE repetido ou sem vínculo retorna followed=false sem consultar/expor o perfil privado.
Nenhuma alteração do catálogo público, de aprovação ou de sessões. Testes usam somente
PostgreSQL descartável local vazio e registros efêmeros, sem providers/autenticação falsos
ou fixtures permanentes; prova de service/repository não equivale a HTTP autenticado.

353 validado com dez cenários em PostgreSQL real local. Harness manual aceita somente
porta loopback, nome fixo de banco vazio, limpa exclusivamente os IDs criados e verifica
limpeza. Sem env nova: não acrescentar configuração de laboratório ao ambiente publicado.
Não alterar repository nem ampliar leitura de profissional indisponível para remover vínculo.


### Edição parcial354 — requisito prévio

Reutilizar updatedAt existente como comparação otimista no updateMany transacional.
Incremento temporal mínimo de1ms evita que duas gravações deste caminho compartilhem
versão quando o relógio não avança. Em conflito, devolver409 com orientação leiga; nenhuma
relação nem log é gravado. Não exigir token de versão de clientes durante rollout.
Escritas delta preservam campos/relações não alterados, mesmo frente a caminhos legados.
Não promete detectar formulário que já chegou obsoleto antes da leitura no backend ou
SQL externo que não atualize updatedAt; isso exigiria contrato/versionamento posterior.
Reutilizar harness isolado PostgreSQL/imagem imutável, sem testes em ambiente publicado.

354:22contratos e11casosPG aprovados;baseline353 demonstrou6falhas/8. Reaproveitado runner
isolado existente,sem fonte sobreposta/imagem simulada. Campos e relações não alterados
não integram a escrita;null/arrayvazio explícitos preservam intenção de limpar. Sem
HTTP de conflito em homologação,sem nova env/dependência/schema. Buildbackend/Dockeraprovados.


### Agregação de origens355 — requisito prévio

Autor/outros é partição de contagens, não soma de percentuais por origem. Exibir agregado
somente com contagens válidas que expliquem todos os cliques; origem sem breakdown e
zero cliques não introduz lacuna. Se todas as origens omitem a classificação, conservar
a ausência. Usar fonte pública engajamento; nunca proveniência técnica. Não alterar
API/backend,ordenação ou filhos. Componente/formatação existentes e casos locais puros.

355: classificação incompleta observada no dashboard global real; preservar todos os
cliques e filhos sem atribuir o clique do ranking a um ator desconhecido. Contratos12/12,
Browserlocal móvel/desktop e buildAdmin aprovados; sem alteração de formato da API.

### Malha cartográfica356 — decisão prévia

Separar identidade de renderização da identidade cartográfica. mapKey = id + nome,
calculado na biblioteca existente; não editar o JSON cartográfico nem inventar ISO para
geometrias sem identificador. Os consumidores continuam resolvendo por códigos/nomes,
mas associam valores e key React pela identidade interna distinta. Testes com dataset e
componentes reais; a colisão reproduzida localmente não comprova dados afetados em homolog.

356:base de176geometrias preservada,12testes passados,pares móveis/desktop revisados.
QuickCopy listado pelo Builder,mas leitura do recurso recusada por espaço divergente;
fallback de protótipos locais documentado. Zero mudanças territoriais/de negócio/API.

### Contexto de erro357

Utilizar o componente compartilhado AdminQueryErrorState diretamente no erro de catálogos,
com título específico. ErrorState do detalhe continua reservado à falha de carregar o
psicólogo. Nenhuma alteração de refetch, tratamento seguro de erro ou persistência.

### Concorrência de moderação358 — decisão prévia

Reutilizar withSerializableTransaction nos limites de gravação administrativos. Releitura,
elegibilidade e criação pura de before/after pertencem a cada tentativa, sem efeitos externos.
Não basta envolver snapshots pré-carregados; não recomputar históricos/reparar dados antigos.
Conflito retorna erro existente409; decisões deliberadamente revisáveis continuam revisáveis.
Validação isolada usa imagem real/Prisma/PostgreSQL descartável, sem HTTP/provider ou mocks.

358 validada:callbacks puros de serviço recebem registros da tentativa corrente; sem imports
de serviços pelo repository. Conflito de intenção retorna409 existente. Contenção técnica
que excede retries não equivale a decisão válida nem promete sucesso. Noop de revisão não
duplica histórico, mas preserva preenchimento de campos legados nulos sem reabrir evento resolvido.
26cenários PostgreSQL reais e4contratos aprovados; semmigration/env. Rollout tolera apps antigos;
a proteção transacional completa exige backendnovo em todas as réplicas. Não repara passado.


### Ordenação acessível359 — decisão prévia

Adicionar controles de teclado/toque ao fluxo existente, sem substituir arraste e sem
novo endpoint. Um lote local bloqueia ações conflitantes e aguarda todas as gravações,
mesmo em falha. Cada PUT continua individual: não prometer atomicidade entre regras
nem proteção de outro administrador/aba; reconciliar estado real após falha. Preservar
conteúdo/active/title do payload existente. Foco/aviso PT-BR e formulários pendentes
seguem componentes/RHF/controllers já adotados. Sem env/migration/package.

359: manager491linhas; forms/controlador visual/planejamento separados por responsabilidade.
Sem mudança de caller/payload. Refetch compartilha o SLUG da query ativa do pai e usa
throwOnError; renderização normal segue props do pai, sem preferência permanente por
cache separado. Foco one-shot apenas no gesto inicial, nunca recriado depois do await.
20contratos e Browser local/RHF aprovados; sem promessa de ordenação atômica entre
abas,administradores ou navegações que desmontem o Manager.

### Taxa de sessões com ação360 — decisão prévia

Preservar o universo de pageviews já escolhido pelo cálculo vigente. A correção C15
é a interseção de sessões com ações nesse universo, não mudança do denominador para
união ou todas as sessões. O contrato histórico é incompleto sobre o denominador;
esta decisão o explicita sem mudar a base existente. Preservar sessionKey, unavailable,
arredondamento, eventos brutos e outros consumidores de actionSessionKeys. Não usar
clamp100 para encobrir população divergente. Validação pura do helper e buildQuality,
sem provider/DB/HTTP; não atestar ocorrências no ambiente publicado sem evidência.


### Contagens elegíveis361 — decisão prévia

C4-psicólogo: chave ausente nos mapas gerados por consultas bem-sucedidas significa
zero relações elegíveis, não indisponibilidade nem prova de legado sem cobertura.
Usar valueFromMap existente apenas para comentários/salvamentos do mapper de post.
Extrair esse mapper puro do orquestrador para post-publication.ts, mantendo reexport,
tipos e helpers existentes; direção única e testes sem infraestrutura/credenciais.
Nenhuma nova camada genérica ou consulta. Não transformar exceção de query em zero.
Preservar período da coorte de publicações, não acrescentar datas a suas interações.
Uma mudança temporal/um fallback legado exige decisão separada e sinal de cobertura;
não inferir requisitos pelo vazio. Ranking mantém fórmula, com valores corrigidos.
O caminho de paciente usa população temporal distinta e permanece separado na pendência.


### Contagens do paciente362 — decisão prévia

C4-paciente mantém a fonte explícita do bundle:ausência de relações retornadas por
consultas bem-sucedidas vira zero, não contador agregado. O caller utiliza intervalos
e exclui relações próprias; não espelhar a semântica temporal do psicólogo nem unificar
queries. O builder já é puro:alterar apenas2fallbacks, sem extração/helper/infra novos.
Campos restantes e agrupadores/ordenação preservados; contadores históricos não são
corrigidos ou apagados. Testes tipados do builder real não certificam queries ou E2E.
