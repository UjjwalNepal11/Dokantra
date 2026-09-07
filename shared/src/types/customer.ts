export type CustomerResponse = {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCustomerInput = {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export type UpdateCustomerInput = {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  isActive?: boolean
}
