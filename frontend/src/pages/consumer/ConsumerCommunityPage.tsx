import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../contexts/useAuth'
import { apiErrorMessage } from '../../api/auth'
import {
  createCommunityPost,
  listCommunityFeed,
  likeCommunityPost,
  unlikeCommunityPost,
  type CommunityPost,
} from '../../api/community'
import { PageHeader } from '../../layouts'
import { Loader2, Send, ThumbsUp, MessageCircle } from 'lucide-react'

export default function ConsumerCommunityPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(() => {
    listCommunityFeed({ sort: 'newest' })
      .then(({ data }) => {
        setPosts(data)
        setError(null)
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    setError(null)
    try {
      await createCommunityPost({ body: body.trim() })
      setBody('')
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (post: CommunityPost) => {
    setToggling(post.id)
    try {
      if (post.liked_by_me) await unlikeCommunityPost(post.id)
      else await likeCommunityPost(post.id)
      setPosts((current) =>
        current.map((p) =>
          p.id === post.id
            ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                like_count: p.like_count + (p.liked_by_me ? -1 : 1),
              }
            : p,
        ),
      )
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setToggling(null)
    }
  }

  const displayName =
    user?.email?.split('@')[0]?.split('.')[0] ?? 'You'

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <PageHeader title="Community" description="What's happening" />
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 md:pb-12 space-y-4">
        <form onSubmit={submit} className="rounded-3xl bg-white border border-neutral-200 p-4 shadow-sm">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`Share something with the community, ${displayName}…`}
            aria-label="Write a new post"
            rows={3}
            className="w-full bg-transparent text-sm outline-none resize-none"
          />
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <span className="text-[10px] text-neutral-400">Be kind and helpful</span>
            <button
              type="submit"
              disabled={posting || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 text-white px-4 py-2 text-xs font-black disabled:opacity-50"
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Post
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-primary-700 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading feed…</span>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="rounded-3xl bg-white border border-neutral-200 p-8 text-center text-xs text-neutral-500">
            No posts yet. Be the first to share!
          </div>
        )}

        {posts.map((post) => (
          <article key={post.id} className="rounded-3xl bg-white border border-neutral-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-black">
                {post.author_initials ?? 'U'}
              </div>
              <div>
                <div className="text-sm font-black text-neutral-900">{post.author_name}</div>
                {post.group_name && (
                  <div className="text-[10px] text-neutral-400">{post.group_name}</div>
                )}
              </div>
              <span className="ml-auto text-[10px] text-neutral-400">
                {new Date(post.created_at + 'Z').toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
            {post.title && <h3 className="mt-3 text-sm font-black text-neutral-900">{post.title}</h3>}
            <p className="mt-1 text-sm text-neutral-600 leading-relaxed break-words">{post.body}</p>
            {post.is_own && (
              <div className="mt-2 text-[10px] font-bold text-primary-600 uppercase">Your post</div>
            )}
            <div className="mt-3 flex items-center gap-4 pt-3 border-t border-neutral-100">
              <button
                onClick={() => toggleLike(post)}
                disabled={toggling === post.id}
                aria-pressed={post.liked_by_me}
                aria-label={post.liked_by_me ? 'Unlike this post' : 'Like this post'}
                className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                  post.liked_by_me ? 'text-primary-600' : 'text-neutral-500'
                }`}
              >
                <ThumbsUp className="w-4 h-4" /> {post.like_count}
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500">
                <MessageCircle className="w-4 h-4" /> {post.comment_count}
              </span>
            </div>
          </article>
        ))}
      </div>
      
    </div>
  )
}
