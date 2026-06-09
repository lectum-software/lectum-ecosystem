# TASK-35: Ajustes mobile de regressão em login, perfil e descoberta

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-35 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Qualidade mobile |
| Status | Completed |
| Dependências | TASK-12, TASK-13, TASK-14, TASK-15, TASK-18A, TASK-20 |
| ADR alvo | ADR-0035 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`

## Referências visuais

| Imagem local | Uso |
|---|---|
| `_product/proto/Psicólogos.jpg` | Lista e card de psicólogos |
| `_product/proto/Favoritos.jpg` | Cabeçalho da lista de favoritos |
| `_product/proto/Meus Analytics - Psicólogo.jpg` | Cards e filtro de analytics |
| `_product/proto/Perfil Profissional - Sobre.jpg` | Perfil profissional público |
| `c:/Users/tulio/Downloads/Perfil Profissional - Sobre.jpg` | Referência anexada pelo usuário para o novo layout |

Builder/Quick Copy não ficou exposto como ferramenta MCP direta nesta execução; foram usadas imagens locais/exportadas e a imagem anexada pelo usuário como fallback auditável.

## Objetivo

Corrigir regressões relatadas pelo usuário em fluxo de autenticação/cadastro, preservação de avatar e refinamento mobile-first das telas de perfil, analytics, descoberta e favoritos.

## Escopo

- Redirecionamento pós-login deve enviar usuários já onboardados para `/app/community`, sem mandar psicólogos publicados de volta para planos.
- Login Google não deve sobrescrever foto profissional salva quando o usuário já possui avatar persistido.
- Ícone de `Ver meu perfil público` no menu de perfil deve ser um olho.
- A ação superior da edição do perfil profissional deve ser um olho para abrir o perfil público; salvar continua no CTA inferior e retorna para `/app/profile`.
- Analytics deve caber no viewport mobile e permitir período personalizado por data inicial/final.
- Lista de psicólogos deve remover contador textual, opção `Somente verificados`, scrollbar do carrossel de temas e reduzir vídeo do card para 16:9.
- Favoritos deve exibir quantidade na mesma linha do título e alinhar seta com `Minha lista`.
- Perfil profissional público deve seguir a imagem anexada e a seta deve voltar para a tela anterior.
- Ajustar escala textual mobile global para reduzir tamanhos grandes, com referência de densidade semelhante ao Instagram.

## Fora do escopo

- Criar eventos novos de analytics ou simular métricas inexistentes.
- Alterar schema/migrations de banco.
- Instalar pacotes.
- Usar mocks, dados fake ou endpoints simulados.

## Critérios de aceite

- [x] Referências visuais consultadas via imagens locais/anexo; limitação de Builder/Quick Copy registrada.
- [x] Pós-login usa comunidade como home para usuários já onboardados, mantendo etapas obrigatórias para cadastros incompletos.
- [x] Login Google preserva avatar já persistido.
- [x] Menu de perfil e topo da edição usam ícone de olho para perfil público.
- [x] Salvamento da edição profissional retorna para `/app/profile`.
- [x] Analytics mobile cabe na largura do viewport e aceita período customizado com início/fim.
- [x] Lista de psicólogos remove contador, `Somente verificados` e scrollbar visível dos chips; vídeo do card fica 16:9.
- [x] Favoritos alinha quantidade com `Favoritos` e seta com `Minha lista`.
- [x] Perfil profissional público segue o layout anexo e a seta usa histórico do navegador.
- [x] Ajuste global de fonte mobile aplicado sem package novo.
- [x] Nenhum mock, seed ou dado fake foi usado.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes executados sem erro.
- [x] Commit criado com mensagem convencional.

## Validação executada

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/HTTP local nas rotas afetadas, com a limitação de que rotas privadas autenticadas redirecionam sem token real disponível ao agente.
