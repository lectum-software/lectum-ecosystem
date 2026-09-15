# TASK-41: Páginas legais públicas — Termos de Serviço e Política de Privacidade

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-41 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Descoberta pública e governança |
| Status | Blocked |
| Dependências | TASK-39, TASK-40 |
| ADR alvo | ADR-0440 |

## Contexto

A Lectum já possui fundação pública de SEO, sitemap, robots e separação entre rotas públicas e áreas autenticadas. Falta publicar páginas legais públicas para Termos de Serviço e Política de Privacidade, além de linká-las nos fluxos de autenticação/cadastro e superfícies públicas.

Como a Lectum envolve psicólogos, pacientes/interessados, comunidades de saúde mental, pagamentos, notificações, validação profissional e possível tratamento de dados pessoais sensíveis, os textos legais precisam ser tratados como conteúdo de governança, não como copy genérica.

Foram criadas minutas internas v0.1 para revisão do fundador e validação jurídica:

- `_product/legal/termos-de-servico-v0.1.md`;
- `_product/legal/politica-de-privacidade-v0.1.md`;
- `_product/legal/textos-curtos-legais-v0.1.md`.

Essas minutas são base editorial inicial. Elas **não devem ser publicadas com placeholders** e não substituem revisão jurídica. Se faltarem dados reais de responsável legal, CNPJ/CPF, e-mails, data de vigência ou política comercial, a task deve parar e registrar bloqueio em vez de publicar texto incompleto.

Referência visual: não há tela específica de documentos legais no inventário. A implementação deve usar a linguagem visual pública já estabelecida nas tasks de descoberta/SEO e padrões de leitura mobile-first do produto. Antes de implementar, consultar `PROTO-INVENTORY.md`; se Builder/Quick Copy não estiver acessível, registrar a limitação e usar referências locais/padrões já implementados.

Referências normativas para revisão editorial/jurídica:

- LGPD — Lei nº 13.709/2018, versão compilada: `https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm`
- Marco Civil da Internet — Lei nº 12.965/2014: `https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/L12965.htm`
- ANPD — guias e materiais orientativos: `https://www.gov.br/anpd/pt-br`
- CFP/CRP — Código de Ética e normas profissionais vigentes para psicologia mediada por tecnologias digitais.

## Objetivo

Usuários, visitantes, buscadores e IAs conseguem acessar páginas públicas, indexáveis e legíveis de Termos de Serviço e Política de Privacidade da Lectum, com metadados próprios, navegação clara, links nos fluxos relevantes e sem expor áreas privadas.

## Pré-requisitos e bloqueios

- Arquitetura obrigatória em `ARCHITECTURE.md`.
- Política de packages em `PACKAGES.md`.
- `PROTO-INVENTORY.md` consultado antes de UI.
- Minutas em `_product/legal` aprovadas/corrigidas pelo fundador.
- Todos os placeholders legais resolvidos antes de publicar em UI:
  - `[RAZÃO SOCIAL OU NOME DO RESPONSÁVEL]`;
  - `[CNPJ/CPF]`;
  - `[E-MAIL DE SUPORTE]`;
  - `[E-MAIL DE PRIVACIDADE]`;
  - `[ENDEREÇO, SE APLICÁVEL]`;
  - `[DATA DE ATUALIZAÇÃO]`;
  - `[DATA DE VIGÊNCIA]`.
- Confirmar política de idade mínima e uso por adolescentes antes de publicar.
- Confirmar política comercial de assinatura, cancelamento e reembolso antes de publicar.
- Confirmar fornecedores reais relevantes de produção citados ou descritos genericamente.
- Nenhuma credencial externa é necessária.
- Nenhuma alteração de banco é necessária nesta task.
- Não instalar package novo.

Se algum requisito legal/editorial obrigatório estiver ausente, não publicar placeholder nem texto incompleto; registrar bloqueio.

## Escopo frontend

- Criar rota pública `/termos-de-servico`.
- Criar rota pública `/politica-de-privacidade`.
- Implementar páginas server-side com conteúdo estático aprovado.
- Criar/reutilizar template editorial público para documentos legais, preferencialmente em:
  - `frontend/src/templates/public/legal-document.tsx`, ou equivalente compatível com padrões existentes.
- Adicionar metadata específica:
  - `title`;
  - `description`;
  - `alternates.canonical`;
  - `robots` indexável.
- Incluir as rotas em `PUBLIC_INDEXABLE_ROUTES`/`sitemap.xml` com prioridade baixa.
- Adicionar links para Termos e Privacidade:
  - landing pública;
  - login;
  - cadastro de paciente;
  - cadastro de psicólogo;
  - pontos de aceite existentes, sem criar formulário paralelo.
- Usar os textos curtos aprovados de `_product/legal/textos-curtos-legais-v0.1.md`.
- Garantir navegação mobile-first:
  - índice interno;
  - seções com `h2`;
  - leitura confortável em ~390px;
  - largura máxima em desktop;
  - links de voltar/ir para a outra página legal.

## Escopo backend

- Sem alteração backend.
- Sem endpoint novo.
- Sem modelo Prisma/migration.
- Sem registro de aceite nesta task.

## Fora do escopo

- Registro auditável de aceite dos termos.
- Versionamento de documentos legais em banco.
- Bloqueio de usuário até novo aceite quando o documento mudar.
- Banner/central de preferências de cookies não essenciais.
- Fluxo específico de direitos do titular no produto.
- Alteração de política comercial real.
- Revisão jurídica final.
- Qualquer mock, dado fake permanente ou endpoint simulado.

Esses itens podem virar tasks futuras após decisão de produto/jurídico.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`, seções "Frontend", "Regras de UI", "Estado, sessão e guards" e "Anti-recriação".
- `PACKAGES.md`, política de dependências.
- `PROTO-INVENTORY.md`, referência visual ativa.
- `_product/legal/*.md`, minutas editoriais aprovadas antes da publicação.
- `_product/PRIVACY-NOTES.md`, texto já aprovado sobre localização aproximada por IP.

Frontend esperado:

- `frontend/src/app/termos-de-servico/page.tsx`
- `frontend/src/app/termos-de-servico/logic.tsx`
- `frontend/src/app/politica-de-privacidade/page.tsx`
- `frontend/src/app/politica-de-privacidade/logic.tsx`
- `frontend/src/templates/public/legal-document.tsx` ou componente equivalente, desde que não crie design system paralelo.
- Reutilizar `PublicTemplate` quando aplicável.
- Reutilizar componentes existentes de UI quando necessário.
- Não usar `<img>`; se algum asset visual for necessário, usar `Image` de `next/image`.
- Não criar API client, caller, query key, store ou endpoint.
- Não criar formulário; apenas links e texto.
- Não renderizar placeholders legais em produção.

Packages usados:

- Apenas pacotes já instalados (`next`, `react`, `lucide-react` se necessário).
- Nenhum package novo.

Regras anti-recriação:

- Procurar padrões atuais em `frontend/src/templates/public`, landing pública, páginas públicas de psicólogos/comunidade e auth antes de criar componentes novos.
- Se criar template editorial novo, justificar no ADR como reaproveitamento para documentos longos.
- Não criar design system paralelo.
- Não criar estrutura de CMS ou carregamento dinâmico sem necessidade.

Regras de UI obrigatórias:

- **Mobile-first**: layout base ~390px, progredindo para largura máxima confortável em desktop.
- **Nunca usar `<img>`**; sempre `Image` de `next/image` quando houver imagem.
- **Tema claro/escuro/sistema**: cores por tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `text-subtle`, `border-border`, `text-primary` etc.), sem cores hardcoded.
- Sem formulário; regra de React Hook Form/Zod/controllers não se aplica.

## Critérios de aceite

- [ ] `/termos-de-servico` renderiza página pública mobile-first com Termos de Serviço aprovados, sem placeholders.
- [ ] `/politica-de-privacidade` renderiza página pública mobile-first com Política de Privacidade aprovada, sem placeholders.
- [ ] Ambas as páginas têm metadata própria, canonical e são indexáveis.
- [ ] Ambas as páginas aparecem no `sitemap.xml` com prioridade compatível com páginas legais.
- [ ] Landing pública, login e cadastros linkam para Termos e Privacidade.
- [ ] Textos curtos de aceite foram aplicados sem criar formulário paralelo.
- [ ] Conteúdo inclui data de atualização/vigência e versão do documento.
- [ ] Conteúdo deixa claro que a Lectum não é serviço de emergência e não substitui atendimento profissional.
- [ ] Política de Privacidade cobre dados sensíveis, localização aproximada por IP, cookies, notificações, pagamentos, validação profissional, direitos LGPD e canal de privacidade.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [ ] Não houve instalação de package novo.
- [ ] Builder/Quick Copy foi usado quando disponível, ou a limitação foi registrada e padrões/imagens locais foram citados.
- [ ] `pnpm --dir frontend check` foi executado sem erros.
- [ ] `pnpm --dir frontend build` foi executado sem erros.
- [ ] Browser local validou `/termos-de-servico`, `/politica-de-privacidade`, `/sitemap.xml`, login e cadastros.
- [ ] ADR-0440 atualizado após a aprovação jurídica.
- [ ] Critérios de aceite marcados `[x]` ao concluir.
- [ ] Commit próprio criado e `git push` executado; se falhar por credenciais/rede/permissão, registrar bloqueio explicitamente.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local:
  - `http://localhost:3000/termos-de-servico`
  - `http://localhost:3000/politica-de-privacidade`
  - `http://localhost:3000/sitemap.xml`
  - `http://localhost:3000/auth/login`
  - cadastros de paciente e psicólogo

## Notas de execução

- Esta task publica documentos legais estáticos; não cria aceite auditável.
- Se o fundador ainda não tiver aprovado as minutas ou preenchido dados reais, parar e registrar bloqueio.
- Se houver decisão de exigir aceite versionado, criar task futura com backend, migration e registro por usuário.
- Se houver cookies não essenciais/marketing/analytics externos em produção, avaliar task futura para banner e central de preferências.
- Se houver mudança em dados de saúde, IA, recomendação clínica, pagamento ou comunicação profissional, revisar Política de Privacidade antes de publicar.
