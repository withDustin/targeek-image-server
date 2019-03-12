declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    PORT: string
    UPLOAD_DIR: string
    MAX_UPLOAD_FILES: string
    MAX_FILE_SIZE: string
  }
}
