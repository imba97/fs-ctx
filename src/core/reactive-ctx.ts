import type { FSContextOptions } from '../types'
import { tmpdir } from 'node:os'
import consola from 'consola'
import fs from 'fs-extra'
import { normalize } from 'pathe'
import { effect, reactive } from '../utils/reactivity'
import { fileWatcher } from './file-watcher'

export class ReactiveFileContext<T extends Record<string, any> = Record<string, any>> {
  private filePath: string
  private data: T
  private disposed = false
  private isUpdatingFromFile = false
  private fileChangeCallback: (filePath: string) => void

  constructor(
    private id: string,
    initialData: T,
    private options?: FSContextOptions
  ) {
    this.options ||= { tempDir: normalize(tmpdir()), cleanup: true }
    this.filePath = `${this.options.tempDir}/ctx-${this.id}.json`

    this.fileChangeCallback = () => this.syncFromFile()

    fs.ensureFileSync(this.filePath)

    const existingData = this.loadFile()
    this.data = reactive({ ...initialData, ...existingData }) as T

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
    try {
      fs.writeJSONSync(this.filePath, this.data, { spaces: 2 })
    }
    catch (error) {
      consola.warn(`Failed to save context to ${this.filePath}:`, error)
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
    }
    catch {
    }
  }
}

export function createReactiveContext<T extends Record<string, any>>(
  id: string,
  initialData: T,
  options?: FSContextOptions
): ReactiveFileContext<T> {
  return new ReactiveFileContext(id, initialData, options)
}
