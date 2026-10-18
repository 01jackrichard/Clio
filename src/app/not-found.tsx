import React from 'react';
import Link from 'next/link';
import { FileQuestion, BookOpen, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20 bg-[#F6F5F1]">
      <div className="w-full max-w-md bg-white border border-[#E5E4DE] rounded-xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#EDF2FF] text-[#4263EB] flex items-center justify-center mx-auto border border-[#DBE4FF]">
          <FileQuestion className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#17243A]">
          Document Not Found
        </h1>

        <p className="text-sm text-[#536077] leading-relaxed">
          The requested study resource, lecture notes, or page could not be located or may have been archived.
        </p>

        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4263EB] hover:bg-[#364FC7] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Browse Library</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F6F5F1] hover:bg-[#EAE8E1] text-[#17243A] text-xs font-semibold rounded-lg border border-[#E5E4DE] transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
