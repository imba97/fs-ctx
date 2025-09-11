import process from 'node:process'
import fs from 'fs-extra'

export class FileLock {
  private lockPath: string

  constructor(filePath: string, private timeout: number = 500) {
    this.lockPath = `${filePath}.lock`
  }

  async acquire(): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < this.timeout) {
      try {
        await fs.writeFile(this.lockPath, process.pid.toString(), { flag: 'wx' })
        return true
      }
      catch (error: any) {
        if (error.code !== 'EEXIST')
          throw error

        try {
          const stat = await fs.stat(this.lockPath)
          const lockAge = Date.now() - stat.mtime.getTime()
          if (lockAge > this.timeout * 2) {
            await fs.unlink(this.lockPath)
            continue
          }
        }
        catch {
          continue
        }

        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    return false
  }

  async release(): Promise<void> {
    try {
      await fs.unlink(this.lockPath)
    }
    catch (error: any) {
      if (error.code !== 'ENOENT')
        throw error
    }
  }

  isLocked(): boolean {
    try {
      return fs.existsSync(this.lockPath)
    }
    catch {
      return false
    }
  }
}
