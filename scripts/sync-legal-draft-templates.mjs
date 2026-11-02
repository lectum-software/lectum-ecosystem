import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const templates = Object.fromEntries(
	[
		["terms", "termos-de-servico-v0.3.md", "Termos de Uso da Lectum"],
		[
			"privacy",
			"politica-de-privacidade-v0.3.md",
			"Política de Privacidade da Lectum",
		],
	].map(([kind, file, title]) => [
		kind,
		{
			title,
			body: readFileSync(new URL(`_product/legal/${file}`, root), "utf8")
				.replace(/\r\n?/g, "\n")
				.trim(),
			change_summary:
				"Minuta editorial v0.3: dados da Lectum, públicos, assinatura e exclusão. Revisão pendente; não publicar.",
		},
	]),
);
const source = `// Gerado por scripts/sync-legal-draft-templates.mjs. Minutas locais, sem publicação.
// Preserva avisos e pendências; importar não registra aceite.
export const LEGAL_DRAFT_TEMPLATES: Record<
  "terms" | "privacy",
  { title: string; body: string; change_summary: string }
> = ${JSON.stringify(templates, null, 2)};
`;
const target = new URL("admin/src/modules/legal/draft-templates.ts", root);
if (process.argv.includes("--check")) {
	// Compare data rather than formatter-dependent TypeScript whitespace.
	const actual = readFileSync(target, "utf8");
	for (const value of Object.values(templates)) {
		if (!actual.includes(JSON.stringify(value.body))) {
			throw new Error(
				"Legal draft templates are stale; run the synchronization script.",
			);
		}
	}
} else {
	writeFileSync(target, source);
}
