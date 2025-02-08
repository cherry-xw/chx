<script setup lang="ts">
import Search from "./search.vue";
import { ref } from 'vue'

// --------------------------- config -------------------------------
defineOptions({ name: "EntranceView" })
// ---------------------------- data --------------------------------
const searchKeyword = ref("")
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
// --------------------------- other --------------------------------
</script>

<template>
  <div class="px-[20px] py-[12px]">
    <Search v-model="searchKeyword" />
  </div>
</template>
