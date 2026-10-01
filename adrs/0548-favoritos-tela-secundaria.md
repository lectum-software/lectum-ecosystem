# ADR-0548 - Favoritos como tela secundaria do Perfil

Data: 2026-10-01. Status: Aceito. TASK-204.

## Contexto

Favoritos foi movido para o Perfil. O usuario solicitou retirar sua barra
inferior e adicionar apenas uma seta discreta como no hero do perfil, sem
juntar a seta ao titulo ou alterar o cabecalho atual.

## Decisao

PsychologistRelationList desativa showMobileNavigation no PrivateTemplate.
Reutilizar a capacidade existente evita alterar a politica global de rotas,
a sidebar desktop ou o composer das abas principais.

O cabecalho existente recebe Link absoluto no canto superior esquerdo, com
ArrowLeft, circulo neutro, foco visivel, title e aria-label. Nao alterar titulo,
descricao, icone de Favoritos ou espacamentos. O destino explicito /app/perfil
funciona tambem com acesso direto e filtros no historico, sem router.back.

Estado sem sessao usa restrictedAreaBackLink existente para nao deixar o
visitante sem retorno quando a barra inferior esta ausente. Sem alterar os
componentes compartilhados de header ou autenticacao.

## Consequencias

Layout normal e estados de carregamento/erro mantem o cabecalho. Remover a barra
tambem remove seu padding reservado pela logica existente do template. Risco
restrito a Favoritos; validar mobile e desktop, preservando filtros e dados.
Sem contrato novo, dependencia, env ou migration. Rollback por reversao.
