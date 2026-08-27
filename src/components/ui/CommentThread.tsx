import React from 'react';
import type { CaseComment } from '@typings/index';
import { Comment } from './Comment';

interface CommentThreadProps {
  comments: CaseComment[];
  currentUser: any;
  highlightId?: string | null;
  onReply: (commentId: string) => void;
  onLike: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onReaction?: (commentId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY') => Promise<void>;
  onShare?: (commentId: string) => void;
  onUserClick?: (username: string) => void;
  isReacting?: boolean;
  isDeleting?: boolean;
}

export function CommentThread({
  comments,
  currentUser,
  highlightId,
  onReply,
  onLike,
  onDelete,
  onReaction,
  onShare,
  onUserClick,
  isReacting,
  isDeleting,
}: CommentThreadProps) {
  return (
    <div>
      {comments.map((comment, idx) => (
        <React.Fragment key={comment.id}>
          {idx > 0 && (
            <hr className="border-0 h-px bg-gradient-to-r from-transparent via-border-main/10 to-transparent my-3" />
          )}
          <Comment
            comment={comment}
            depth={0}
            isTop={idx === 0}
            highlightId={highlightId}
            onReply={onReply}
            onLike={onLike}
            onDelete={onDelete}
            onReaction={onReaction}
            onShare={onShare}
            onUserClick={onUserClick}
            isReacting={isReacting}
            isDeleting={isDeleting}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
