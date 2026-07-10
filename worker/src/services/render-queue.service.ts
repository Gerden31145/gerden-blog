import type { RenderPostMessage } from '../types/render-job'

export async function sendPostRender(
  message: RenderPostMessage,
  queue: Queue<RenderPostMessage>
) {
  return queue.send(message, {
    contentType: 'json'
  })
}