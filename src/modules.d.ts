declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    PORT: string
    UPLOAD_DIR: string
    MAX_UPLOAD_FILES: string
    MAX_FILE_SIZE: string
    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    AWS_REGION: string
    AWS_S3_BUCKET: string
  }
}
