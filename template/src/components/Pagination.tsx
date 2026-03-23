"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  // Always include first page
  pages.push(1);

  // Calculate the range around current page
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  // Add ellipsis before range if needed
  if (rangeStart > 2) {
    pages.push("...");
  }

  // Add range pages
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis after range if needed
  if (rangeEnd < total - 1) {
    pages.push("...");
  }

  // Always include last page
  pages.push(total);

  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: Props) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      {/* Page buttons */}
      <div className="flex items-center gap-2">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex min-w-[40px] h-10 items-center justify-center rounded-lg border transition-colors ${
            currentPage === 1
              ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-300 opacity-40 cursor-not-allowed"
              : "border-warm-border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
          }`}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) =>
          page === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex min-w-[40px] h-10 items-center justify-center text-sm text-slate-400"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex min-w-[40px] h-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                currentPage === page
                  ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                  : "border-warm-border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
              }`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex min-w-[40px] h-10 items-center justify-center rounded-lg border transition-colors ${
            currentPage === totalPages
              ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-300 opacity-40 cursor-not-allowed"
              : "border-warm-border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
          }`}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Showing X-Y of Z */}
      <p className="text-sm text-slate-500">
        Showing {startItem}–{endItem} of {totalItems} recipes
      </p>
    </div>
  );
}
