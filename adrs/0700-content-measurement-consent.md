# ADR-0700 — Consentimento antes de medir conteudo

O smoke produtivo da versao 0.1.828 encontrou seletores opcionais inicialmente marcados e chamadas content-video-watch apos recusa. O endpoint existente pode persistir sessao e retencao; nao e apenas diagnostico de reproducao.

Preferencias novas iniciam desmarcadas. Escolhas vigentes continuam visiveis e Aceitar cookies permanece uma acao afirmativa explicita. Os hooks de video e atencao reutilizam a mesma fronteira de consentimento das visualizacoes de pagina, inclusive confirmacao de conta. Verificam novamente o consentimento local antes de gerar identificadores, acumular ou enviar dados. A troca de permissao desliga observadores e descarta intervalos recusados, inclusive no cleanup/keepalive.

Nao ha migracao, dependencia, alteracao contratual ou ativacao Meta. Esta correcao governa o cliente atualizado; nao acrescenta autenticacao de consentimento aos endpoints antigos nem remove dados anteriores. A entrega externa continua desligada. Rollback por PR restaura o comportamento anterior e exige manter a medicao desativada.
