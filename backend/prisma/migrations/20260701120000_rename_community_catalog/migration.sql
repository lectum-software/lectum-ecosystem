-- Atualiza apenas os nomes publicos das comunidades solicitados pelo produto.
-- Slugs, categorias, assets e vinculos existentes permanecem estaveis.

UPDATE "communities"
SET
    "name" = CASE "slug"
        WHEN 'depressao' THEN 'Depressão: Redescobrindo a Vida'
        WHEN 'tdah' THEN 'TDAH: Encontrando seu Ritmo'
        WHEN 'autocuidado-em-pratica' THEN 'Autocuidado em Pequenos Passos'
        ELSE "name"
    END,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" IN ('depressao', 'tdah', 'autocuidado-em-pratica');
