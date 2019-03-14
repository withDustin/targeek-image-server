// tslint:disable
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    /** Ports that express will listen on */
    PORT: string
    /** Upload directory */
    UPLOAD_DIR: string
    /** Maximum files per upload request */
    MAX_UPLOAD_FILES: string
    /** Maximum size per file (in MB) */
    MAX_FILE_SIZE: string

    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    AWS_REGION: string
    AWS_S3_BUCKET: string
    /**
     * Redis URI.
     * @example redis://127.0.0.1:6379
     */
    REDIS_URI: string
    /** This is useful when you put this server behind a proxy. Eg: http://your-domain/proxy. In this context, the BASE_URL should be `/proxy`. It defaults to `''`. */
    BASE_URL: string
  }
}
declare module 'bull-arena'
