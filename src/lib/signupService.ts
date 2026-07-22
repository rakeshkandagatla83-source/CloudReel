import { http } from './http'
import { apiConfig } from './apiConfig'
import { getStorage } from './storage'
import type { UserData } from '../types/user'

export interface UserSignupData {
  id: number
  email: string
  firstName: string
  lastName: string
  channelName: string
  phoneNumber: string
  passwordHash: string
  emailVerified: boolean
  emailVerificationToken: string
  emailVerifiedAt: number | null
  emailTokenExpiresAt: number | null
  signupStatus: number
  approvedBy: number | null
  approvedAt: number | null
  signupTimestamp: number
  remarks: string | null
}

export interface SignupListResponse {
  userSignups: UserSignupData[]
  totalCount: number
  pageNum: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  code: number
  Message: string
  id: number
  data: T
}


export async function getSignups(
  pagesize: number = 50,
  pagenum: number = 1,
  status?: string | number,
  emailVerified?: boolean,
) {
  const params = new URLSearchParams({
    pagesize: String(pagesize),
    pagenum: String(pagenum),
  })

  if (status !== undefined && status !== null) {
    params.append('status', String(status))
  }

  if (emailVerified !== undefined && emailVerified !== null) {
    params.append('emailverified', String(emailVerified))
  }

  const url = `v1/producer/signups?${params.toString()}`
  const response = await http.get<ApiResponse<SignupListResponse>>(apiConfig.dotnetApiBase, url)
  return response
}

export async function approveSignup(signupId: number, remarks?: string) {
  return updateSignupStatus(signupId, 'approve', remarks)
}

export async function rejectSignup(signupId: number, remarks: string) {
  return updateSignupStatus(signupId, 'reject', remarks)
}

export async function updateSignupStatus(
  signupId: number,
  action: 'approve' | 'reject',
  remarks?: string,
) {
  const userData = getStorage<UserData>('pcr_user')
  const userId = userData?.id ?? 0

  const actionMap: Record<'approve' | 'reject', number> = {
    approve: 1,
    reject: 2,
  }

  const url = 'v1/producer/signups'
  const payload = {
    signupId,
    action: actionMap[action],
    remarks,
    userId,
  }
  return http.post<ApiResponse<unknown>>(apiConfig.dotnetApiBase, url, payload)
}
