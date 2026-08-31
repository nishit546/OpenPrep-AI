/**
 * @fileoverview WebSocket service for real-time collaborative code review.
 * Handles cursor tracking, inline comments, and resolution status.
 */
const activeReviews = new Map();

/**
 * Initializes the code review socket event listeners.
 */
const initializeCodeReviewSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`[CodeReview] User connected: ${socket.id}`);

        socket.on('review:join', ({ reviewId, userId, username }) => {
            socket.join(`review_${reviewId}`);
            socket.data = { reviewId, userId, username };

            if (!activeReviews.has(reviewId)) {
                activeReviews.set(reviewId, { comments: [], cursors: new Map() });
            }

            const reviewState = activeReviews.get(reviewId);
            socket.emit('review:sync', { comments: reviewState.comments });

            socket.to(`review_${reviewId}`).emit('review:user_joined', { userId, username });
        });

        socket.on('review:cursor_move', ({ lineNumber, column }) => {
            const { reviewId, userId, username } = socket.data;
            if (!reviewId) return;

            const reviewState = activeReviews.get(reviewId);
            if (reviewState) {
                reviewState.cursors.set(userId, { userId, username, lineNumber, column });
                socket.to(`review_${reviewId}`).emit('review:cursor_update', { userId, username, lineNumber, column });
            }
        });

        socket.on('review:add_comment', (commentData) => {
            const { reviewId } = socket.data;
            if (!reviewId) return;

            const reviewState = activeReviews.get(reviewId);
            if (reviewState) {
                const newComment = {
                    id: `comment_${Date.now()}`,
                    ...commentData,
                    authorId: socket.data.userId,
                    authorName: socket.data.username,
                    createdAt: new Date().toISOString(),
                    isResolved: false
                };
                reviewState.comments.push(newComment);
                io.to(`review_${reviewId}`).emit('review:comment_added', newComment);
            }
        });

        socket.on('review:resolve_comment', ({ commentId }) => {
            const { reviewId } = socket.data;
            if (!reviewId) return;

            const reviewState = activeReviews.get(reviewId);
            if (reviewState) {
                const comment = reviewState.comments.find(c => c.id === commentId);
                if (comment) {
                    comment.isResolved = true;
                    io.to(`review_${reviewId}`).emit('review:comment_resolved', { commentId });
                }
            }
        });

        socket.on('disconnect', () => {
            const { reviewId, userId } = socket.data;
            if (reviewId) {
                const reviewState = activeReviews.get(reviewId);
                if (reviewState) {
                    reviewState.cursors.delete(userId);
                    socket.to(`review_${reviewId}`).emit('review:user_left', { userId });
                }
            }
        });
    });
};

module.exports = {
    initializeCodeReviewSockets,
    getReviewState: (reviewId) => activeReviews.get(reviewId) || null,
};
