interface DenoEnvironment {
  get(name: string): string | undefined;
}

interface DenoGlobal {
  env: DenoEnvironment;
}

export function getEnvVar(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }

  const deno = (globalThis as { Deno?: DenoGlobal }).Deno;
  return deno?.env.get(name);
}
