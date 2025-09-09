import { tmpdir } from 'node:os'
import { join } from 'node:path'
import fs from 'fs-extra'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createFileContext } from '../src/index'

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
    const ctx = createFileContext('test', {
      data: { foo: 'bar' },
      tempDir
    })
    contexts.push(ctx)

    expect(ctx.value.foo).toBe('bar')
  })

  it('should automatically save changes to file', async () => {
    const ctx = createFileContext('test-save', {
      data: { count: 0 },
      tempDir
    })
    contexts.push(ctx)

    ctx.value.count = 42

    // Wait for debounced save to complete
    await new Promise(resolve => setTimeout(resolve, 50))

    const filePath = join(tempDir, 'test-save.json')
    expect(fs.existsSync(filePath)).toBe(true)

    const fileData = fs.readJSONSync(filePath)
    expect(fileData.count).toBe(42)
  })

  it('should share data between multiple contexts with same id', async () => {
    const ctx1 = createFileContext('shared', {
      data: { message: 'hello', number: 0 },
      tempDir
    })
    contexts.push(ctx1)

    // Modify data in first context
    ctx1.value.message = 'world'
    ctx1.value.number = 123

    // Wait for debounced save to complete
    await new Promise(resolve => setTimeout(resolve, 50))

    // Create second context with same id
    const ctx2 = createFileContext('shared', {
      data: { message: '', number: 0 },
      tempDir
    })
    contexts.push(ctx2)

    // Second context should have the updated data
    expect(ctx2.value.message).toBe('world')
    expect(ctx2.value.number).toBe(123)
  })

  it('should clean up temp file on dispose', async () => {
    const ctx = createFileContext('cleanup-test', {
      data: { data: 'test' },
      tempDir
    })

    // Wait for initial save to complete
    await new Promise(resolve => setTimeout(resolve, 50))

    const filePath = join(tempDir, 'cleanup-test.json')

    // File should exist
    expect(fs.existsSync(filePath)).toBe(true)

    ctx.dispose()

    // File should be removed after dispose
    expect(fs.existsSync(filePath)).toBe(false)
  })

  it('should work with empty options', () => {
    const ctx = createFileContext('empty-test')
    contexts.push(ctx)

    // Should have empty object initially
    expect(ctx.value).toEqual({})

    // Should be able to add properties
    ctx.value.newProp = 'test'
    expect(ctx.value.newProp).toBe('test')
  })

  it('should support different option combinations', () => {
    // Test: id only
    const ctx1 = createFileContext('test1')
    contexts.push(ctx1)
    expect(ctx1.value).toEqual({})

    // Test: id + tempDir only
    const ctx2 = createFileContext('test2', { tempDir })
    contexts.push(ctx2)
    expect(ctx2.value).toEqual({})

    // Test: id + data + tempDir
    const ctx3 = createFileContext('test3', {
      data: { foo: 'bar' },
      tempDir
    })
    contexts.push(ctx3)
    expect(ctx3.value.foo).toBe('bar')

    // Test: id + data only
    const ctx4 = createFileContext('test4', {
      data: { count: 42 }
    })
    contexts.push(ctx4)
    expect(ctx4.value.count).toBe(42)
  })
})
