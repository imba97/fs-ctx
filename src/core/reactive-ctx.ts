import type { FSContextOptions, FSContextOptionsResolved } from '../types'
import { tmpdir } from 'node:os'
import process from 'node:process'
import consola from 'consola'
import fs from 'fs-extra'
import { normalize } from 'pathe'
import { effect, reactive } from '../utils/reactivity'
import { FileLock } from './file-lock'
import { fileWatcher } from './file-watcher'

export class ReactiveFileContext<T extends Record<string, any> = Record<string, any>> {
  private filePath: string
  private data: T
  private disposed = false
  private isUpdatingFromFile = false
  private initialized = false
  private fileChangeCallback: (filePath: string) => void
  private fileLock: FileLock
  private options: FSContextOptionsResolved<T>

  constructor(
    private id: string,
    options?: FSContextOptions<T>
  ) {
    this.options = {
      tempDir: normalize(tmpdir()),
      cleanup: true,
      ...options
    }
    this.filePath = `${this.options.tempDir}/${this.id}.json`
    this.fileLock = new FileLock(this.filePath, this.options.lockTimeout)

    this.fileChangeCallback = () => this.syncFromFile()

    fs.ensureDirSync(this.options.tempDir)
    fs.ensureFileSync(this.filePath)

    const existingData = this.loadFile()
    const initialData = this.options.data
    this.data = reactive({ ...(initialData || {}), ...existingData }) as T

    // Mark as initialized if we have existing data or initial data
    if (Object.keys(existingData).length > 0 || (initialData && Object.keys(initialData).length > 0)) {
      this.initialized = true
    }

    effect(() => {
      if (!this.disposed && !this.isUpdatingFromFile) {
        this.saveFile()
      }
    })

    this.setupFileWatcher()
  }

  get value(): T {
    return this.data
  }

  async ready(): Promise<void> {
    if (this.initialized) {
      return
    }

    const maxRetries = 10
    const retryDelay = 50

    for (let i = 0; i < maxRetries; i++) {
      if (fs.existsSync(this.filePath)) {
        try {
          const data = await fs.readJSON(this.filePath)
          if (data && Object.keys(data).length > 0) {
            Object.assign(this.data, data)
            this.initialized = true
            return
          }
        }
        catch {
          // File might be being written, retry
        }
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }

    // If we get here, either the file doesn't exist or is empty
    // Mark as initialized anyway to avoid infinite waiting
    this.initialized = true
  }

  /**
   * Dispose the context
   *
   * Cleans up file watchers and removes the temporary context file.
   */
  dispose(): void {
    this.disposed = true
    this.stopFileWatcher()

    if (this.options?.cleanup !== false) {
      this.cleanup()
    }
  }

  private loadFile(): Partial<T> {
    if (!fs.existsSync(this.filePath)) {
      return {}
    }

    try {
      return fs.readJSONSync(this.filePath) as Partial<T>
    }
    catch {
      return {}
    }
  }

  private saveFile(): void {
    if (process.env.NODE_ENV === 'test') {
      this.performSyncSave()
    }
    else {
      this.performSave().catch((error) => {
        consola.warn(`Failed to save context to ${this.filePath}:`, error)
      })
    }
  }

  private performSyncSave(): void {
    try {
      fs.writeJSONSync(this.filePath, this.data, { spaces: 2 })
    }
    catch (error) {
      consola.warn(`Failed to sync save context to ${this.filePath}:`, error)
    }
  }

  private async performSave(): Promise<void> {
    const lockAcquired = await this.fileLock.acquire()
    if (!lockAcquired) {
      consola.warn(`Failed to acquire lock for ${this.filePath}`)
      return
    }

    try {
      await fs.ensureFile(this.filePath)
      await fs.writeJSON(this.filePath, this.data, { spaces: 2 })
    }
    finally {
      await this.fileLock.release()
    }
  }

  private setupFileWatcher(): void {
    fileWatcher.watchFile(this.filePath, this.fileChangeCallback)
  }

  private stopFileWatcher(): void {
    fileWatcher.unwatchFile(this.filePath, this.fileChangeCallback)
  }

  private syncFromFile(): void {
    if (this.disposed || this.isUpdatingFromFile) {
      return
    }

    try {
      this.isUpdatingFromFile = true
      const fileData = this.loadFile()

      Object.keys(this.data).forEach((key) => {
        delete this.data[key]
      })
      Object.assign(this.data, fileData)
    }
    catch (error) {
      consola.warn(`Failed to sync from file ${this.filePath}:`, error)
    }
    finally {
      this.isUpdatingFromFile = false
    }
  }

  private cleanup(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.removeSync(this.filePath)
      }
      const lockPath = `${this.filePath}.lock`
      if (fs.existsSync(lockPath)) {
        fs.removeSync(lockPath)
      }
    }
    catch {
    }
  }
}

export function createFileContext<T extends Record<string, any>>(
  id: string,
  options?: FSContextOptions<T>
): ReactiveFileContext<T> {
  return new ReactiveFileContext(id, options)
}
