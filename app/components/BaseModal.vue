<template>
  <div>
    <Teleport to="body">
      <div class="font-serif inset-0 fixed justify-center items-center flex flex-col">
        <div class="absolute bg-black/45 inset-0"></div>
        <div v-if="props.status !== 'Delete'" class="relative z-10 w-xl bg-blue-50 rounded-2xl flex justify-start items-center p-6 flex-col">
          <div class="w-full mb-2 text-2xl flex justify-end" @click="handleClose"><svg t="1779959060742" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5192" width="32" height="32"><path d="M512 466.944l233.472-233.472a31.744 31.744 0 0 1 45.056 45.056L557.056 512l233.472 233.472a31.744 31.744 0 0 1-45.056 45.056L512 557.056l-233.472 233.472a31.744 31.744 0 0 1-45.056-45.056L466.944 512 233.472 278.528a31.744 31.744 0 0 1 45.056-45.056z" fill="#2c2c2c" p-id="5193"></path></svg></div>
          <form class="w-[90%] flex flex-col items-center" @submit.prevent="clickChoose">
            <div class="text-3xl">Post Infomation</div>
            <div class="w-full grid grid-cols-[1fr_4fr] gap-2 mb-4">
              <span class="text-xl mr-3 text-right">Title</span>
                <input
                v-model="newTitle"
                type="text" class="w-full outline-none border-b text-xl border-b-[#4b596a]">
            </div>
            <div class="w-full grid grid-cols-[1fr_4fr] gap-2 mb-4">
              <span class="text-xl mr-3">Summary</span><textarea class="
              w-full resize-none text-lg h-24 border border-text-primary
              rounded outline-none 
              "
              v-model="newSummary"
              ></textarea>
            </div>
            <div class="w-full grid grid-cols-[1fr_4fr] gap-2 mb-4">
              <span class="text-xl mr-3 text-right">Tags</span>
              <span class="flex gap-2 flex-wrap">
                <div v-for="tag in tagsList"
                :key="tag" 
                class="bg-blue-400/30 rounded p-0.5 flex items-center"
                >
                  <span>{{ tag }}</span>
                  <span class="ml-2"
                  @click="removeTags(tag)" 
                  >
                    <svg t="1779976590102" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1622" width="16" height="16"><path d="M512 466.944l233.472-233.472a31.744 31.744 0 0 1 45.056 45.056L557.056 512l233.472 233.472a31.744 31.744 0 0 1-45.056 45.056L512 557.056l-233.472 233.472a31.744 31.744 0 0 1-45.056-45.056L466.944 512 233.472 278.528a31.744 31.744 0 0 1 45.056-45.056z" fill="#515151" p-id="1623"></path></svg>
                  </span>
                </div>
                <div v-if="!isAddingTag" @click="isAddingTag = true">
                  <svg t="1779977990236" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2751" width="24" height="24"><path d="M791.457164 482.009422 542.361553 482.009422 542.361553 232.913811c0-17.190122-13.94987-31.139992-31.139992-31.139992-17.190122 0-31.139992 13.94987-31.139992 31.139992l0 249.095611L230.985958 482.009422C213.795836 482.009422 199.845966 495.959292 199.845966 513.149414c0 17.190122 13.94987 31.139992 31.139992 31.139992l249.095611 0 0 249.095611c0 17.224179 13.94987 31.139992 31.139992 31.139992 17.190122 0 31.139992-13.915813 31.139992-31.139992L542.361553 544.289406l249.095611 0c17.224179 0 31.139992-13.94987 31.139992-31.139992C822.597156 495.959292 808.681343 482.009422 791.457164 482.009422L791.457164 482.009422zM791.457164 482.009422" fill="#485d74" p-id="2752"></path></svg>
                </div> 
                <input v-model="editingTag" @blur="addTag(editingTag)" v-if="isAddingTag"
                  class="outline-none border-b border-text-primary" 
                >
              </span>
            </div>
            <div class="w-full grid grid-cols-[1fr_4fr] gap-2 mb-4">
              <span class="text-xl mr-3 text-right">Post</span>
              <div>
                <label for="fileInput" class="text-center h-full bg-text-primary text-blue-50 rounded p-1 transition hover:bg-text-primary/90">Upload</label>
                <input type="file" id="fileInput" class=" hidden" @change="handleUploadChange">
                <span class="text-lg ml-3">{{ fileName }}</span>
              </div>
            </div>
            <button 
            @click.prevent="clickChoose"
            :disabled="submitStatus === 'uploading'" 
            :class="{'text-text-primay/50:':submitStatus === 'uploading'}"
            class="border-text-primary p-1 rounded border text-2xl mb-2">Submit</button>
            <div class="text-red-800" 
            v-if="submitStatus === 'error'"
            >Error: {{ submitError }}</div>
          </form>
        </div>
        <div
        v-else 
        class="bg-relative z-10 w-xl bg-blue-50 rounded-2xl flex justify-start items-center p-4 flex-col" 
        >
           <div class="w-full mb-2 text-2xl flex justify-end" @click="handleClose"><svg t="1779959060742" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5192" width="30" height="30"><path d="M512 466.944l233.472-233.472a31.744 31.744 0 0 1 45.056 45.056L557.056 512l233.472 233.472a31.744 31.744 0 0 1-45.056 45.056L512 557.056l-233.472 233.472a31.744 31.744 0 0 1-45.056-45.056L466.944 512 233.472 278.528a31.744 31.744 0 0 1 45.056-45.056z" fill="#2c2c2c" p-id="5193"></path></svg></div>
          <div class="text-2xl">Are you sure you want to <span class=" font-extrabold">DELETE</span> this article?</div>
          <div class="text-2xl"><span>{{ `No.${props.post?.id} ` }}</span>{{ props.post?.title }}</div>
          <div class="flex w-[30%] justify-between mt-5">
            <button 
            @click="handleDelete" 
            class="p-1 rounded bg-text-primary text-blue-50">Delete</button>
            <button 
            @click="handleClose" 
            class="rounded border p-1">Cancel</button>
          </div>
          <div
          class="mt-4 text-red-600" v-if="submitStatus === 'error'">Error: {{ submitError }}</div>
        </div>
      </div>
      
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref,reactive } from 'vue'
import type { PostList, editedPost, updatedPost } from '~/types/posts';
import { PostApi } from '~/services/posts';
import { useToast } from '#imports';
import type { modalStatusType } from '~/types/modal';
const emit = defineEmits(['close', 'refetch'])
const props = defineProps<{
  status:modalStatusType
  post:PostList
}>()

const handleClose = () => {
  emit('close')
}

// console.log(props.post?.tags)

const tagsList = ref<string[]>([])
if (props.status === 'Update') {
  props.post?.tags.forEach((tag:string) => tagsList.value.push(tag))
}
const removeTags = (tag:string) => {
  let index = tagsList.value.indexOf(tag) 
  tagsList.value.splice(index, 1)
}

const isAddingTag = ref<boolean>(false)
const editingTag = ref<string>('')
const addTag = (tag:string) => {
  if (tagsList.value.includes(tag) || tag.trim().length === 0) {
    isAddingTag.value = false
    return
  }
  tagsList.value.push(tag)
  isAddingTag.value = false
  editingTag.value = ''
}

const fileName = ref<string>('')
const handleUploadChange = (e:Event) => {
  const input = e.target as HTMLInputElement
  fileName.value = input.files?.[0]?.name ?? ''
  newFile.value = input.files?.[0]
}

const newTitle = ref<string>(props.status === 'Update' ? (props.post?.title ?? '') : '')
const newSummary = ref<string>(props.status === 'Update' ? (props.post?.summary ?? '') : '')
const newFile = ref<File>()

const toast = useToast()

const submitStatus = ref<'uploading' | 'error' | 'idle'>('idle')
const submitError = ref<string>('')
const handleSubmit = async () => {
  // console.log('click btn')
  if (!newFile.value) {
    toast.addMessage('Please upload file first')
    return
  }
  const content = await newFile.value.text()
  submitStatus.value = 'uploading'
  try {
    const postUpload:editedPost = {
        title: newTitle.value,
        summary: newSummary.value,
        tags: tagsList.value,
        content,
        post_status: 'published'
    } 
    await PostApi.create(postUpload)   
    submitStatus.value = 'idle' 
    toast.addMessage('Upload success')
    emit('refetch')
    emit('close')
  } catch(err) {
    submitStatus.value = 'error'
    if (err instanceof Error)
    submitError.value = err.message
  }
}

const handleDelete = async () => {
  try {
    if (props.post?.id) {
    await PostApi.deletePost(props.post.id)
    toast.addMessage('Delete success')
    emit('refetch')
    emit('close')
    submitStatus.value = 'idle'
    }
    else throw createError({
      message:'id not exist',
      statusCode:400
    })
  } catch (err) {
    submitStatus.value = 'error'
    if (err instanceof Error)
    submitError.value = err.message
  }
}

const handleUpdate = async () => {
  if (!newFile.value) {
    toast.addMessage('Please upload file first')
    return
  }
  const content = await newFile.value.text()
  submitStatus.value = 'uploading'
  try {
    const postUpload:updatedPost = {
        title: newTitle.value,
        summary: newSummary.value,
        tags: tagsList.value,
        content,
        post_status: 'published',
        slug:props.post.slug,
        id:props.post.id,
    } 
    await PostApi.updatePost(postUpload)   
    submitStatus.value = 'idle' 
    toast.addMessage('Update success')
    emit('refetch')
    emit('close')
  } catch(err) {
    submitStatus.value = 'error'
    if (err instanceof Error)
    submitError.value = err.message
  } 
}

const clickChoose = () => {
  if (props.status === 'Upload') {
      handleSubmit()
    } else {
      handleUpdate()
    }
}
</script>

<style>

</style>
