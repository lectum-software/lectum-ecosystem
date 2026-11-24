import { config } from "zod/v4/core";

// Run before application schemas: even a caught Function probe triggers CSP issues.
config({ jitless: true });
