<template>
  <div>
    <TransitionGroup name="toast" tag="div"
    class="transition fixed flex flex-col gap-3 top-5 right-5 z-50" 
    >
      <div name="toast" v-for="notice in toastList"
      :key="notice.id" 
      >
        <Notification :content="notice.content"></Notification>
      </div>  
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import Notification from './Notification.vue';
import { useToast } from '~/composables/useToast.js';

const toast = useToast()
const toastList = toast.toasts


let timer:ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    toastList.value.forEach((notice) => {
      if (!notice.pause) {
        notice.timer--
        if (notice.timer === 0) toast.remove(notice.id)
      }
    })
  }, 1000)
})

onUnmounted(() => timer?clearInterval(timer):0)

</script>

<style>
.toast-enter-from {
  @apply opacity-0
}

.toast-enter-active,
.toast-leave-active,
.toast-move {
  @apply transition-all duration-500
}

.toast-leave-to {
  @apply opacity-0
}

/* .toast-leave-active {
  @apply absolute 
} */
</style>