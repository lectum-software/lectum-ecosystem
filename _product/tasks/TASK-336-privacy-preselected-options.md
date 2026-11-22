# TASK-336 - Opcoes iniciais de preferencias

| Campo | Valor |
| --- | --- |
| Status | Concluida |

Pedido explicito do proprietario em 22/11/2026: iniciar os switches de medicao Meta e associacao de visitas ligados quando nao existe escolha salva. Apenas valores do formulario; abrir ou fechar nao concede consentimento.

- [x] Preselecao inicial sem alterar escolhas salvas ou recusa do servidor.
- [x] Browser local real em 390/1440px: abrir/fechar sem coleta, recusar e recarregar.
- [x] Checks e build aprovados.
- [x] Commit local versionado.

ADR-0701. Referencia visual: painel existente; sem mudanca de layout. Builder indisponivel. Sem novas dependencias, migration ou env. Nenhuma ativacao CAPI ou verificacao IP. Rollback por PR. Publicacao e recebimento do clique de teste pela Meta nao fazem parte desta evidencia local.

Smoke do artefato 0.1.830 contra API local real 127.0.0.1:4140 aprovado em 390 e 1440px: opcoes inicialmente true, abrir/fechar sem escolha persistida nem requisicoes opcionais, desligar/salvar e recarregar conserva false em ambos os switches. Sem overflow horizontal. Captura mobile inspecionada. Build frontend aprovado. Primeiras tentativas em dev excederam timeout; check concorrente com encerramento do dev falhou em arquivos temporarios .next/dev/types removidos. Repeticao sequencial de pnpm check aprovada com exit 0; nenhum gate ignorado.

Validacao final: pnpm check completo, build frontend e smoke do artefato real aprovados. Versao 0.1.830, commit local em homolog. Sem push/deploy nesta task.
