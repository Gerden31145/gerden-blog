<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      :aria-label="props.failed ? '表单加载失败' : '加载弹窗'"
      class="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-blue-50 p-6 font-serif text-text-primary backdrop:bg-black/45"
      @cancel.prevent="emit('close')"
    >
      <p v-if="props.failed" role="alert" class="text-xl">表单加载失败</p>
      <p v-else role="status" class="text-xl">正在加载表单…</p>
      <p class="mt-2 text-sm">
        {{ props.failed ? '请检查网络后刷新页面再试。' : '请稍候，也可以关闭后再打开。' }}
      </p>
      <button
        type="button"
        autofocus
        class="mt-5 rounded border border-text-primary px-4 py-1 cursor-pointer"
        @click="emit('close')"
      >关闭</button>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// The async wrapper also forwards the form's props; this placeholder doesn't use them.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ failed?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>
