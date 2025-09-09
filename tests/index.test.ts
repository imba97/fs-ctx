import { tmpdir } from 'node:os'
import { join } from 'node:path'
import fs from 'fs-extra'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createReactiveContext } from '../src/index'

describe('fs-ctx', () => {
  let tempDir: string
  let contexts: Array<{ dispose: () => void }> = []

  beforeEach(() => {
    tempDir = join(tmpdir(), '.fs-ctx-test')
    fs.ensureDirSync(tempDir)
  })

  afterEach(() => {
    contexts.forEach(ctx => ctx.dispose())
    contexts = []
    fs.removeSync(tempDir)
  })

  it('should create reactive context with initial data', () => {
    const ctx = createReactiveContext('test', { foo: 'bar' }, { tempDir })
    contexts.push(ctx)

    expect(ctx.value.foo).toBe('bar')
  })

  it('should automatically save changes to file', async () => {
    const ctx = createReactiveContext('test-save', { count: 0 }, { tempDir })
    contexts.push(ctx)

    ctx.value.count = 42

    const filePath = join(tempDir, 'ctx-test-save.json')
    expect(fs.existsSync(filePath)).toBe(true)

    const fileData = fs.readJSONSync(filePath)
    expect(fileData.count).toBe(42)
  })

  it('should share data between multiple contexts with same id', async () => {
    const ctx1 = createReactiveContext('shared', { message: 'hello', number: 0 }, { tempDir })
    contexts.push(ctx1)

    // Modify data in first context
    ctx1.value.message = 'world'
    ctx1.value.number = 123

    // Create second context with same id
    const ctx2 = createReactiveContext('shared', { message: '', number: 0 }, { tempDir })
    contexts.push(ctx2)

    // Second context should have the updated data
    expect(ctx2.value.message).toBe('world')
    expect(ctx2.value.number).toBe(123)
  })

  it('should clean up temp file on dispose', () => {
    const ctx = createReactiveContext('cleanup-test', { data: 'test' }, { tempDir })

    const filePath = join(tempDir, 'ctx-cleanup-test.json')

    // File should exist
    expect(fs.existsSync(filePath)).toBe(true)

    ctx.dispose()

    // File should be removed after dispose
    expect(fs.existsSync(filePath)).toBe(false)
  })
})
