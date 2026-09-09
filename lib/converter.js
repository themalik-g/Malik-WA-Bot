/**
 * Lightweight media converter
 * Uses sharp for images, skips heavy ffmpeg operations when possible
 */
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

let sharp = null
function getSharp() {
    if (!sharp) sharp = require('sharp')
    return sharp
}

async function toSticker(input, output, options = {}) {
    try {
        const s = getSharp()
        let pipeline = s(input)
            .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80, lossless: false })
        await pipeline.toFile(output)
        return output
    } catch (e) {
        throw new Error(`Sticker conversion failed: ${e.message}`)
    }
}

async function toImage(input, output) {
    try {
        const s = getSharp()
        await s(input).png({ compressionLevel: 9 }).toFile(output)
        return output
    } catch (e) {
        throw new Error(`Image conversion failed: ${e.message}`)
    }
}

async function resize(input, output, width, height) {
    try {
        const s = getSharp()
        await s(input).resize(width, height, { fit: 'inside' }).toFile(output)
        return output
    } catch (e) {
        throw new Error(`Resize failed: ${e.message}`)
    }
}

async function toAudio(buffer, ext = 'mp3') {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '../temp')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
        const tmpIn = path.join(tempDir, `${Date.now()}_in.${ext}`)
        const tmpOut = path.join(tempDir, `${Date.now()}_out.mp3`)

        fs.writeFileSync(tmpIn, buffer)

        const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-i', tmpIn,
            '-vn',
            '-ac', '2',
            '-b:a', '128k',
            '-ar', '44100',
            tmpOut
        ])

        ffmpeg.on('error', err => {
            if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)
            if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
            reject(err)
        })

        ffmpeg.on('close', code => {
            if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)
            if (code === 0 && fs.existsSync(tmpOut)) {
                const outBuf = fs.readFileSync(tmpOut)
                fs.unlinkSync(tmpOut)
                resolve(outBuf)
            } else {
                if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
                reject(new Error(`ffmpeg exited with code ${code}`))
            }
        })
    })
}

module.exports = {
    toSticker,
    toImage,
    resize,
    toAudio
}
