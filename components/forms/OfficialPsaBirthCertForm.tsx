'use client';

import React, { useState } from 'react';
import type { ApplicantProfile } from '@/lib/services/charter-sources';
import { X, Check, ShieldCheck } from 'lucide-react';

interface OfficialPsaBirthCertFormProps {
  applicant: ApplicantProfile;
  isOpen: boolean;
  onClose: () => void;
}

export function OfficialPsaBirthCertForm({
  applicant,
  isOpen,
  onClose,
}: OfficialPsaBirthCertFormProps) {
  const isDemoJobseeker =
    applicant.role === 'jobseeker' && (applicant.display_name || '').toLowerCase().includes('juan');

  // Split full name or use structured name parts
  const nameParts = (applicant.display_name || (isDemoJobseeker ? 'Juan Santos Dela Cruz' : ''))
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const defaultLast =
    applicant.last_name ||
    (nameParts.length > 1
      ? nameParts[nameParts.length - 1]
      : nameParts[0] || (isDemoJobseeker ? 'DELA CRUZ' : ''));
  const defaultFirst =
    applicant.first_name ||
    (nameParts.length > 1
      ? nameParts.slice(0, -1).join(' ')
      : nameParts[0] || (isDemoJobseeker ? 'JUAN' : ''));

  // Birth date parse
  const dob = applicant.birth_date || (isDemoJobseeker ? '1999-05-14' : '');
  const [dobYear, dobMonth, dobDay] = dob ? dob.split('-') : ['', '', ''];

  // Local editable state populated from My Details
  const [lastName, setLastName] = useState(defaultLast.toUpperCase());
  const [firstName, setFirstName] = useState(defaultFirst.toUpperCase());
  const [middleName, setMiddleName] = useState(
    applicant.middle_name ? applicant.middle_name.toUpperCase() : isDemoJobseeker ? 'SANTOS' : '',
  );
  const [sex, setSex] = useState<'MALE' | 'FEMALE'>('MALE');
  const [bDay, setBDay] = useState(dobDay || (isDemoJobseeker ? '14' : ''));
  const [bMonth, setBMonth] = useState(dobMonth || (isDemoJobseeker ? '05' : ''));
  const [bYear, setBYear] = useState(dobYear || (isDemoJobseeker ? '1999' : ''));
  const [birthCity, setBirthCity] = useState(
    applicant.city ? applicant.city.toUpperCase() : isDemoJobseeker ? 'QUEZON CITY' : '',
  );
  const [birthProvince, setBirthProvince] = useState(isDemoJobseeker ? 'METRO MANILA' : '');
  const [fatherLast, setFatherLast] = useState(
    applicant.father_last_name
      ? applicant.father_last_name.toUpperCase()
      : isDemoJobseeker
        ? 'DELA CRUZ'
        : '',
  );
  const [fatherFirst, setFatherFirst] = useState(
    applicant.father_first_name
      ? applicant.father_first_name.toUpperCase()
      : isDemoJobseeker
        ? 'ROBERTO'
        : '',
  );
  const [fatherMiddle, setFatherMiddle] = useState(
    applicant.father_middle_name
      ? applicant.father_middle_name.toUpperCase()
      : isDemoJobseeker
        ? 'GARCIA'
        : '',
  );
  const [motherMaidenLast, setMotherMaidenLast] = useState(
    applicant.mother_last_name
      ? applicant.mother_last_name.toUpperCase()
      : isDemoJobseeker
        ? 'SANTOS'
        : '',
  );
  const [motherFirst, setMotherFirst] = useState(
    applicant.mother_first_name
      ? applicant.mother_first_name.toUpperCase()
      : isDemoJobseeker
        ? 'MARIA'
        : '',
  );
  const [motherMiddle, setMotherMiddle] = useState(
    applicant.mother_middle_name
      ? applicant.mother_middle_name.toUpperCase()
      : isDemoJobseeker
        ? 'LORENZO'
        : '',
  );
  const [purpose, setPurpose] = useState('PASSPORT / TRAVEL');
  const [numCopies, setNumCopies] = useState(1);
  const [copiesFee, setCopiesFee] = useState(155);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Official PSA Application Form - Birth Certificate"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-300">
        {/* Floating Top Controls */}
        <div className="sticky top-0 z-10 -mt-2 mb-4 flex items-center justify-between border-b border-slate-200 bg-white/95 pb-3 pt-1 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
              PSA
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Official PSA Application Form (CRS Form No. 1)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pre-filled using your verified{' '}
                <span className="font-semibold text-slate-700">My Details</span> profile.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
              aria-label="Close PSA Form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* AUTHENTIC OFFICIAL PSA FORM DESIGN (CRS Form No. 1)           */}
        {/* ------------------------------------------------------------- */}
        <div className="border-2 border-slate-900 bg-white p-4 sm:p-6 text-slate-900 text-xs font-sans">
          {/* Official Document Header */}
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b-2 border-slate-900 pb-3">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-600">
                Republic of the Philippines
              </p>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase">
                PHILIPPINE STATISTICS AUTHORITY
              </h1>
              <p className="text-[10.5px] font-bold text-slate-700 uppercase">
                Office of the Civil Registrar General · Civil Registry System (CRS)
              </p>
              <div className="inline-block mt-1 bg-slate-900 text-white font-extrabold text-[12px] px-3 py-0.5 tracking-wider uppercase">
                APPLICATION FORM — BIRTH CERTIFICATE
              </div>
              <p className="text-[9.5px] italic text-slate-500">
                (Kahilingan para sa Sertipiko ng Kapanganakan alinsunod sa Batas Republika Blg.
                10625)
              </p>
            </div>
          </div>

          {/* Form Notice */}
          <div className="my-2 border border-slate-300 bg-slate-50/70 p-2 text-[10px] text-slate-700 leading-snug">
            <span className="font-bold">PAALALA:</span> Basahin at punan nang malinaw ang lahat ng
            kahon sa malalaking titik (BLOCK LETTERS). Alinsunod sa Data Privacy Act of 2012 (RA
            10173), tanging ang may-ari, mga magulang, asawa, o awtorisadong kinatawan na may
            Authorization Letter / Notarized SPA ang maaaring humiling.
          </div>

          {/* Section 1: Person Whose Birth Is Being Requested */}
          <div className="border border-slate-900 mt-3">
            <div className="bg-slate-900 text-white font-bold text-[11px] px-2.5 py-1 tracking-wider uppercase">
              1. PERSON WHOSE BIRTH IS BEING REQUESTED (Detalye ng Taong Ipinanganak)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 p-2 gap-2 text-[11px]">
              <div className="sm:col-span-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Sex (Kasarian)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <label className="inline-flex items-center gap-1 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="psa_sex"
                      checked={sex === 'MALE'}
                      onChange={() => setSex('MALE')}
                      className="h-3.5 w-3.5"
                    />
                    <span>MALE (Lalaki)</span>
                  </label>
                  <label className="inline-flex items-center gap-1 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="psa_sex"
                      checked={sex === 'FEMALE'}
                      onChange={() => setSex('FEMALE')}
                      className="h-3.5 w-3.5"
                    />
                    <span>FEMALE (Babae)</span>
                  </label>
                </div>
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Last Name (Apelyido)
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-bold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none focus:border-blue-600"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  First Name (Pangalan)
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-bold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none focus:border-blue-600"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Middle Name (Gitnang Pangalan)
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-bold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Birth Date & Place */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 p-2 gap-2 border-t border-slate-300 text-[11px] bg-slate-50/50">
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Date of Birth (Petsa ng Kapanganakan)
                </label>
                <div className="mt-1 flex items-center gap-1 font-mono font-bold">
                  <input
                    type="text"
                    value={bDay}
                    maxLength={2}
                    onChange={(e) => setBDay(e.target.value)}
                    className="w-8 text-center border border-slate-300 bg-white py-0.5"
                    title="Day"
                  />
                  <span>/</span>
                  <input
                    type="text"
                    value={bMonth}
                    maxLength={2}
                    onChange={(e) => setBMonth(e.target.value)}
                    className="w-8 text-center border border-slate-300 bg-white py-0.5"
                    title="Month"
                  />
                  <span>/</span>
                  <input
                    type="text"
                    value={bYear}
                    maxLength={4}
                    onChange={(e) => setBYear(e.target.value)}
                    className="w-14 text-center border border-slate-300 bg-white py-0.5"
                    title="Year"
                  />
                  <span className="text-[9px] font-normal text-slate-400 ml-1">(DD/MM/YYYY)</span>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Place of Birth: City / Municipality (Lungsod / Bayan)
                </label>
                <input
                  type="text"
                  value={birthCity}
                  onChange={(e) => setBirthCity(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Province / Country (Lalawigan / Bansa)
                </label>
                <input
                  type="text"
                  value={birthProvince}
                  onChange={(e) => setBirthProvince(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Father's Name */}
          <div className="border border-slate-900 mt-3">
            <div className="bg-slate-900 text-white font-bold text-[11px] px-2.5 py-1 tracking-wider uppercase">
              2. FATHER&apos;S NAME (Pangalan ng Ama)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 p-2 gap-2 text-[11px]">
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Last Name (Apelyido)
                </label>
                <input
                  type="text"
                  value={fatherLast}
                  onChange={(e) => setFatherLast(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  First Name (Pangalan)
                </label>
                <input
                  type="text"
                  value={fatherFirst}
                  onChange={(e) => setFatherFirst(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Middle Name (Gitnang Pangalan)
                </label>
                <input
                  type="text"
                  value={fatherMiddle}
                  onChange={(e) => setFatherMiddle(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Mother's Maiden Name */}
          <div className="border border-slate-900 mt-3">
            <div className="bg-slate-900 text-white font-bold text-[11px] px-2.5 py-1 tracking-wider uppercase">
              3. MOTHER&apos;S MAIDEN NAME (Pangalan ng Ina noong Dalaga)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 p-2 gap-2 text-[11px]">
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Maiden Last Name (Apelyido noong Dalaga)
                </label>
                <input
                  type="text"
                  value={motherMaidenLast}
                  onChange={(e) => setMotherMaidenLast(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  First Name (Pangalan)
                </label>
                <input
                  type="text"
                  value={motherFirst}
                  onChange={(e) => setMotherFirst(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Middle Name (Gitnang Pangalan)
                </label>
                <input
                  type="text"
                  value={motherMiddle}
                  onChange={(e) => setMotherMiddle(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 font-semibold uppercase border-b border-slate-400 bg-transparent py-0.5 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4 & 5: Purpose of Request & Requesting Party */}
          <div className="border border-slate-900 mt-3">
            <div className="bg-slate-900 text-white font-bold text-[11px] px-2.5 py-1 tracking-wider uppercase">
              4. REQUESTING PARTY &amp; PURPOSE (Ang Humihiling at Layunin)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 p-2 gap-2 text-[11px]">
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Name of Requesting Party (Pangalan ng Humihiling)
                </label>
                <p className="mt-1 font-bold text-slate-900 uppercase">{applicant.display_name}</p>
                <span className="text-[9px] text-slate-500">(Document Owner / Self)</span>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Purpose of Request (Layunin)
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full mt-1 font-semibold uppercase border border-slate-300 bg-white p-1 text-[11px] outline-none"
                >
                  <option value="PASSPORT / TRAVEL">PASSPORT / FOREIGN TRAVEL</option>
                  <option value="EMPLOYMENT">EMPLOYMENT (LOCAL / OVERSEAS)</option>
                  <option value="SCHOOL REQUIREMENT">SCHOOL REQUIREMENT / BOARD EXAM</option>
                  <option value="GOVERNMENT ID">GOVERNMENT ID APPLICATION</option>
                  <option value="CLAIMS / BENEFITS">CLAIMS / BENEFITS / INSURANCE</option>
                  <option value="CIVIL REGISTRY">CIVIL REGISTRY / MARRIAGE</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Delivery Mode &amp; Number of Copies
                </label>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {numCopies} SECPA Copy (₱{copiesFee * numCopies}.00)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={numCopies <= 1}
                      onClick={() => setNumCopies((prev) => Math.max(1, prev - 1))}
                      className="h-5 w-5 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold">{numCopies}</span>
                    <button
                      type="button"
                      disabled={numCopies >= 5}
                      onClick={() => setNumCopies((prev) => Math.min(5, prev + 1))}
                      className="h-5 w-5 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Address & Signature Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 p-2 gap-2 border-t border-slate-300 text-[11px]">
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-500">
                  Mailing / Delivery Address (Tirahan)
                </label>
                <p className="mt-1 font-semibold text-slate-800 uppercase">
                  {applicant.barangay}, {applicant.city}, METRO MANILA, PHILIPPINES
                </p>
                <p className="text-[9.5px] text-slate-500 mt-0.5">
                  Mobile: 0917-123-4567 · Email: {applicant.role}@govguide.ph
                </p>
              </div>
              <div className="flex flex-col justify-end pt-3 sm:pt-0">
                <div className="border-b border-dashed border-slate-400 pb-1 text-center font-mono font-bold text-slate-900 uppercase">
                  {applicant.display_name}
                </div>
                <div className="text-center text-[9px] text-slate-500 mt-0.5 uppercase">
                  Signature of Requesting Party / Citizen Applicant
                </div>
              </div>
            </div>
          </div>

          {/* Official Bottom Stamp & Certification */}
          <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-300 pt-3 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Certified Official PSA CRS Form Format · Zero Discrepancy Assurance</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
