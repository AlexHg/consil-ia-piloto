/**
 * Plugin de Nitro: arranca pg-boss y registra el worker de conciliación.
 *
 * Al iniciar, pg-boss instala/migra su esquema dentro de PostgreSQL, crea la
 * cola y registra el consumidor (Reconciliation Worker). Si todavía no hay
 * resultados persistidos, encola una ejecución inicial para que la app tenga
 * datos tras un `db:seed`. También cierra la cola de forma ordenada al apagar.
 *
 * Mantener el wiring aquí garantiza que el worker se registre junto con la cola
 * (un plugin nuevo no se recarga en caliente en dev; este sí).
 */

import { QUEUES, stopBoss, useBoss } from '../queue/boss'
import { enqueueReconciliation, registerReconciliationWorker } from '../services/reconciliation/queue'
import { enqueueEnrichment, registerEnrichmentWorker } from '../services/ai/queue'
import { listReconciliations } from '../repositories/reconciliations.repository'

export default defineNitroPlugin(async (nitroApp) => {
  try {
    const boss = await useBoss()
    await boss.createQueue(QUEUES.enrichment)
    await boss.createQueue(QUEUES.reconciliation)
    await registerEnrichmentWorker()
    await registerReconciliationWorker()

    const existing = await listReconciliations()
    if (existing.length === 0) {
      // Enriquecemos primero; el worker encadena la conciliación al terminar.
      await enqueueEnrichment('startup')
    }

    console.info('[pg-boss] queues and workers (enrichment + reconciliation) ready')
  } catch (error) {
    // No tumbamos el arranque del servidor si la DB aún no está disponible;
    // useBoss() reintentará la creación en la próxima llamada.
    console.error('[pg-boss] no se pudo iniciar la cola/worker', error)
  }

  nitroApp.hooks.hook('close', async () => {
    await stopBoss()
  })
})
