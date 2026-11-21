# ADR-0699 — Diagnostico administrativo de proxies sem dados pessoais

A cadeia Cloudflare/Traefik foi configurada, mas disponibilidade da API nao comprova o IP resolvido no backend. Expor uma consulta GET sob adminAuth existente, com no-store e somente validade, quantidade e igualdade de valores. Rejeitar IPs invalidos e IPv6 com escopo, limitar o parsing dos headers e nunca retornar enderecos ou hashes.

Uma igualdade com CF-Connecting-IP nao prova autenticidade. A validacao controlada e a revisao dos caminhos de entrada continuam necessarias. O endpoint nao modifica confianca, nao escreve banco e nao envia dados a terceiros. Sua publicacao fica separada das mudancas de marketing ainda locais.