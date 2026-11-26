# ADR-0736 — Descoberta da raiz do adapter no admin

Status: Aceito

## Contexto
O build remoto do admin concluiu o Next, mas falhou no postbuild porque required-server-files.json omite config.repoRoot no formato runtime.

## Decisao
Aplicar ao admin o mesmo tratamento da TASK-368/frontend: validar appDir, usar NEXT_PRIVATE_OUTPUT_TRACE_ROOT quando presente ou a descoberta do proprio Next, e exigir que a raiz contenha o build. Nao desabilitar a limpeza de source maps nem alterar a configuracao de build do provedor.

## Consequencias
Manifests completos e runtime continuam suportados. Testes cobrem monorepo, standalone, raiz explicita e paths invalidos. Nenhuma mudanca funcional de produto ou migracao.
