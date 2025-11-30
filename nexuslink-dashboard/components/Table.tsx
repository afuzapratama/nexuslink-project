'use client';

import { useState } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyMessage?: string;
}

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  searchable = false,
  searchKeys = [],
  pageSize = 10,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  // Filter data based on search
  const filteredData = searchable && search
    ? data.filter((item) =>
        searchKeys.some((key) => {
          const value = item[key];
          return value?.toString().toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  // Sort data
  const sortedData = sortKey
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

        // Try to parse as dates for date string comparison
        try {
          const aDate = new Date(aVal as any);
          const bDate = new Date(bVal as any);
          if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
            return sortDir === 'asc'
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();
          }
        } catch {
          // Not a date, continue to default
        }

        return 0;
      })
    : filteredData;

  // Paginate
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIdx, startIdx + itemsPerPage);

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
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  return (
    <div className="space-y-4">
      {/* Search & Controls */}
      {searchable && (
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
          />
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
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
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={`px-4 py-3 font-medium text-slate-300 ${
                    col.sortable ? 'cursor-pointer hover:text-slate-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && (
                      <span className="text-xs text-slate-500">
                        {sortKey === col.key
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
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30"
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-slate-200">
                      {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>
            Showing {startIdx + 1}-{Math.min(startIdx + itemsPerPage, sortedData.length)} of{' '}
            {sortedData.length}
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
