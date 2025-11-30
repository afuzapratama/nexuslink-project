'use client';

import { useState, useRef, useEffect } from 'react';

type Option = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
};

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  label,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOption(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function removeOption(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  function selectAll() {
    onChange(options.map((opt) => opt.value));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </label>
      )}

      {/* Selected badges + trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[32px] cursor-pointer flex-wrap items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-50 outline-none hover:border-slate-600"
      >
        {selected.length === 0 ? (
          <span className="text-slate-500">{placeholder}</span>
        ) : (
          <>
            {selected.map((val) => {
              const opt = options.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300 ring-1 ring-sky-500/40"
                >
                  {opt?.label || val}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(val);
                    }}
                    className="text-sky-400 hover:text-sky-200"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </>
        )}

        {/* Dropdown arrow */}
        <svg
          className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {/* Quick actions */}
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-slate-300"
            >
              Clear All
            </button>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-800 ${
                    isSelected ? 'bg-slate-800/60' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500'
                        : 'border-slate-600 bg-slate-950'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  <span className={isSelected ? 'text-slate-100' : 'text-slate-300'}>
                    {opt.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="border-t border-slate-800 px-3 py-2 text-xs text-slate-500">
            {selected.length} of {options.length} selected
          </div>
        </div>
      )}
    </div>
  );
}
