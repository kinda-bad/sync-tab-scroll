export interface ServerConfig {
  port: number;
  catalogRoot: string;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 8080),
    catalogRoot: process.env.CATALOG_ROOT ?? './catalog',
  };
}
