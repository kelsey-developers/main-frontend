'use client';

import React, { useState, useEffect } from 'react';

type Review = {
  id: string;
  author?: string;
  rating?: number;
  text?: string;
};

interface ReviewPanelProps {
  reviews?: Review[];
  isLoading: boolean;
}

// Mock reviews data
const mockReviews: Review[] = [
  {
    id: '1',
    author: 'John Smith',
    rating: 5,
    text: 'Amazing property! The location was perfect and the host was very accommodating. Would definitely recommend to anyone visiting the area.'
  },
  {
    id: '2',
    author: 'Maria Garcia',
    rating: 4,
    text: 'Great stay overall. The apartment was clean and well-maintained. Only minor issue was the WiFi speed, but everything else was perfect.'
  },
  {
    id: '3',
    author: 'David Lee',
    rating: 5,
    text: 'Exceeded expectations! Beautiful view, comfortable beds, and excellent amenities. Will definitely book again on my next visit.'
  }
];

const ReviewPanel: React.FC<ReviewPanelProps> = ({ reviews, isLoading = false }) => {
  const items = reviews && reviews.length > 0 ? reviews : mockReviews;
  const hasExplicitNoReviews = reviews !== undefined && reviews.length === 0;
  const [index, setIndex] = useState(0);
  const current = items.length > 0 ? items[index] : undefined;

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className='h-6 bg-gray-200 rounded w-1/3 mb-2'></div>
        </div>

        <div className="mt-3 animate-pulse">
          <div className="flex items-start mb-3 ml-3 mr-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full mr-3 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>

          <div className="ml-3 mr-3">
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-gray-200 rounded-full" />
              <div className="w-2 h-2 bg-gray-200 rounded-full" />
              <div className="w-2 h-2 bg-gray-200 rounded-full" />
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const prev = () => items.length > 0 && setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => items.length > 0 && setIndex((i) => (i + 1) % items.length);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <h4 className="text-lg font-bold mb-2" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
          Reviews
        </h4>
      </div>

      <div className="mt-3">
        {hasExplicitNoReviews ? (
          <div className="py-8 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 p-4 bg-gray-50 rounded-full">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                No reviews yet
              </p>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>
                Be the first to share your experience
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start mb-3 ml-3 mr-3">
              <div className="w-15 h-15 bg-gray-300 rounded-full mr-3 flex-shrink-0"></div>
              <div className="flex-1">
                <div>
                  <p className="text-lg font-semibold" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                    {current?.author}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${i < (current?.rating ?? 0) ? 'text-yellow-400' : 'text-gray-200'}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.178c.969 0 1.371 
                          1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.286 3.965c.3.922-.755 1.688-1.538 1.118l-3.385-2.46a1 
                          1 0 00-1.176 0l-3.385 2.46c-.783.57-1.838-.196-1.538-1.118l1.286-3.965a1 1 0 00-.364-1.118L2.047 9.393c-.783-.57-.38-1.81.588-1.81h4.178a1 
                          1 0 00.95-.69L9.049 2.927z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 mt-0.5" style={{fontFamily: 'Poppins'}}>{(current?.rating ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-3 mr-3">
              {current?.text && (
                <p className="text-sm text-gray-700 mt-4 justify-around" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
                  {current.text}
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex-shrink-0">
                <button
                  aria-label="Previous review"
                  onClick={prev}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Previous"
                >
                  <svg className="w-5 h-5 text-gray-600 rotate-180" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 16.293a1 1 0 010-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.879a1 1 0 011.538-1.273l5 5.882a1 1 0 010 1.273l-5 5.882a1 1 0 01-1.538-1.273z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2">
                {items.map((r, i) => (
                  <button
                    key={r.id}
                    aria-label={`Show review ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={`w-2 h-2 rounded-full ${i === index ? 'bg-gray-800' : 'bg-gray-300'}`}
                  />
                ))}
              </div>

              <div className="flex-shrink-0">
                <button
                  aria-label="Next review"
                  onClick={next}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Next"
                >
                  <svg className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 16.293a1 1 0 010-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.879a1 1 0 011.538-1.273l5 5.882a1 1 0 010 1.273l-5 5.882a1 1 0 01-1.538-1.273z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewPanel;
