'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type { CleaningTask } from '../types';
import { mockCleaningTasksToday } from '../lib/mockData';
import { LostBrokenItemsTable, type ItemRow } from '../components/LostBrokenItemsTable';

function HousekeepingReportSkeleton() {
  return (
    <div style={{ fontFamily: 'Poppins' }} className="animate-pulse">
      <div className="mb-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-9 w-64 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-full max-w-xl bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
          <div className="h-10 w-full bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
          <div className="h-10 w-3/4 bg-gray-100 rounded" />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
          <div className="min-h-[300px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" />
        </div>
      </div>
      <div className="pt-5">
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function taskOptionLabel(task: CleaningTask): string {
  if (task.bookingId) {
    return `${task.unit} — ${task.bookingId}`;
  }
  return task.unit;
}

type ProofFile = { file: File; preview?: string };

export type ReportCategory = 'loss' | 'broken';

const emptyRow: ItemRow = { item: '', type: null };

export default function HousekeepingReportPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [tasksToday, setTasksToday] = useState<CleaningTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTasksToday(mockCleaningTasksToday.filter((t) => t.date === todayStr));
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [todayStr]);

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ ...emptyRow }]);
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const selectedTask = tasksToday.find((t) => t.id === selectedTaskId);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const newEntries: ProofFile[] = [];
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) return;
      const entry: ProofFile = { file };
      if (isImage) {
        const url = URL.createObjectURL(file);
        entry.preview = url;
      }
      newEntries.push(entry);
    });
    setProofFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const removeProofFile = useCallback((index: number) => {
    setProofFiles((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }, []);

  const hasValidItemEntry = itemRows.some(
    (r) => r.item !== '' && (r.type === 'loss' || r.type === 'broken')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !hasValidItemEntry) return;
    setSubmitted(true);
    setSelectedTaskId('');
    setItemRows([{ ...emptyRow }]);
    setDescription('');
    setReason('');
    proofFiles.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    setProofFiles([]);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );
  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  if (isLoading) {
    return <HousekeepingReportSkeleton />;
  }

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <div className="mb-6">
        <Link
          href="/sales-report/housekeeping"
          className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Housekeeping
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Report
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Report an issue or damage or loss of items for a unit you were assigned to clean today ({formatDate(todayStr)}).
        </p>
      </div>

      {submitted && (
        <div className="mb-6 p-4 rounded-xl bg-[#0B5858]/10 border border-[#0B5858]/20 text-[#0B5858]">
          <p className="font-medium">Report submitted.</p>
          <p className="text-sm mt-1">Thank you. The report has been recorded.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <form id="housekeeping-report-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="report-unit" className="block text-sm font-medium text-gray-700 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                id="report-unit"
                required
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              >
                <option value="">Select a unit you were assigned to clean today</option>
                {tasksToday.map((task) => (
                  <option key={task.id} value={task.id}>
                    {taskOptionLabel(task)}
                  </option>
                ))}
              </select>
              {tasksToday.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">No units assigned for today.</p>
              )}
              {selectedTask && (
                <p className="mt-2 text-xs text-gray-500">
                  {selectedTask.location && `${selectedTask.location} · `}
                  {selectedTask.bookingId && `Booking ${selectedTask.bookingId}`}
                </p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Lost or broken items <span className="text-red-500">*</span>
              </span>
              <p className="text-xs text-gray-500 mb-2">
                Select an item and choose either Loss or Broken per row. Add more rows as needed.
              </p>
              <LostBrokenItemsTable rows={itemRows} onRowsChange={setItemRows} />
            </div>

            <div>
              <label htmlFor="report-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors resize-y"
              />
            </div>

            <div>
              <label htmlFor="report-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason / cause (optional)
              </label>
              <input
                id="report-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. guest damage, wear and tear"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              />
            </div>

          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-2">Proof of damage/loss</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload photos or videos as evidence. Images and videos only.
          </p>
          <label
            className="flex flex-col items-center justify-center w-full min-h-[300px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-[#0B5858]/40 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Drag and drop or click to upload</span>
              <span className="text-xs text-gray-400">Photos or videos</span>
            </div>
          </label>
          {proofFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">{proofFiles.length} file(s) added</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {proofFiles.map((item, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt=""
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-gray-100">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="absolute bottom-1 left-1 right-1 text-xs text-white bg-black/60 rounded px-1 py-0.5 truncate">
                          {item.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeProofFile(index)}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      aria-label="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="pt-5">
        <button
          type="submit"
          form="housekeeping-report-form"
          disabled={!selectedTaskId || !hasValidItemEntry}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-white bg-[#0B5858] hover:bg-[#0a4a4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Submit report
        </button>
      </div>
    </div>
  );
}
