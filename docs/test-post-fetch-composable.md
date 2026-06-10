# Creating a Simple Fetch Composable

In a Vue or Nuxt project, a composable can help keep API logic reusable and easy to read.

## The Composable

This example wraps a simple fetch request and returns loading, data, and error states.

```ts
import { ref } from 'vue'

export function useSimpleFetch<T>(url: string) {
  const data = ref<T | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch {
      error.value = 'Request failed'
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    error,
    loading,
    execute
  }
}
```

## Usage Example

The composable can be used inside a component setup function.

```ts
const { data, loading, error, execute } = useSimpleFetch('/api/posts')

execute()
```

## Why It Helps

This pattern keeps components focused on rendering while the composable handles request state.
