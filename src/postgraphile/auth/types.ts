export interface UserParams {
  email: string
  password: string
}

export interface User {
  id: number
  email: string
  isAdmin: boolean
}
