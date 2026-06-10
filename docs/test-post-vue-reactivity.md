# Understanding Vue 3 Reactivity

Vue 3's reactivity system makes state changes easy to track and render. The two most common APIs are `ref()` and `reactive()`.

## Using ref

`ref()` is usually used for primitive values such as strings, numbers, and booleans.

```ts
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}
```

In templates, Vue automatically unwraps refs, so you can use `count` directly.

## Using reactive

`reactive()` is useful when you want to manage an object as state.

```ts
import { reactive } from 'vue'

const user = reactive({
  name: 'Gerden',
  role: 'developer'
})

user.role = 'full-stack learner'
```

## A Small Rule

Use `ref()` when the value is simple. Use `reactive()` when the value is naturally an object with multiple fields.
