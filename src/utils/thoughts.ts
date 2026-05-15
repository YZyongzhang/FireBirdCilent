import axios from 'axios'
import { API_BASE } from '@/config'
import { getUser } from './auth'

const BASE = `${API_BASE}/thoughts`

function getHeaders() {
  const user = getUser()
  return {
    'X-User-Id': user?.id ? String(user.id) : '',
    'X-User-Username': user?.username || '',
    'X-User-Role': user?.role || '',
    'X-User-Password': user?.password || '',
  }
}

export type ThoughtGroup = {
  id: number
  name: string
  userId?: number
  createdAt?: string
  updatedAt?: string
}

export type ThoughtNote = {
  id: number
  groupId: number
  title: string
  content: string
  userId?: number
  createdAt?: string
  updatedAt?: string
}

export type RawGroup = {
  id: number
  name: string
  userId?: number
  createdAt?: string
  updatedAt?: string
}

export type RawNote = {
  id: number
  groupId: number
  title: string
  content: string
  userId?: number
  createdAt?: string
  updatedAt?: string
}

export interface GetGroupsResponse {
  groups: ThoughtGroup[]
}

export interface GetNotesResponse {
  notes: ThoughtNote[]
}

export interface GetNotesByGroupRequest {
  groupId: number
}

export interface CreateGroupRequest {
  name: string
}

export interface CreateNoteRequest {
  groupId: number
  title: string
  content?: string
}

export interface UpdateNoteRequest {
  id: number
  title?: string
  content?: string
  groupId?: number
}

export interface DeleteGroupRequest {
  id: number
}

export interface DeleteNoteRequest {
  id: number
}

export async function getGroups(): Promise<ThoughtGroup[]> {
  const res = await axios.get<GetGroupsResponse>(`${BASE}/groups`, {
    headers: getHeaders(),
  })
  return res.data.groups || []
}

export async function getNotes(groupId?: number): Promise<ThoughtNote[]> {
  const params = groupId !== undefined ? { groupId } : {}
  const res = await axios.get<GetNotesResponse>(`${BASE}/notes`, {
    headers: getHeaders(),
    params,
  })
  return res.data.notes || []
}

export async function getNote(id: number): Promise<ThoughtNote | null> {
  try {
    const res = await axios.get<ThoughtNote>(`${BASE}/notes/${id}`, {
      headers: getHeaders(),
    })
    return res.data
  } catch {
    return null
  }
}

export async function createGroup(name: string): Promise<ThoughtGroup> {
  const res = await axios.post<ThoughtGroup>(`${BASE}/groups`, {
    name,
  } as CreateGroupRequest, {
    headers: getHeaders(),
  })
  return res.data
}

export async function updateGroup(id: number, name: string): Promise<ThoughtGroup> {
  const res = await axios.put<ThoughtGroup>(`${BASE}/groups/${id}`, {
    name,
  } as Partial<CreateGroupRequest>, {
    headers: getHeaders(),
  })
  return res.data
}

export async function deleteGroup(id: number): Promise<void> {
  await axios.delete(`${BASE}/groups/${id}`, {
    headers: getHeaders(),
  })
}

export async function createNote(groupId: number, title: string, content: string = ''): Promise<ThoughtNote> {
  const res = await axios.post<ThoughtNote>(`${BASE}/notes`, {
    groupId,
    title,
    content,
  } as CreateNoteRequest, {
    headers: getHeaders(),
  })
  return res.data
}

export async function updateNote(id: number, data: { title?: string; content?: string; groupId?: number }): Promise<ThoughtNote> {
  const res = await axios.put<ThoughtNote>(`${BASE}/notes/${id}`, {
    ...data,
  } as UpdateNoteRequest, {
    headers: getHeaders(),
  })
  return res.data
}

export async function deleteNote(id: number): Promise<void> {
  await axios.delete(`${BASE}/notes/${id}`, {
    headers: getHeaders(),
  })
}
