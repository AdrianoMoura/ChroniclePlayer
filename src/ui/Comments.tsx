import { useState } from 'react'
import type { CommentDto } from '../ipc/contract'
import { publishedLabel } from './format'
import { t } from './i18n'

// B-006: read the comment thread, post a top-level comment, reply to a
// comment. There is no public API to like a *comment* (only videos, via
// PlayerView's own Like button) — likeCount here is read-only display.

interface CommentsSectionProps {
  videoId: string
}

export function CommentsSection({ videoId }: CommentsSectionProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<CommentDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)

  function load(): void {
    setLoading(true)
    setError(null)
    void window.chronicle.getComments(videoId).then((result) => {
      setLoading(false)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setComments(result.value.comments)
    })
  }

  function toggle(): void {
    const next = !open
    setOpen(next)
    if (next && comments === null) load()
  }

  function postTopLevel(): void {
    const text = newComment.trim()
    if (text === '') return
    setPosting(true)
    void window.chronicle.postComment(videoId, text).then((result) => {
      setPosting(false)
      if (!result.ok) {
        setError(result.message)
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
              onReplyPosted={(reply) => {
                setComments((current) =>
                  (current ?? []).map((c) =>
                    c.commentId === comment.commentId ? { ...c, replies: [...c.replies, reply] } : c
                  )
                )
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  onReplyPosted
}: {
  comment: CommentDto
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
    void window.chronicle.replyToComment(comment.commentId, text).then((result) => {
      setPosting(false)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setReplyText('')
      setReplying(false)
      onReplyPosted(result.value)
    })
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
          <button className="primary" disabled={posting || replyText.trim() === ''} onClick={postReply}>
            {posting ? t('comments.posting') : t('comments.postButton')}
          </button>
          {error !== null && <p className="comments-error">{error}</p>}
        </div>
      )}
      {comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <div key={reply.commentId} className="comment reply">
              <CommentAuthorRow comment={reply} />
              <p className="comment-text">{reply.textDisplay}</p>
            </div>
          ))}
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
