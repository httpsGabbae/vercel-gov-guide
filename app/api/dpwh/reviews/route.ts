import { NextRequest, NextResponse } from 'next/server';
import {
  listDpwhReviews,
  submitDpwhReview,
  getDpwhReviewSummary,
  voteHelpfulDpwhReview,
} from '@/lib/dpwh/projects';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;
    const ratingParam = searchParams.get('rating');
    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined;
    const sort = searchParams.get('sort') as 'newest' | 'highest' | 'lowest' | 'helpful' | undefined;
    const hasPhotos = searchParams.get('hasPhotos') === 'true';

    const reviews = listDpwhReviews({
      projectId,
      rating,
      sort,
      hasPhotos,
    });
    const summary = getDpwhReviewSummary(projectId);

    return NextResponse.json({
      success: true,
      total: reviews.length,
      summary,
      reviews,
    });
  } catch (err) {
    console.error('[GET /api/dpwh/reviews] Error:', err);
    return NextResponse.json({ error: 'Failed to load DPWH reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's an upvote/helpful action
    if (body.action === 'vote_helpful') {
      const { reviewId } = body;
      if (!reviewId) {
        return NextResponse.json(
          { error: 'reviewId is required to vote helpful.' },
          { status: 400 },
        );
      }
      const updated = voteHelpfulDpwhReview(String(reviewId));
      if (!updated) {
        return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        review: updated,
      });
    }

    // Otherwise, create a new review
    const { projectId, authorName, authorRole, rating, comment, photos, tags } = body ?? {};

    if (!projectId || !comment || typeof comment !== 'string' || comment.trim().length < 3) {
      return NextResponse.json(
        { error: 'projectId and a comment (at least 3 characters) are required.' },
        { status: 400 },
      );
    }

    const review = submitDpwhReview({
      projectId: String(projectId),
      authorName: String(authorName || 'Verified Citizen'),
      authorRole: authorRole ? String(authorRole) : undefined,
      rating: Number(rating) || 5,
      comment: String(comment),
      photos: Array.isArray(photos) ? photos : [],
      tags: Array.isArray(tags) ? tags : undefined,
    });

    const summary = getDpwhReviewSummary(review.projectId);

    return NextResponse.json(
      {
        success: true,
        review,
        summary,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit review';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
