# Inventário Visual Builder/Proto

Este documento substitui o inventário Figma como referência visual ativa.

## Fonte visual ativa

- Builder Quick Copy: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`
- Imagens exportadas: `_product/proto`
- Total de arquivos JPEG: 63
- Total de telas de produto: 61
- Asset isolado: 1 ícone `post_add_24dp_64748B_FILL0_wght400_GRAD0_opsz24 1.jpg`
- Referências complementares de produto: 1 PNG gerado/aprovado em conversa para compartilhamento social (`_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`) e 1 JPEG de referência de preview WhatsApp para vídeo vertical (`_product/proto/WhatsApp preview video vertical Open Graph referencia.jpeg`).
- Referência complementar do painel Admin: 19 PNGs enviados em conversa e salvos em `_product/proto/admin` (Dashboard, Tráfego, Comunidades, Psicólogos, Pacientes, Financeiro, Notificações e Configurações).

As imagens e o Builder MCP são referência de produto, layout, estados, hierarquia visual e nomenclatura. Elas não definem a arquitetura final, qualidade final de código, contratos de API nem componentes finais.

## Estado do Builder MCP

Configuração criada:

- `.mcp.json`
- `.vscode/mcp.json`
- `.cursor/mcp.json`
- `.codex/config.toml`
- `.builderignore`
- `.builderrules`
- `frontend/.builderignore`
- `frontend/.builder/rules/lectum-frontend.mdc`

Validação local em 2026-06-03:

- `node --version`: `v24.15.0`
- `npx "@builder.io/dev-tools@1.79.0" --help`: versão local auditada e fixada em 08/08/2026.
- `npx "@builder.io/dev-tools@1.79.0" code --help`: OK
- `npx "@builder.io/dev-tools@1.79.0" auth status`: autenticado no espaço `Lectum`

Validação do Quick Copy:

- Comando executado em diretório temporário fora do projeto:

```bash
npx "@builder.io/dev-tools@1.79.0" code \
  --url vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a \
  --cwd /tmp/lectum-builder-check-14HnQJ \
  --mode exact \
  --prompt "Access validation only..."
```

Resultado:

- O Builder acessou a camada virtual do Quick Copy.
- Foram listados 62 artefatos virtuais `figma-design-frame-*.html`.
- O prefixo `figma-design-frame-*` é apenas o nome preservado pelo Builder para os artefatos virtuais exportados. Ele não significa que Figma voltou a ser fonte ativa da execução.
- Amostras lidas com sucesso:
  - `figma-design-frame-1-Editar-Perfil---Psic-logo.html`;
  - `figma-design-frame-55-Login.html`;
  - `figma-design-frame-62-post-add-24dp-64748B-FILL0-wght400-GRAD0-opsz24-1.html`.
- O artefato temporário gerado foi apenas `/tmp/lectum-builder-check-14HnQJ/README.md`; nenhum arquivo do projeto foi alterado pelo teste.

Observação:

- O servidor `npx "@builder.io/dev-tools@1.79.0" mcp` sobe em stdio, mas não respondeu ao handshake manual `initialize/tools/list` feito por script local. Na prática, o acesso ao Quick Copy e ao código virtual foi confirmado pelo fluxo oficial `builder.io code`.

Uso controlado do CLI:

```bash
cd frontend
npx "@builder.io/dev-tools@1.79.0" code --url vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a --cwd .
```

O comando acima não deve ser usado como geração final automática. Quando usado, deve ser com prompt pequeno, depois de ler `ARCHITECTURE.md`, `PACKAGES.md`, `.builderignore` e `frontend/.builder/rules/lectum-frontend.mdc`.

## Regras de uso

- Use Builder/Quick Copy para entender a tela, não para aceitar arquitetura gerada.
- Use as imagens como referência auditável e como fallback quando Builder/Quick Copy não estiver acessível no ambiente.
- Não implemente tela por inferência sem citar os arquivos de imagem usados.
- Não copie assets temporários ou código gerado sem revisão.
- Não crie design system paralelo.
- Não crie API client, store, guard, auth flow ou mock paralelo.
- Toda tela precisa mapear rota, estados, chamadas reais e validação local.

## Inventário por jornada

| Jornada | Tela / asset | Arquivo | Dimensão | Task sugerida |
|---|---|---|---:|---|
| Auth | Seleção de Perfil | `_product/proto/Seleção de Perfil.jpg` | 390x746 | TASK-04 |
| Auth | Login | `_product/proto/Login.jpg` | 390x822 | TASK-04 |
| Auth | Verificação de E-mail com Código | `_product/proto/Verificação de E-mail com Código.jpg` | 390x725 | TASK-06 |
| Auth | Confirmação de Código - Versão Moderna | `_product/proto/Confirmação de Código - Versão Moderna.jpg` | 390x718 | TASK-06 |
| Auth | Recuperar Senha - Inserir Email | `_product/proto/Recuperar Senha - Inserir Email.jpg` | 390x656 | TASK-05 |
| Auth | Recuperar Senha - Link Enviado | `_product/proto/Recuperar Senha - Link Enviado.jpg` | 390x672 | TASK-05 |
| Auth | Recuperar Senha - Criar Nova Senha | `_product/proto/Recuperar Senha - Criar Nova Senha.jpg` | 390x905 | TASK-05 |
| Paciente | Cadastro de Paciente | `_product/proto/Cadastro de Paciente.jpg` | 390x884 | TASK-07 |
| Paciente | Boas-vindas Paciente - 1 | `_product/proto/Boas-vindas Paciente - 1.jpg` | 390x884 | TASK-08 |
| Paciente | Boas-vindas Paciente - 2 | `_product/proto/Boas-vindas Paciente - 2.jpg` | 390x884 | TASK-08 |
| Paciente | Boas-vindas Paciente - 3 | `_product/proto/Boas-vindas Paciente - 3.jpg` | 392x884 | TASK-08 |
| Psicólogo onboarding | Cadastro de Psicólogo | `_product/proto/Cadastro de Psicólogo.jpg` | 398x978 | TASK-09 |
| Psicólogo onboarding | Verificação de CPF - Consulta CFP | `_product/proto/Verificação de CPF - Consulta CFP.jpg` | 390x884 | TASK-10 |
| Psicólogo onboarding | Carregando Consulta CFP | `_product/proto/Carregando Consulta CFP.jpg` | 390x884 | TASK-10 |
| Psicólogo onboarding | Resultado CFP - Variação em Cards | `_product/proto/Resultado CFP - Variação em Cards.jpg` | 390x926 | TASK-10 |
| Psicólogo onboarding | Resultado CFP - Não Encontrado | `_product/proto/Resultado CFP - Não Encontrado.jpg` | 390x884 | TASK-10 |
| Psicólogo onboarding | Confirmação de Envio de CRP - Layout Ajustado | `_product/proto/Confirmação de Envio de CRP - Layout Ajustado.jpg` | 466x960 | TASK-11 |
| Psicólogo onboarding | Confirmação de Envio de CRP - Layout Ajustado-1 | `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-1.jpg` | 466x960 | TASK-11 |
| Psicólogo onboarding | Confirmação de Envio de CRP - Layout Ajustado-2 | `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-2.jpg` | 466x960 | TASK-11 |
| Psicólogo onboarding | Confirmação de Envio de CRP - Layout Ajustado-3 | `_product/proto/Confirmação de Envio de CRP - Layout Ajustado-3.jpg` | 466x960 | TASK-11 |
| Descoberta | Psicólogos | `_product/proto/Psicólogos.jpg` | 390x1380 | TASK-13 |
| Descoberta | Filtros de Psicólogos - Serviços Expandidos | `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg` | 390x1574 | TASK-13 |
| Descoberta | Favoritos | `_product/proto/Favoritos.jpg` | 390x1158 | TASK-14 |
| Descoberta | Seguindo | `_product/proto/Seguindo.jpg` | 390x1318 | TASK-14 |
| Perfil profissional | Perfil Profissional - Sobre | `_product/proto/Perfil Profissional - Sobre.jpg` | 390x2466 | TASK-15 |
| Perfil profissional | Perfil Profissional - Publicações | `_product/proto/Perfil Profissional - Publicações.jpg` | 391x2254 | TASK-15 |
| Perfil profissional | Perfil Profissional - Avaliações | `_product/proto/Perfil Profissional - Avaliações.jpg` | 390x1598 | TASK-15 |
| Perfil profissional | Confirmação de WhatsApp - Inserir Número | `_product/proto/Confirmação de WhatsApp - Inserir Número.jpg` | 430x901 | TASK-16 |
| Avaliações | Avaliar do Psicólogo | `_product/proto/Avaliar do Psicólogo.jpg` | 430x1014 | TASK-17 |
| Avaliações | Confirmação de Avaliação | `_product/proto/Confirmação de Avaliação.jpg` | 390x1006 | TASK-17 |
| Avaliações | Avaliações Feitas - Paciente | `_product/proto/Avaliações Feitas - Paciente.jpg` | 390x1056 | TASK-17 |
| Psicólogo privado | Perfil - Psicólogo | `_product/proto/Perfil - Psicólogo.jpg` | 430x1254 | TASK-18 |
| Psicólogo privado | Editar Perfil - Psicólogo | `_product/proto/Editar Perfil - Psicólogo.jpg` | 394x4078 | TASK-18 |
| Psicólogo privado | Modal de Atualização de Perfil do Psicólogo | `_product/proto/Modal de Atualização de Perfil do Psicólogo.jpg` | 430x925 | TASK-18 |
| Psicólogo privado | Minhas Avaliações - Psicólogo | `_product/proto/Minhas Avaliações - Psicólogo.jpg` | 390x1506 | TASK-19 |
| Psicólogo privado | Meus Analytics - Psicólogo | `_product/proto/Meus Analytics - Psicólogo.jpg` | 390x1284 | TASK-20 |
| Paciente privado | Perfil do paciente | `_product/proto/Perfil do paciente.jpg` | 430x1009 | TASK-21 |
| Paciente privado | Editar Perfil - Paciente | `_product/proto/Editar Perfil - Paciente.jpg` | 394x907 | TASK-21 |
| Comunidades | Explorar Comunidades | `_product/proto/Explorar Comunidades.jpg` | 390x1672 | TASK-22 |
| Comunidades | Sugerir Comunidade | `_product/proto/Sugerir Comunidade.jpg` | 414x1126 | TASK-22 |
| Comunidades | Confirmação de Sugestão de Comunidade | `_product/proto/Confirmação de Sugestão de Comunidade.jpg` | 390x971 | TASK-22 |
| Comunidades | Feed Comunidade | `_product/proto/Feed Comunidade.jpg` | 414x2525 | TASK-23 |
| Comunidades | Criar Nova Postagem - Pacientes | `_product/proto/Criar Nova Postagem - Pacientes.jpg` | 394x886 | TASK-24 |
| Comunidades | Criar Nova Postagem - Psicólogo | `_product/proto/Criar Nova Postagem - Psicólogo.jpg` | 394x998 | TASK-24 |
| Comunidades | Confirmação de Postagem | `_product/proto/Confirmação de Postagem.jpg` | 390x997 | TASK-24 |
| Comunidades | Dentro da Comunidade | `_product/proto/Dentro da Comunidade.jpg` | 414x1763 | TASK-25 |
| Comunidades | Dentro do Post | `_product/proto/Dentro do Post.jpg` | 394x2990 | TASK-26 |
| Comunidades | Top 5 Mentores da comunidade | `_product/proto/Top 5 Mentores da comunidade.jpg` | 390x1160 | TASK-27 |
| Posts | Meus Posts - Paciente | `_product/proto/Meus Posts - Paciente.jpg` | 414x1438 | TASK-28 |
| Posts | Meus Posts - Psicólogo | `_product/proto/Meus Posts - Psicólogo.jpg` | 394x1593 | TASK-28 |
| Posts | Posts Salvos | `_product/proto/Posts Salvos.jpg` | 390x1784 | TASK-28 |
| Posts | Compartilhamento Lectum - vídeo-resposta stories referência | `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png` | 941x1672 | TASK-42 |
| Posts | Preview WhatsApp para vídeo vertical Open Graph | `_product/proto/WhatsApp preview video vertical Open Graph referencia.jpeg` | 941x1280 | TASK-143 |
| Conta | Notificações | `_product/proto/Notificações.jpg` | 414x1317 | TASK-29A |
| Conta | Configurações de Notificações | `_product/proto/Configurações de Notificações.jpg` | 390x1099 | TASK-29A |
| Conta | Configurações de Conta - Login Google | `_product/proto/Configurações de Conta - Login Google.jpg` | 390x884 | TASK-30 |
| Conta | Editar E-mail e Senha | `_product/proto/Editar E-mail e Senha.jpg` | 390x965 | TASK-30 |
| Assinatura | Planos de Assinatura | `_product/proto/Planos de Assinatura.jpg` | 390x2058 | TASK-31 |
| Assinatura | Finalizar Assinatura - Psicólogo | `_product/proto/Finalizar Assinatura - Psicólogo.jpg` | 390x884 | TASK-32 |
| Assinatura | Endereço de Faturamento - Layout Ajustado | `_product/proto/Endereço de Faturamento - Layout Ajustado.jpg` | 430x1089 | TASK-32 |
| Assinatura | Minhas Assinatura - Psicólogo | `_product/proto/Minhas Assinatura - Psicólogo.jpg` | 430x924 | TASK-33 |
| Assinatura | Alterar cartão de crédito | `_product/proto/Alterar cartão de crédito.jpg` | 466x1218 | TASK-33 |
| Assinatura | Cartão Alterado com Sucesso | `_product/proto/Cartão Alterado com Sucesso.jpg` | 414x827 | TASK-33 |
| Admin | Dashboard administrativo | `_product/proto/admin/Dashboard.png` | 1536x1024 | TASK-48 |
| Admin | Tráfego administrativo | `_product/proto/admin/Tráfego.png` | 1024x1535 | TASK-50 |
| Admin | Comunidades - Dashboard | `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` | 1122x1402 | TASK-51 |
| Admin | Comunidades - Detalhes | `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` | 1536x1024 | TASK-52 |
| Admin | Psicólogos - Dashboard | `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` | 1254x1254 | TASK-53 |
| Admin | Psicólogos - Lista | `_product/proto/admin/Psicólogos/Psicólogos- Lista.png` | 1536x1024 | TASK-54 |
| Admin | Psicólogo detalhe - Geral | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png` | 1536x1024 | TASK-55 |
| Admin | Psicólogo detalhe - Perfil e Cadastro | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png` | 1536x1024 | TASK-55 |
| Admin | Psicólogo detalhe - Plano e pagamentos | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png` | 1536x1024 | TASK-56 |
| Admin | Psicólogo detalhe - Estatísticas | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` | 1536x1024 | TASK-57 |
| Admin | Psicólogo detalhe - Publicações | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png` | 1536x1024 | TASK-57 |
| Admin | Psicólogo detalhe - Avaliações | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Avaliações.png` | 1536x1024 | TASK-58 |
| Admin | Psicólogo detalhe - Denúncias | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Denúncias.png` | 1536x1024 | TASK-58 |
| Admin | Psicólogo detalhe - Atividades | `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png` | 1536x1024 | TASK-59 |
| Admin | Pacientes - Dashboard | `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` | 1024x1536 | TASK-60 |
| Admin | Pacientes - Detalhes | `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` | 1024x1536 | TASK-61 |
| Admin | Financeiro | `_product/proto/admin/Financeiro.png` | 1024x1536 | TASK-62 |
| Admin | Notificações | `_product/proto/admin/Notificações.png` | 1024x1536 | TASK-64 |
| Admin | Configurações | `_product/proto/admin/Configurações.png` | 1024x1536 | TASK-65 |
| Asset | Ícone post add | `_product/proto/post_add_24dp_64748B_FILL0_wght400_GRAD0_opsz24 1.jpg` | 24x24 | TASK-24 |
