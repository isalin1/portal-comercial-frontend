import { ref } from 'vue'
import { getAllDepartments, getAllProvinces, getAllDistricts } from '@/api/lavanderiaApi'

export interface LocationItem {
  id: number
  name: string
  departmentId?: number
  provinceId?: number
}

/**
 * Composable reutilizable para manejar la lógica de ubigeo (departamentos, provincias, distritos)
 * @returns Funciones y datos reactivos para manejar ubicaciones
 */
export function useUbigeo() {
  const departments = ref<LocationItem[]>([])
  const provinces = ref<LocationItem[]>([])
  const districts = ref<LocationItem[]>([])

  /**
   * Carga todos los departamentos desde la API
   */
  async function loadDepartments() {
    try {
      const data = await getAllDepartments()
      departments.value = data
      console.log('✅ Departamentos cargados:', data)
    } catch (error) {
      console.error('❌ Error al cargar departamentos:', error)
      departments.value = []
    }
  }

  /**
   * Carga las provincias según el departamento seleccionado
   * @param departmentId - ID del departamento seleccionado
   */
  async function loadProvinces(departmentId: string | number | null) {
    if (!departmentId) {
      provinces.value = []
      districts.value = []
      return
    }

    try {
      const data = await getAllProvinces()
      provinces.value = data.filter((prov: any) => prov.departmentId === parseInt(String(departmentId)))
      console.log('✅ Provincias cargadas:', provinces.value)
    } catch (error) {
      console.error('❌ Error al cargar provincias:', error)
      provinces.value = []
    }
  }

  /**
   * Carga los distritos según la provincia seleccionada
   * @param provinceId - ID de la provincia seleccionada
   */
  async function loadDistricts(provinceId: string | number | null) {
    if (!provinceId) {
      districts.value = []
      return
    }

    try {
      const data = await getAllDistricts()
      districts.value = data.filter((dist: any) => dist.provinceId === parseInt(String(provinceId)))
      console.log('✅ Distritos cargados:', districts.value)
    } catch (error) {
      console.error('❌ Error al cargar distritos:', error)
      districts.value = []
    }
  }

  /**
   * Limpia las provincias y distritos (útil cuando se cambia el departamento)
   */
  function clearProvincesAndDistricts() {
    provinces.value = []
    districts.value = []
  }

  /**
   * Carga la ubicación completa basada en un distritoId
   * Útil para cargar datos al editar un registro existente
   * @param districtId - ID del distrito
   */
  async function loadLocationByDistrict(districtId: number) {
    try {
      // Cargar todos los datos primero
      await loadDepartments()
      const allDistricts = await getAllDistricts()
      const allProvinces = await getAllProvinces()

      // Encontrar el distrito
      const district = allDistricts.find((d: any) => d.id === districtId)
      if (!district) {
        console.warn('⚠️ Distrito no encontrado:', districtId)
        return null
      }

      // Encontrar la provincia del distrito
      const province = allProvinces.find((p: any) => p.id === district.provinceId)
      if (!province) {
        console.warn('⚠️ Provincia no encontrada para el distrito:', districtId)
        return null
      }

      // Cargar provincias del departamento
      await loadProvinces(province.departmentId)
      
      // Cargar distritos de la provincia
      await loadDistricts(province.id)

      return {
        departmentId: province.departmentId,
        provinceId: province.id,
        districtId: district.id
      }
    } catch (error) {
      console.error('❌ Error al cargar ubicación por distrito:', error)
      return null
    }
  }

  return {
    // Datos reactivos
    departments,
    provinces,
    districts,
    
    // Funciones
    loadDepartments,
    loadProvinces,
    loadDistricts,
    clearProvincesAndDistricts,
    loadLocationByDistrict
  }
}


