# TASK-209 - Rotulo Minhas publicacoes no perfil

Dependencia: TASK-208 (Completed). Status: Completed.

## Escopo

Substituir os rotulos de posts/respostas/comentarios do menu do perfil por
"Minhas publicacoes", tanto para pacientes quanto para psicologos. Preservar
icone, ordem, destino e titulos da tela de destino. Apenas copy no frontend.

Referencia: captura WhatsApp Image 2026-10-02 at 07.54.48.jpeg enviada pelo
usuario. Arquitetura, inventario, packages e guia local de navegacao do Next
consultados. Sem nova tela ou dependencia; Builder nao necessario para copy.
Manter o layout mobile-first existente (~390px).

## Criterios de aceite

- [x] Mesmo rotulo no menu para ambos os papeis.
- [x] Link /app/publicacoes/minhas, icone e ordem preservados.
- [x] Teste de regressao e frontend check/build aprovados.

## Validacao

Nove testes direcionados aprovados, incluindo contrato do rotulo unico para
ambos os papeis e preservacao do destino. Frontend check completo e build
otimizado aprovados em 0.1.544; um skip preexistente de symlink no Windows.
Guards de versao, tasks, encoding, segredos e source-safety aprovados.

Servidor local iniciado em localhost:3004. Ferramenta de navegador falhou
antes de conectar (kernel assets/path ausente), inclusive apos reiniciar a
sessao. Smoke visual autenticado indisponivel; nao foram simuladas contas
ou respostas. Resultado do deploy sera registrado no relatorio externo
outputs/minhas-publicacoes-0544.md.

## Deploy

Homologacao primeiro; sem autorizacao de producao neste pedido. Sem backend,
migration, env nova ou acao manual. Rollback por reversao do texto em nova
revisao. ADR dispensado: sem decisao arquitetural, de dominio ou de fluxo.
