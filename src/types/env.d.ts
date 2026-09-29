/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    LOG_LEVEL?: string;
    PORT?: string;
    TZ: string;

    // Database
    DB_HOST: string;
    DB_PORT?: string;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    LOG_QUERIES?: string;
  }
}
