import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  queryDpwhProjects,
  getDpwhProjectById,
  submitDpwhCitizenReport,
} from '@/lib/dpwh/projects';
import {
  DFA_CONSULAR_OFFICES,
  getDfaSlotsForSiteAndDate,
  createDfaAppointmentBooking,
  rescheduleDfaAppointment,
  cancelDfaAppointment,
} from '@/lib/dfa/appointments';
import { GET as getDpwhRoute, POST as postDpwhRoute } from '@/app/api/dpwh/projects/route';
import { GET as getDpwhReviewsRoute, POST as postDpwhReviewsRoute } from '@/app/api/dpwh/reviews/route';
import { GET as getDfaRoute, POST as postDfaRoute } from '@/app/api/dfa/appointments/route';
import { POST as postChatRoute } from '@/app/api/chat/route';
import { POST as postInspectRoute } from '@/app/api/inspect/route';

describe('DPWH Nationwide Infrastructure Projects System', () => {
  it('returns active nationwide projects across Luzon, Visayas, and Mindanao', () => {
    const allResult = queryDpwhProjects();
    expect(allResult.projects.length).toBeGreaterThanOrEqual(12);
    expect(allResult.stats.nationwideTotal).toBeGreaterThanOrEqual(12);

    const luzon = queryDpwhProjects({ islandGroup: 'Luzon' });
    const visayas = queryDpwhProjects({ islandGroup: 'Visayas' });
    const mindanao = queryDpwhProjects({ islandGroup: 'Mindanao' });

    expect(luzon.projects.length).toBeGreaterThanOrEqual(4);
    expect(visayas.projects.length).toBeGreaterThanOrEqual(3);
    expect(mindanao.projects.length).toBeGreaterThanOrEqual(3);
  });

  it('filters DPWH projects by category, status, and search keywords', () => {
    const bridges = queryDpwhProjects({ category: 'Bridge & Marine Link' });
    expect(bridges.projects.length).toBeGreaterThanOrEqual(3);
    expect(bridges.projects.every((p) => p.category === 'Bridge & Marine Link')).toBe(true);

    const bataanSearch = queryDpwhProjects({ search: 'Bataan' });
    expect(bataanSearch.projects.length).toBe(1);
    expect(bataanSearch.projects[0].contractId).toBe('24Z00018-BCIB');

    expect(bridges.stats.totalBudgetPhp).toBeGreaterThan(1_000_000_000);
    expect(bridges.stats.averageProgress).toBeGreaterThan(0);
  });

  it('accepts Citizen Infrastructure Watch reports and attaches them to the project', () => {
    const project = getDpwhProjectById('dpwh-proj-001');
    expect(project).toBeDefined();

    const report = submitDpwhCitizenReport({
      projectId: 'dpwh-proj-001',
      reporterName: 'Pedro Penduko',
      observationType: 'Progress Verification',
      comment: 'Onshore approach viaduct piling in Mariveles is visibly progressing on schedule.',
    });

    expect(report).toBeDefined();
    expect(report.referenceNumber).toContain('DPWH-WATCH-2026-');
  });

  it('serves GET and POST on /api/dpwh/projects', async () => {
    const req = new NextRequest('http://localhost:3000/api/dpwh/projects?islandGroup=Mindanao');
    const res = await getDpwhRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.projects.length).toBeGreaterThanOrEqual(3);
    expect(data.stats.byIsland.Mindanao).toBeGreaterThanOrEqual(3);

    const postReq = new NextRequest('http://localhost:3000/api/dpwh/projects', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'dpwh-proj-002',
        reporterName: 'Maria Clara',
        observationType: 'Safety / Traffic Concern',
        comment: 'Requesting additional night warning reflectors near Toril approach.',
      }),
    });
    const postRes = await postDpwhRoute(postReq);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.report.projectId).toBe('dpwh-proj-002');
  });

  it('serves Google Review style ratings, breakdowns, reviews and helpful voting on /api/dpwh/reviews', async () => {
    // 1. GET reviews with Google Review summary
    const getReq = new NextRequest('http://localhost:3000/api/dpwh/reviews?projectId=dpwh-proj-001');
    const getRes = await getDpwhReviewsRoute(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.reviews.length).toBeGreaterThanOrEqual(2);
    expect(getData.summary.averageRating).toBeGreaterThanOrEqual(4.0);
    expect(getData.summary.ratingBreakdown[5]).toBeGreaterThanOrEqual(1);

    // 2. POST a new citizen review with photos, rating, and tags
    const postReviewReq = new NextRequest('http://localhost:3000/api/dpwh/reviews', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'dpwh-proj-001',
        authorName: 'Engr. Teresa Bautista',
        authorRole: 'Structural Inspector',
        rating: 5,
        comment: 'High grade marine concrete being used for pier foundations. Excellent quality control.',
        photos: ['https://images.unsplash.com/photo-1541888946425-d0fbb186156f'],
        tags: ['Quality Control', 'Marine Engineering'],
      }),
    });
    const postReviewRes = await postDpwhReviewsRoute(postReviewReq);
    expect(postReviewRes.status).toBe(201);
    const postReviewData = await postReviewRes.json();
    expect(postReviewData.success).toBe(true);
    expect(postReviewData.review.authorName).toBe('Engr. Teresa Bautista');
    expect(postReviewData.review.rating).toBe(5);

    // 3. Upvote helpful
    const voteReq = new NextRequest('http://localhost:3000/api/dpwh/reviews', {
      method: 'POST',
      body: JSON.stringify({
        action: 'vote_helpful',
        reviewId: postReviewData.review.id,
      }),
    });
    const voteRes = await postDpwhReviewsRoute(voteReq);
    expect(voteRes.status).toBe(200);
    const voteData = await voteRes.json();
    expect(voteData.success).toBe(true);
    expect(voteData.review.helpfulCount).toBe(1);
  });
});

describe('DFA Consular Passport Appointment System', () => {
  it('lists 10 nationwide DFA Consular Offices across NCR, Luzon, Visayas, and Mindanao', () => {
    expect(DFA_CONSULAR_OFFICES.length).toBe(10);
    expect(DFA_CONSULAR_OFFICES.some((o) => o.islandGroup === 'NCR')).toBe(true);
    expect(DFA_CONSULAR_OFFICES.some((o) => o.islandGroup === 'Luzon')).toBe(true);
    expect(DFA_CONSULAR_OFFICES.some((o) => o.islandGroup === 'Visayas')).toBe(true);
    expect(DFA_CONSULAR_OFFICES.some((o) => o.islandGroup === 'Mindanao')).toBe(true);
  });

  it('generates hourly appointment slots and enforces dress code confirmation gate', () => {
    const slots = getDfaSlotsForSiteAndDate('DFA-ASEANA', '2026-11-18');
    expect(slots.length).toBe(8);

    const availableSlot = slots.find((s) => s.availableCount > 0);
    expect(availableSlot).toBeDefined();

    // Should throw if dressCodeAcknowledged is false
    expect(() =>
      createDfaAppointmentBooking({
        citizenId: 'cit-001',
        applicantName: 'Andres Bonifacio',
        birthDate: '1995-11-30',
        email: 'andres@katipunan.ph',
        phone: '09171234567',
        siteCode: 'DFA-ASEANA',
        slotId: availableSlot!.id,
        applicationType: 'NEW_ADULT',
        processingSpeed: 'REGULAR',
        primaryIdPresented: 'PhilSys National ID',
        dressCodeAcknowledged: false,
      })
    ).toThrow(/dress code/i);

    // Should succeed when dressCodeAcknowledged is true
    const confirmed = createDfaAppointmentBooking({
      citizenId: 'cit-001',
      applicantName: 'Andres Bonifacio',
      birthDate: '1995-11-30',
      email: 'andres@katipunan.ph',
      phone: '09171234567',
      siteCode: 'DFA-ASEANA',
      slotId: availableSlot!.id,
      applicationType: 'LOST_VALID',
      processingSpeed: 'EXPEDITED',
      primaryIdPresented: 'PhilSys National ID',
      dressCodeAcknowledged: true,
    });
    expect(confirmed.referenceCode).toContain('DFA-2026-');
    // Expedited (1200) + Lost Penalty (350) + Convenience (50) = 1600
    expect(confirmed.totalFeePhp).toBe(1600);

    // Reschedule appointment
    const targetSlots = getDfaSlotsForSiteAndDate('DFA-CEBU', '2026-11-25');
    const targetSlot = targetSlots.find((s) => s.availableCount > 0)!;
    const resched = rescheduleDfaAppointment({
      appointmentId: confirmed.id,
      newSiteCode: 'DFA-CEBU',
      newSlotId: targetSlot.id,
    });
    expect(resched.status).toBe('RESCHEDULED');
    expect(resched.siteCode).toBe('DFA-CEBU');

    // Cancel appointment
    const cancelled = cancelDfaAppointment(confirmed.id);
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('serves GET and POST on /api/dfa/appointments', async () => {
    const getReq = new NextRequest(
      'http://localhost:3000/api/dfa/appointments?siteCode=DFA-DAVAO&date=2026-12-03'
    );
    const getRes = await getDfaRoute(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.offices.length).toBe(10);
    expect(getData.slots.length).toBe(8);

    const openSlot = getData.slots.find((s: { availableCount: number }) => s.availableCount > 0);
    const postReq = new NextRequest('http://localhost:3000/api/dfa/appointments', {
      method: 'POST',
      body: JSON.stringify({
        action: 'book',
        siteCode: 'DFA-DAVAO',
        date: '2026-12-03',
        slotId: openSlot.id,
        applicationType: 'RENEWAL_ADULT',
        processingSpeed: 'REGULAR',
        applicantName: 'Gabriela Silang',
        birthDate: '1992-03-19',
        phone: '09189998877',
        email: 'gabriela@citizen.gov.ph',
        primaryIdPresented: 'Current ePassport (Renewal)',
        dressCodeAcknowledged: true,
      }),
    });
    const postRes = await postDfaRoute(postReq);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.appointment.siteName).toContain('Davao');
  });

  it('integrates DPWH infrastructure queries into /api/chat SSE stream', async () => {
    const chatReq = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'What is the status of the DPWH Bataan-Cavite Interlink Bridge project?',
          },
        ],
        language: 'en',
      }),
    });
    const chatRes = await postChatRoute(chatReq);
    expect(chatRes.status).toBe(200);
    const rawStream = await chatRes.text();
    expect(rawStream).toContain('sources');
    expect(rawStream).toContain('done');
  });

  it('integrates DPWH, DFA, and 1,000 Q&As into /api/inspect (main UI chat endpoint)', async () => {
    // 1. DPWH query in main UI
    const dpwhInspectReq = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Show me the DPWH infrastructure projects currently building in Mindanao and Luzon',
        language: 'English',
      }),
    });
    const dpwhRes = await postInspectRoute(dpwhInspectReq);
    const dpwhJson = await dpwhRes.json();
    expect(dpwhJson.ok).toBe(true);
    expect(dpwhJson.blocked).toBeUndefined();
    expect(dpwhJson.text).toContain('DPWH Nationwide Infrastructure Tracker');

    // 2. DFA query in main UI
    const dfaInspectReq = new NextRequest('http://localhost:3000/api/inspect', {
      method: 'POST',
      body: JSON.stringify({
        text: 'How do I book a DFA passport appointment and how much is expedited processing?',
        language: 'English',
      }),
    });
    const dfaRes = await postInspectRoute(dfaInspectReq);
    const dfaJson = await dfaRes.json();
    expect(dfaJson.ok).toBe(true);
    expect(dfaJson.blocked).toBeUndefined();
    expect(dfaJson.text).toContain('DFA');
  });
});
