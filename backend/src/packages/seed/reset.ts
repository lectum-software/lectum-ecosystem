// @ts-nocheck
// Compatibilidade: o reset genérico resolve modelos e relações pela DMMF em tempo de execução.

import { readFileSync } from "node:fs";

import { getDMMF } from "@prisma/internals";
import { toSafeErrorLog } from "@/utils/safe-error-log";

import { prisma } from "../../external/prisma/client";

/** Load DMMF from your schema.prisma */
async function loadDMMF(schemaPath) {
  const schema = readFileSync(schemaPath, "utf-8");
  return getDMMF({ datamodel: schema });
}

/** Build dependency graph between models */
function buildDependencyGraph(models) {
  const graph = {};
  for (const m of models) {
    graph[m.name] = { dependsOn: new Set(), referencedBy: new Set() };
  }
  for (const m of models) {
    for (const f of m.fields) {
      if (f.kind === "object" && !f.isList && f.isRequired) {
        graph[m.name].dependsOn.add(f.type);
        graph[f.type].referencedBy.add(m.name);
      }
    }
  }
  return graph;
}

/** Topological sort */
function topologicalSort(graph) {
  const inDegree = {};
  for (const name of Object.keys(graph)) {
    inDegree[name] = graph[name].dependsOn.size;
  }
  const queue = Object.keys(inDegree).filter((n) => inDegree[n] === 0);
  const sorted = [];
  while (queue.length) {
    const cur = queue.shift();
    sorted.push(cur);
    for (const ref of graph[cur].referencedBy) {
      inDegree[ref]--;
      if (inDegree[ref] === 0) queue.push(ref);
    }
  }
  if (sorted.length < Object.keys(graph).length) {
    console.warn("⚠️ Detected possible dependency cycle—some tables may not be in ideal order.");
    const leftover = Object.keys(graph).filter((n) => !sorted.includes(n));
    return [...sorted, ...leftover];
  }
  return sorted;
}

/**
 * Delete all data, retrying failed models until everything is cleared.
 */
async function clearAllData(dmmf) {
  const models = dmmf.datamodel.models;
  const graph = buildDependencyGraph(models);
  // reverse so we delete dependents before parents
  const deleteOrder = topologicalSort(graph).reverse();

  let toDelete = [...deleteOrder];
  let pass = 1;

  while (toDelete.length > 0) {
    console.log(`\n🔄 Clear pass #${pass}, remaining: ${toDelete.join(", ")}`);
    const failed = [];

    for (const modelName of toDelete) {
      try {
        await prisma[modelName].deleteMany();
        console.log(`  ✅ Cleared ${modelName}`);
      } catch (err) {
        console.warn(`  ⚠️ Failed to clear ${modelName}.`, toSafeErrorLog(err, "SeedResetError"));
        failed.push(modelName);
      }
    }

    // if nothing succeeded on this pass, break to avoid infinite loop
    if (failed.length === toDelete.length) {
      console.error("❌ No progress on deletion—stopping retries. Remaining models:", failed);
      break;
    }

    toDelete = failed;
    pass++;
  }

  if (toDelete.length === 0) {
    console.log("\n✅ All tables cleared successfully!");
  }
}

export async function recreate(seedPath) {
  // 1. Load the DMMF
  console.log("📖 Reading schema and building DMMF...");
  const dmmf = await loadDMMF(seedPath);

  // 2. Clear the database (with retries)
  await clearAllData(dmmf);

  // 3. Rerun your seed generator
  console.log("\n🌱 Reseeding database...");
  const { generateSeedData } = await import("./");
  await generateSeedData(seedPath);

  console.log("\n🎉 Done!");
}
