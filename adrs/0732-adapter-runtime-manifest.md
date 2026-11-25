# ADR-0732 - Raiz do adapter em manifestos runtime

O Next 16.4.5 pode filtrar required-server-files.json quando runtimeServerDeploymentId
esta ativo, removendo repoRoot. A limpeza de source maps nao pode depender da sua presenca.

Quando ausente, validar appDir contra o build e reutilizar a descoberta do proprio Next:
NEXT_PRIVATE_OUTPUT_TRACE_ROOT ou findRootDirAndLockFiles. Nao inferir raiz pelo cwd.
Rejeitar raiz invalida ou que nao contenha o build. Preservar validacao de filePathMap,
hashes, dependencias externas e verificacao final de ausencia de source maps.

Trade-off: dependencia interna da versao fixada de Next, coberta por testes de contrato.
Nao desativar o modo runtime nem as protecoes para contornar o erro.
