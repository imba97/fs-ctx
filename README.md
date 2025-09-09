# fs-ctx

A reactive file system context library for seamless cross-process data sharing.

## Features

- 🔄 **Bi-directional Sync**: Automatic synchronization between in-memory objects and file system
- ⚡ **Reactive**: Built-in reactivity with automatic change detection
- 🚀 **Cross-Process**: Share context data seamlessly across multiple processes
- 🎯 **TypeScript**: Full TypeScript support with type safety

## Cross-Process Architecture

```mermaid
graph TD
    A[Process A<br/>AI SDK] --> B[ReactiveFileContext A]
    C[Process B<br/>AI MCP] --> D[ReactiveFileContext B]

    B --> E[Shared JSON File]
    D --> E

    B --> A
    E --> B

    D --> C
    D --> E

    style A fill:#e1f5fe
    style C fill:#e1f5fe
    style B fill:#f3e5f5
    style D fill:#f3e5f5
    style E fill:#fff3e0,stroke:#ff9800,stroke-width:2px
```

## Installation

```bash
pnpm install fs-ctx
```

## Quick Start

**Process A:**
```typescript
import { createReactiveContext } from 'fs-ctx'

// Create a reactive context
const ctx = createReactiveContext('my-app', {
  foo: 'bar',
  count: 0
})

// Changes are automatically saved to file
ctx.value.foo = 'baz'
ctx.value.count = 42
```

**Process B:**
```typescript
import { createReactiveContext } from 'fs-ctx'

// Connect to the same context
const ctx = createReactiveContext('my-app', {})

// Read data from Process A
console.log(ctx.value.foo) // 'baz'
console.log(ctx.value.count) // 42

// Changes sync back to Process A
ctx.value.status = 'ready'
```

## API Reference

### `createReactiveContext<T>(id, initialData, options?)`

**Parameters:**
- `id` (string): Unique identifier for the context
- `initialData` (T): Initial data object
- `options?` (FSContextOptions): Configuration options

**Returns:** `ReactiveFileContext<T>` with `value` property and `dispose()` method

### Configuration Options

```typescript
interface FSContextOptions {
  tempDir?: string // Custom temp directory
  cleanup?: boolean // Auto-remove file on dispose (default: true)
}
```
