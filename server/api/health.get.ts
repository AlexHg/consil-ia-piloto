export default defineEventHandler(() => {
  return {
    status: 'ok',
    service: 'ai-reconciliation-assistant',
    timestamp: new Date().toISOString()
  }
})
