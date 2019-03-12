import express from 'express'
import { getFilePath, readFileBuffer } from 'functions/files'
import { optimize } from 'functions/images'
import { multer, renameFilesToChecksum } from 'middlewares/files'

const router = express.Router()

router.put('/image', multer, renameFilesToChecksum, (req, res) => {
  res.send(req.files)
})

router.get('/:fileName', async (req, res) => {
  try {
    const fileName: string = req.params.fileName
    const fileBuffer = readFileBuffer(fileName)

    const optimizedFile = optimize(fileBuffer, req.query)

    res
      .header('Cache-Control', 'public, max-age=31536000')
      .contentType('image/*')
      .send(await optimizedFile.toBuffer())
  } catch (err) {
    throw err
  }
})

export default router
