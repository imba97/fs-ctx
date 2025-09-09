import type { FSWatcher } from 'chokidar'
import chokidar from 'chokidar'

type FileChangeCallback = (filePath: string) => void

class FileWatcher {
  private watchers: Map<string, FSWatcher> = new Map()
  private callbacks: Map<string, Set<FileChangeCallback>> = new Map()

  watchFile(filePath: string, callback: FileChangeCallback): void {
    if (this.callbacks.has(filePath)) {
      this.callbacks.get(filePath)!.add(callback)
      return
    }

    const watcher = chokidar.watch(filePath, {
      ignored: /^\./,
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('change', () => {
      const callbacks = this.callbacks.get(filePath)
      if (callbacks) {
        callbacks.forEach(cb => cb(filePath))
      }
    })

    this.watchers.set(filePath, watcher)
    this.callbacks.set(filePath, new Set([callback]))
  }

  unwatchFile(filePath: string, callback: FileChangeCallback): void {
    const callbacks = this.callbacks.get(filePath)
    if (!callbacks)
      return

    callbacks.delete(callback)

    if (callbacks.size === 0) {
      const watcher = this.watchers.get(filePath)
      if (watcher) {
        watcher.close()
        this.watchers.delete(filePath)
        this.callbacks.delete(filePath)
      }
    }
  }
}

export const fileWatcher = new FileWatcher()
