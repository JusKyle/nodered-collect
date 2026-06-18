import axios from 'axios'
import { showToast } from '../utils/toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      showToast('网络连接失败，请检查后端服务', 'error')
    } else {
      const status = error.response.status
      if (status === 401) {
        showToast('Token 已失效，请重新配置网关', 'error')
      } else if (status === 400) {
        showToast(error.response?.data?.message || '请求参数错误', 'error')
      } else if (status === 500) {
        showToast('服务器内部错误', 'error')
      } else {
        console.error('API Error:', error)
      }
    }
    return Promise.reject(error)
  }
)

export default api
