'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from './Loading';

type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  header: React.ReactNode;
  accessorKey: keyof T | string;
  className?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyMessage?: React.ReactNode;
  isLoading?: boolean;
  pagination?: PaginationProps; // If provided, enables server-side pagination mode
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  searchable = false,
  searchKeys = [],
  pageSize = 10,
  emptyMessage = 'No data available',
  isLoading = false,
  pagination,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  
  // Internal state for client-side mode
  const [internalPage, setInternalPage] = useState(1);
  const [search, setSearch] = useState('');
  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  // Use provided pagination or internal state
  const currentPage = pagination ? pagination.currentPage : internalPage;
  const itemsPerPage = pagination ? pagination.itemsPerPage : internalPageSize;

  // Filter data based on search (Client-side only)
  const filteredData = !pagination && searchable && search
    ? data.filter((item) =>
        searchKeys.some((key) => {
          const value = item[key];
          return value?.toString().toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  // Sort data (Client-side only)
  const sortedData = !pagination && sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Try to parse as dates
        try {
          const aDate = new Date(aVal as any);
          const bDate = new Date(bVal as any);
          if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
            return sortDir === 'asc'
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();
          }
        } catch {
          // Ignore
        }

        return 0;
      })
    : filteredData;

  // Paginate (Client-side only)
  // If server-side pagination is used, we assume `data` is already the current page
  const displayData = pagination 
    ? data 
    : sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = pagination 
    ? pagination.totalPages 
    : Math.ceil(sortedData.length / itemsPerPage);

  const totalItems = pagination
    ? pagination.totalItems
    : sortedData.length;

  const handleSort = (key: keyof T | string, sortable?: boolean) => {
    if (!sortable) return;

    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handlePageChange = (page: number) => {
    const newPage = Math.min(Math.max(1, page), totalPages);
    if (pagination) {
      pagination.onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Controls (Client-side only for now) */}
      {!pagination && searchable && (
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setInternalPage(1);
            }}
            className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
          />
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setInternalPageSize(Number(e.target.value));
              setInternalPage(1);
            }}
            className="h-9 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-sm text-slate-200 focus:border-slate-600 focus:outline-none"
            aria-label="Items per page"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => handleSort(col.accessorKey, col.sortable)}
                    className={`px-4 py-3.5 font-semibold text-slate-300 uppercase tracking-wider text-xs ${col.className || ''} ${
                      col.sortable ? 'cursor-pointer hover:text-white hover:bg-slate-800/50 transition-colors' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && (
                        <span className={`text-xs transition-colors ${sortKey === col.accessorKey ? 'text-blue-400' : 'text-slate-600'}`}>
                          {sortKey === col.accessorKey
                            ? sortDir === 'asc'
                              ? '↑'
                              : sortDir === 'desc'
                                ? '↓'
                                : '⇅'
                            : '⇅'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <div className="flex justify-center">
                      <LoadingSpinner size="md" />
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      {typeof emptyMessage === 'string' ? (
                        <>
                          <div className="text-2xl">🔍</div>
                          <p>{emptyMessage}</p>
                        </>
                      ) : (
                        emptyMessage
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="group transition-colors hover:bg-slate-800/30"
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-4 py-3.5 text-slate-300 group-hover:text-slate-200 ${col.className || ''}`}>
                        {col.render ? col.render(item) : String(item[col.accessorKey] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>
            Showing {pagination ? (currentPage - 1) * itemsPerPage + 1 : (currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              «
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ‹
            </button>
            <span className="px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ›
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded px-2 py-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
