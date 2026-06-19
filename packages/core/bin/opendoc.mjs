#!/usr/bin/env node
// Run the TypeScript CLI directly from source — no build step. tsx registers an
// ESM loader that transpiles .ts/.tsx on import.
import { register } from 'tsx/esm/api';

register();
await import('../src/cli/bin.ts');
