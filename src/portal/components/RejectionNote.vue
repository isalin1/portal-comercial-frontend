<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ rejected?: boolean }>()
const emit = defineEmits<{ dismiss: [] }>()
const confirming = ref(false)
</script>

<template>
  <template v-if="rejected">
    <p class="error">Rechazado</p>
    <button v-if="!confirming" class="btn small secondary" type="button" @click="confirming = true">Quitar</button>
    <template v-else>
      <p class="muted">Se quita la información rechazada. Puedes volver a registrarla para solicitar la aprobación.</p>
      <div class="filters">
        <button class="btn small" type="button" @click="emit('dismiss')">Confirmar</button>
        <button class="btn small secondary" type="button" @click="confirming = false">Cancelar</button>
      </div>
    </template>
  </template>
</template>
