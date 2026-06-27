<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

const title = 'Asistente de Conciliación con IA'
const description = 'Mission Control para la conciliación financiera impulsada por IA. La IA enriquece; el motor de conciliación es determinístico y auditable.'

useSeoMeta({
  title,
  titleTemplate: (chunk?: string) => (chunk && chunk !== title ? `${chunk} · Conciliación IA` : title),
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
