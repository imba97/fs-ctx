import { tmpdir } from 'node:os'
import { join } from 'node:path'
import fs from 'fs-extra'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FileLock } from '../src/core/file-lock'

describe('fileLock', () => {
  let tempDir: string
  let testFilePath: string
  let lock: FileLock

  beforeEach(() => {
    tempDir = join(tmpdir(), '.fs-ctx-test-lock')
    fs.ensureDirSync(tempDir)
    testFilePath = join(tempDir, 'test.json')
    lock = new FileLock(testFilePath)
  })

  afterEach(() => {
    if (lock.isLocked()) {
      lock.release()
    }
    fs.removeSync(tempDir)
  })

  it('should acquire lock successfully', async () => {
    const acquired = await lock.acquire()
    expect(acquired).toBe(true)
    expect(lock.isLocked()).toBe(true)
  })

  it('should fail to acquire already held lock', async () => {
    // First lock should succeed
    const firstAcquire = await lock.acquire()
    expect(firstAcquire).toBe(true)

    // Second lock should fail immediately (use short timeout)
    const secondLock = new FileLock(testFilePath, 100)
    const secondAcquire = await secondLock.acquire()
    expect(secondAcquire).toBe(false)
  })

  it('should release lock successfully', async () => {
    await lock.acquire()
    expect(lock.isLocked()).toBe(true)

    await lock.release()
    expect(lock.isLocked()).toBe(false)
  })

  it('should allow acquiring after release', async () => {
    // First acquire and release
    await lock.acquire()
    await lock.release()
    expect(lock.isLocked()).toBe(false)

    // Second acquire should succeed
    const secondAcquire = await lock.acquire()
    expect(secondAcquire).toBe(true)
    expect(lock.isLocked()).toBe(true)
  })

  it('should timeout when lock is held too long', async () => {
    const longLock = new FileLock(testFilePath, 50) // 50ms timeout

    // Create a manual lock file
    const lockPath = `${testFilePath}.lock`
    await fs.writeFile(lockPath, '12345', { flag: 'w' })

    const start = Date.now()
    const acquired = await longLock.acquire()
    const duration = Date.now() - start

    expect(acquired).toBe(false)
    expect(duration).toBeGreaterThanOrEqual(50)
    expect(duration).toBeLessThan(100) // Should not take too much longer
  })

  it('should handle concurrent lock attempts', async () => {
    const locks = [
      new FileLock(testFilePath, 500),
      new FileLock(testFilePath, 500),
      new FileLock(testFilePath, 500)
    ]

    // Try to acquire all locks simultaneously
    const results = await Promise.all(
      locks.map(l => l.acquire())
    )

    // Only one should succeed
    const successCount = results.filter(r => r).length
    expect(successCount).toBe(1)

    // Clean up - release the successful lock
    const successIndex = results.findIndex(r => r)
    if (successIndex >= 0) {
      await locks[successIndex].release()
    }
  }, 5000)

  it('should detect stale locks and clean them up', async () => {
    const lockWithCleanup = new FileLock(testFilePath, 100)

    // Create a stale lock file (simulating crashed process)
    const lockPath = `${testFilePath}.lock`
    await fs.writeFile(lockPath, '99999', { flag: 'w' })

    // Backdate the lock file to make it appear old
    const oldTime = new Date(Date.now() - 300) // 300ms ago
    await fs.utimes(lockPath, oldTime, oldTime)

    // Should be able to acquire despite existing lock file
    const acquired = await lockWithCleanup.acquire()
    expect(acquired).toBe(true)
    expect(lockWithCleanup.isLocked()).toBe(true)
  })

  it('should handle release when lock file does not exist', async () => {
    // Try to release without acquiring
    await expect(lock.release()).resolves.not.toThrow()
    expect(lock.isLocked()).toBe(false)
  })

  it('should handle multiple releases safely', async () => {
    await lock.acquire()
    await lock.release()

    // Multiple releases should not throw
    await expect(lock.release()).resolves.not.toThrow()
    await expect(lock.release()).resolves.not.toThrow()
  })

  it('should use custom timeout value', async () => {
    const customTimeoutLock = new FileLock(testFilePath, 200)

    // Create a blocking lock
    const lockPath = `${testFilePath}.lock`
    await fs.writeFile(lockPath, '12345', { flag: 'w' })

    const start = Date.now()
    const acquired = await customTimeoutLock.acquire()
    const duration = Date.now() - start

    expect(acquired).toBe(false)
    expect(duration).toBeGreaterThanOrEqual(200)
    expect(duration).toBeLessThan(300)
  })

  it('should write process PID to lock file', async () => {
    await lock.acquire()

    const lockPath = `${testFilePath}.lock`
    const content = await fs.readFile(lockPath, 'utf8')

    expect(content).toBe(process.pid.toString())
  })

  it('should handle file system errors gracefully', async () => {
    // Mock fs.writeFile to throw an error
    const writeFileSpy = vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Disk full'))

    await expect(lock.acquire()).rejects.toThrow('Disk full')

    // Restore original function
    writeFileSpy.mockRestore()
  })
})
