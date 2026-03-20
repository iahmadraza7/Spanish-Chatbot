declare module "sql.js" {
  export type BindParams = any[] | Record<string, any>;

  export interface Statement {
    bind(params?: BindParams): void;
    step(): boolean;
    getAsObject(): Record<string, any>;
    run(params?: BindParams): void;
    free(): void;
  }

  export class Database {
    constructor(data?: Uint8Array);
    exec(sql: string): any;
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }

  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}

