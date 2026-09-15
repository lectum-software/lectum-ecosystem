const SHA_PATTERN = /^[0-9a-f]{40,64}$/iu;
const ZERO_SHA_PATTERN = /^0+$/u;

const parsePushedRefs = (input) => {
  const lines = input
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const refs = [];
  for (const line of lines) {
    const fields = line.split(/\s+/u);
    if (fields.length !== 4) return null;

    const [localRef, localSha, remoteRef, remoteSha] = fields;
    if (!SHA_PATTERN.test(localSha) || !SHA_PATTERN.test(remoteSha)) return null;

    refs.push({ localRef, localSha, remoteRef });
  }

  return refs;
};

export const evaluateDeployPush = ({ branch, input = "", stdinIsTTY = false }) => {
  if (!branch) return { allowed: false, reason: "branch_unknown" };
  if (branch !== "homolog") return { allowed: false, reason: "source_branch" };
  if (stdinIsTTY) return { allowed: true, reason: "manual_check" };

  const pushedRefs = parsePushedRefs(input);
  if (!pushedRefs) return { allowed: false, reason: "invalid_input" };

  const validTargets = pushedRefs.every(
    ({ localRef, localSha, remoteRef }) =>
      localRef === "refs/heads/homolog" &&
      remoteRef === "refs/heads/homolog" &&
      !ZERO_SHA_PATTERN.test(localSha),
  );

  return validTargets
    ? { allowed: true, reason: "homolog_only" }
    : { allowed: false, reason: "target_branch" };
};
