import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tasksDirectory = path.join(repositoryRoot, "_product", "tasks");
const readmePath = path.join(tasksDirectory, "README.md");
const readme = readFileSync(readmePath, "utf8");
const rowPattern =
  /^\|\s*([0-9]+[a-z]?)\s*\|\s*\[TASK-([0-9]+[a-z]?)\s+-\s+[^\]]+\]\((TASK-[^)]+\.md)\)\s*\|\s*([^|]+?)\s*\|/gimu;
const taskStatusPattern = /^\|\s*Status\s*\|\s*([^|]+?)\s*\|/imu;
const failures = [];
const rows = [];

for (const match of readme.matchAll(rowPattern)) {
  const [, rowId, labelId, filename, rawStatus] = match;
  const normalizedRowId = rowId.toUpperCase();
  const normalizedLabelId = labelId.toUpperCase();
  const filenameId = filename.match(/^TASK-([0-9]+[a-z]?)-/iu)?.[1]?.toUpperCase();

  if (normalizedRowId !== normalizedLabelId || normalizedRowId !== filenameId) {
    failures.push(
      `README.md: identificadores divergentes na linha de ${filename} (${rowId}/${labelId}/${filenameId ?? "ausente"}).`,
    );
  }

  rows.push({ filename, id: normalizedRowId, status: rawStatus.trim() });
}

const taskFiles = readdirSync(tasksDirectory)
  .filter((filename) => /^TASK-[0-9]+[a-z]?-.*\.md$/iu.test(filename))
  .sort((left, right) => left.localeCompare(right, "pt-BR"));
const rowFiles = new Map();
const rowIds = new Map();

for (const row of rows) {
  rowFiles.set(row.filename, (rowFiles.get(row.filename) ?? 0) + 1);
  rowIds.set(row.id, (rowIds.get(row.id) ?? 0) + 1);

  const taskPath = path.join(tasksDirectory, row.filename);
  if (!taskFiles.includes(row.filename)) {
    failures.push(`README.md: task inexistente ${row.filename}.`);
    continue;
  }

  const taskContent = readFileSync(taskPath, "utf8");
  const taskStatus = taskContent.match(taskStatusPattern)?.[1]?.trim();
  if (taskStatus && taskStatus !== row.status) {
    failures.push(
      `${row.filename}: status "${taskStatus}" diverge do README.md ("${row.status}").`,
    );
  }
}

for (const filename of taskFiles) {
  const occurrences = rowFiles.get(filename) ?? 0;
  if (occurrences !== 1) {
    failures.push(`README.md: ${filename} deve aparecer uma vez; encontrado ${occurrences}.`);
  }
}

for (const [id, occurrences] of rowIds) {
  if (occurrences !== 1) failures.push(`README.md: TASK-${id} aparece ${occurrences} vezes.`);
}

if (failures.length > 0) {
  console.error("[tasks] A fonte de verdade das tasks está inconsistente:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[tasks] OK: ${rows.length} tasks indexadas com arquivo e status coerentes.`);
}
