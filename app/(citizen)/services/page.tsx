import React from 'react';
import Link from 'next/link';
import { listAllServices } from '@/lib/services/registry';
import { FileText, ArrowRight, ShieldCheck, Clock, Receipt, MessageSquare } from 'lucide-react';

export default function ServicesCatalogPage() {
  const services = listAllServices();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <span>🇵🇭</span>
            <span>Opisyal na Talaan ng mga Serbisyo (Official Registry)</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Mga Serbisyong Pamahalaan
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Pumili ng serbisyong nais aplayan. Lahat ng form ay sinusuri at ginagabayan ng AI batay sa
            opisyal na Citizen&apos;s Charter.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const totalFee = service.processingFee + (service.convenienceFee || 0);

            return (
              <div
                key={service.code}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                      {service.agencyCode}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{service.processingDays} Araw</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">{service.name}</h3>
                    <p className="text-xs leading-relaxed text-slate-500 line-clamp-3">
                      {service.description}
                    </p>
                  </div>

                  {/* Fee badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    <Receipt className="h-3.5 w-3.5" />
                    <span>{totalFee === 0 ? 'LIBRE (₱0.00)' : `₱${totalFee.toFixed(2)}`}</span>
                  </div>

                  {/* Requirements preview */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-semibold text-slate-500">Pangunahing Kailangan:</p>
                    <ul className="mt-1 list-inside list-disc text-[11px] text-slate-600 space-y-0.5">
                      {service.requirements.slice(0, 2).map((req, i) => (
                        <li key={i} className="line-clamp-1">{req.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4">
                  <Link
                    href={`/services/${service.code}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700"
                  >
                    <span>Simulan ang Form</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    href="/chat"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <MessageSquare className="h-3 w-3 text-blue-600" />
                    <span>Magtanong sa Chatbot</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-center text-xs text-slate-400 pt-4">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Protektado ng Republic Act No. 10173 (Data Privacy Act of 2012)</span>
        </div>
      </div>
    </div>
  );
}
