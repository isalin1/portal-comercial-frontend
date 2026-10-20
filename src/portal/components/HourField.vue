<script setup lang="ts">
const props = defineProps<{ modelValue: string; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function parts(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '')
  const rawHour = match ? Number(match[1]) : 9
  const minute = match ? match[2] : '00'
  const period: 'AM' | 'PM' = rawHour >= 12 ? 'PM' : 'AM'
  return { hour: rawHour % 12 || 12, minute, period }
}

const current = () => parts(props.modelValue)

function write(hour: number, minute: string, period: 'AM' | 'PM') {
  let next = hour % 12
  if (period === 'PM') next += 12
  emit('update:modelValue', `${String(next).padStart(2, '0')}:${minute}`)
}

function onHour(event: Event) {
  const { minute, period } = current()
  write(Number((event.target as HTMLSelectElement).value), minute, period)
}

function onMinute(event: Event) {
  const { hour, period } = current()
  write(hour, (event.target as HTMLSelectElement).value, period)
}

function onPeriod(period: 'AM' | 'PM') {
  const { hour, minute } = current()
  write(hour, minute, period)
}
</script>

<template>
  <fieldset class="hour">
    <legend>{{ label }}</legend>
    <div class="row">
      <select :value="current().hour" aria-label="Hora" @change="onHour">
        <option v-for="hour in hours" :key="hour" :value="hour">{{ hour }}</option>
      </select>
      <span class="colon" aria-hidden="true">:</span>
      <select :value="current().minute" aria-label="Minutos" @change="onMinute">
        <option v-for="minute in minutes" :key="minute" :value="minute">{{ minute }}</option>
      </select>
      <div class="period" role="group" aria-label="AM o PM">
        <button type="button" :class="{ on: current().period === 'AM' }" @click="onPeriod('AM')">AM</button>
        <button type="button" :class="{ on: current().period === 'PM' }" @click="onPeriod('PM')">PM</button>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.hour {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.hour legend {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
}

select {
  width: 100%;
  min-height: 48px;
  padding: 10px 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.colon {
  font-size: 18px;
  font-weight: 700;
}

.period {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.period button {
  min-width: 44px;
  height: 48px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: #e8eef5;
  color: var(--color-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.period button.on {
  background: var(--color-brand);
  color: #fff;
}
</style>
