import fs from 'fs'
import md5File from 'md5-file'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/'

export const getFilePath = (fileName: string) =>
  path.resolve(UPLOAD_DIR, fileName)

export const getFileChecksum = md5File.sync

export const fileExists = (fileName: string) => {
  return fs.existsSync(getFilePath(fileName))
}

export const removeFile = (fileName: string) => {
  return fs.unlinkSync(getFilePath(fileName))
}

export const renameFile = (oldName: string, newName: string) => {
  return fs.renameSync(getFilePath(oldName), getFilePath(newName))
}

export const readFileBuffer = (fileName: string) => {
  return fs.readFileSync(getFilePath(fileName))
}
