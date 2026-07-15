import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CommentDto } from '../ipc/contract'
import { publishedLabel } from './format'
import { t } from './i18n'
import { useWriteScopeGate } from './useWriteScopeGate'

function commentsErrorMessage(errorKind: string, message: string): string {
  // Not the raw API error text — auth-expired specifically means the
  // connection itself needs renewing (Settings → Reconnect), which reads
  // very differently from "something about this video's comments failed."
  return errorKind === 'auth-expired' ? t('comments.reconnectRequired') : message
}

// B-006: read the comment thread, post a top-level comment, reply to a
// comment. There is no public API to like a *comment* (only videos, via
// PlayerView's own Like button) — likeCount here is read-only display.

export interface CommentsSectionHandle {
  // Lets the player's own keyboard shortcut (`c`) drive the same show/hide
  // this component's button does — the open state is local to this
  // component (reset per video via PlayerDetails' `key={video.videoId}`),
  // so a plain callback prop can't reach it from outside.
  toggle: () => void
}

interface CommentsSectionProps {
  videoId: string
}

export const CommentsSection = forwardRef<CommentsSectionHandle, CommentsSectionProps>(
  function CommentsSection({ videoId }, ref) {
    const writeScopeGate = useWriteScopeGate()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [comments, setComments] = useState<CommentDto[] | null>(null)
    const [nextPageToken, setNextPageToken] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [newComment, setNewComment] = useState('')
    const [posting, setPosting] = useState(false)

    function load(): void {
      setLoading(true)
      setError(null)
      void writeScopeGate
        .run(() => window.chronicle.getComments(videoId))
        .then((result) => {
          setLoading(false)
          if (!result.ok) {
            if (result.errorKind !== 'cancelled')
              setError(commentsErrorMessage(result.errorKind, result.message))
            return
          }
          setComments(result.value.comments)
          setNextPageToken(result.value.nextPageToken)
        })
    }

    const loadMore = useCallback(() => {
      if (nextPageToken === null || loadingMore) return
      setLoadingMore(true)
      void writeScopeGate
        .run(() => window.chronicle.getComments(videoId, nextPageToken))
        .then((result) => {
          setLoadingMore(false)
          if (!result.ok) {
            if (result.errorKind !== 'cancelled')
              setError(commentsErrorMessage(result.errorKind, result.message))
            return
          }
          setComments((current) => [...(current ?? []), ...result.value.comments])
          setNextPageToken(result.value.nextPageToken)
        })
    }, [videoId, nextPageToken, loadingMore, writeScopeGate])

    function toggle(): void {
      const next = !open
      setOpen(next)
      if (next && comments === null) load()
    }

    useImperativeHandle(ref, () => ({ toggle }))

    // Auto-paginate on scroll, same as the main feed and search results —
    // no "Load more" click anywhere else in the app. The comments list isn't
    // its own scroll container (it flows inside the player's page-level
    // scroll), so a sentinel + IntersectionObserver is simpler than tracking
    // scroll position on some ancestor.
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
      if (!open || nextPageToken === null) return
      const el = sentinelRef.current
      if (el === null) return
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMore()
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [open, nextPageToken, loadMore])

    function postTopLevel(): void {
      const text = newComment.trim()
      if (text === '') return
      setPosting(true)
      void writeScopeGate
        .run(() => window.chronicle.postComment(videoId, text))
        .then((result) => {
          setPosting(false)
          if (!result.ok) {
            if (result.errorKind !== 'cancelled')
              setError(commentsErrorMessage(result.errorKind, result.message))
            return
          }
          setNewComment('')
          setComments((current) => [result.value, ...(current ?? [])])
        })
    }

    return (
      <div className="comments-section">
        <button className="comments-toggle" onClick={toggle}>
          {open ? t('comments.hide') : t('comments.show')}
        </button>
        {open && (
          <div className="comments-body">
            <div className="comment-composer">
              <textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder={t('comments.addPlaceholder')}
              />
              <button
                className="primary"
                disabled={posting || newComment.trim() === ''}
                onClick={postTopLevel}
              >
                {posting ? t('comments.posting') : t('comments.postButton')}
              </button>
            </div>
            {error !== null && <p className="comments-error">{error}</p>}
            {loading && <p className="comments-loading">{t('comments.loading')}</p>}
            {!loading && comments !== null && comments.length === 0 && (
              <p className="comments-empty">{t('comments.empty')}</p>
            )}
            {comments?.map((comment) => (
              <CommentItem
                key={comment.commentId}
                comment={comment}
                runWithWriteScope={writeScopeGate.run}
                onReplyPosted={(reply) => {
                  setComments((current) =>
                    (current ?? []).map((c) =>
                      c.commentId === comment.commentId
                        ? { ...c, replies: [...c.replies, reply] }
                        : c
                    )
                  )
                }}
              />
            ))}
            {nextPageToken !== null && <div ref={sentinelRef} />}
            {loadingMore && <p className="comments-loading">{t('comments.loadingMore')}</p>}
          </div>
        )}
        {writeScopeGate.dialog}
      </div>
    )
  }
)

type RunWithWriteScope = ReturnType<typeof useWriteScopeGate>['run']

function CommentItem({
  comment,
  runWithWriteScope,
  onReplyPosted
}: {
  comment: CommentDto
  runWithWriteScope: RunWithWriteScope
  onReplyPosted: (reply: CommentDto) => void
}) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function postReply(): void {
    const text = replyText.trim()
    if (text === '') return
    setPosting(true)
    void runWithWriteScope(() => window.chronicle.replyToComment(comment.commentId, text)).then(
      (result) => {
        setPosting(false)
        if (!result.ok) {
          if (result.errorKind !== 'cancelled')
            setError(commentsErrorMessage(result.errorKind, result.message))
          return
        }
        setReplyText('')
        setReplying(false)
        onReplyPosted(result.value)
      }
    )
  }

  return (
    <div className="comment">
      <CommentAuthorRow comment={comment} />
      <p className="comment-text">{comment.textDisplay}</p>
      <button className="comment-reply-toggle" onClick={() => setReplying((r) => !r)}>
        {t('comments.replyButton')}
      </button>
      {replying && (
        <div className="comment-composer reply">
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder={t('comments.replyPlaceholder')}
          />
          <button
            className="primary"
            disabled={posting || replyText.trim() === ''}
            onClick={postReply}
          >
            {posting ? t('comments.posting') : t('comments.postButton')}
          </button>
          {error !== null && <p className="comments-error">{error}</p>}
        </div>
      )}
      {comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.commentId}
              reply={reply}
              topLevelId={comment.commentId}
              runWithWriteScope={runWithWriteScope}
              onReplyPosted={onReplyPosted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// A reply to a reply still posts as a reply to the *top-level* comment
// (comments.insert takes only the top-level id — YouTube's one-level-nesting
// model). The `@name` prefix is a text convention, not a structural third
// nesting level.
function ReplyItem({
  reply,
  topLevelId,
  runWithWriteScope,
  onReplyPosted
}: {
  reply: CommentDto
  topLevelId: string
  runWithWriteScope: RunWithWriteScope
  onReplyPosted: (reply: CommentDto) => void
}) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState(() => `@${reply.authorDisplayName} `)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function postReply(): void {
    const text = replyText.trim()
    if (text === '') return
    setPosting(true)
    void runWithWriteScope(() => window.chronicle.replyToComment(topLevelId, text)).then(
      (result) => {
        setPosting(false)
        if (!result.ok) {
          if (result.errorKind !== 'cancelled')
            setError(commentsErrorMessage(result.errorKind, result.message))
          return
        }
        setReplyText(`@${reply.authorDisplayName} `)
        setReplying(false)
        onReplyPosted(result.value)
      }
    )
  }

  return (
    <div className="comment reply">
      <CommentAuthorRow comment={reply} />
      <p className="comment-text">{reply.textDisplay}</p>
      <button className="comment-reply-toggle" onClick={() => setReplying((r) => !r)}>
        {t('comments.replyButton')}
      </button>
      {replying && (
        <div className="comment-composer reply">
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder={t('comments.replyPlaceholder')}
          />
          <button
            className="primary"
            disabled={posting || replyText.trim() === ''}
            onClick={postReply}
          >
            {posting ? t('comments.posting') : t('comments.postButton')}
          </button>
          {error !== null && <p className="comments-error">{error}</p>}
        </div>
      )}
    </div>
  )
}

function CommentAuthorRow({ comment }: { comment: CommentDto }) {
  return (
    <div className="comment-author-row">
      {comment.authorProfileImageUrl !== null ? (
        <img
          className="comment-avatar"
          loading="lazy"
          alt=""
          src={`thumb://img/${encodeURIComponent(comment.authorProfileImageUrl)}`}
        />
      ) : (
        <div className="comment-avatar" />
      )}
      <span className="comment-author">{comment.authorDisplayName}</span>
      <span className="comment-meta">
        {publishedLabel(comment.publishedAt)} · ♥ {comment.likeCount}
      </span>
    </div>
  )
}
