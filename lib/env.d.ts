declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_APP_URL: string;      // p.ej. http://localhost:3000
    NEXT_PUBLIC_API_URL: string;      // p.ej. https://api.cenaria.app
    DDB_TABLE: string;
    DDB_GSI1_NAME: string;
  }
}