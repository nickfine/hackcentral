import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock
;

// Normalize localStorage for environments where jsdom's implementation is absent or partial.
// Some CI/node setups expose a non-standard object without `clear()`.
(() => {
  const backingStore = new Map<string, string>()
  const localStorageMock: Storage = {
    get length() {
      return backingStore.size
    },
    clear() {
      backingStore.clear()
    },
    getItem(key: string) {
      return backingStore.has(key) ? backingStore.get(key)! : null
    },
    key(index: number) {
      return Array.from(backingStore.keys())[index] ?? null
    },
    removeItem(key: string) {
      backingStore.delete(key)
    },
    setItem(key: string, value: string) {
      backingStore.set(String(key), String(value))
    },
  }

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorageMock,
  })
})()
