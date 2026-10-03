<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import ClientAccess from '../components/ClientAccess.vue'
import { usePortalAuth } from '../auth'

const auth = usePortalAuth()
const router = useRouter()

onMounted(() => {
  if (auth.userType === 'EMPRESARIO' || auth.userType === 'ADMIN') {
    router.replace({ name: 'panel' })
  }
})
</script>

<template>
  <ScreenFrame title="Bienvenido">
    <div style="margin-top: 36px">
      <ClientAccess />
    </div>
  </ScreenFrame>
</template>
