export interface ServerConfig {
  port: number;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 8080),
  };
}
