import { apiClient } from './api-client'

export interface CommunityGroup {
  id: string
  name: string
  slug: string
  description: string | null
  cover_emoji: string | null
  image_url: string | null
  member_count: number
  is_public: boolean
  created_at: string
  joined?: boolean
}

export interface CommunityGroupDetail {
  id: string
  name: string
  slug: string
  description: string | null
  cover_emoji: string | null
  image_url: string | null
  member_count: number
  is_public: boolean
  joined: boolean
  member_preview: string[]
  created_at: string
}

export interface CommunityPost {
  id: string
  community_id: string | null
  user_id: string
  title: string | null
  body: string
  image_url: string | null
  like_count: number
  comment_count: number
  author_name: string | null
  author_initials: string | null
  created_at: string
  group_name?: string
  liked_by_me?: boolean
  is_own?: boolean
}

export interface CommunityComment {
  id: string
  post_id: string
  user_id: string
  body: string
  author_name: string | null
  author_initials: string | null
  created_at: string
}

export interface CommunityPostDetail extends CommunityPost {
  comments: CommunityComment[]
}

export interface CreateCommunityGroupPayload {
  name: string
  description?: string
  cover_emoji?: string
  image_url?: string
}

export interface CreateCommunityPostPayload {
  title?: string
  body: string
  group_id?: string
  image_url?: string
}

export const listCommunityGroups = (
  params?: { category?: string; limit?: number; offset?: number },
) => apiClient.get<CommunityGroup[]>('/community/groups', { params })

export const getCommunityGroup = (groupId: string) =>
  apiClient.get<CommunityGroupDetail>(`/community/groups/${groupId}`)

export const createCommunityGroup = (payload: CreateCommunityGroupPayload) =>
  apiClient.post<CommunityGroup>('/community', payload)

export const joinCommunityGroup = (groupId: string) =>
  apiClient.post(`/community/groups/${groupId}/join`)

export const leaveCommunityGroup = (groupId: string) =>
  apiClient.post(`/community/groups/${groupId}/leave`)

export const listCommunityFeed = (
  params?: { group_id?: string; sort?: 'newest' | 'top'; limit?: number; offset?: number },
) => apiClient.get<CommunityPost[]>('/community/feed', { params })

export const getCommunityPost = (postId: string) =>
  apiClient.get<CommunityPostDetail>(`/community/posts/${postId}`)

export const createCommunityPost = (payload: CreateCommunityPostPayload) =>
  apiClient.post('/community/posts', payload)

export const likeCommunityPost = (postId: string) =>
  apiClient.post(`/community/posts/${postId}/like`)

export const unlikeCommunityPost = (postId: string) =>
  apiClient.post(`/community/posts/${postId}/unlike`)

export const commentOnCommunityPost = (postId: string, body: string) =>
  apiClient.post(`/community/posts/${postId}/comments`, { body })
