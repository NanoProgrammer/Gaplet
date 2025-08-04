import React from 'react';

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] bg-gradient-to-r from-white to-gray-50 text-gray-900 p-8 mb-24">
      {/* Decorative SVG: calendar + sheet icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 mb-6 text-indigo-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
        <rect x="8" y="13" width="8" height="5" rx="1" ry="1" fill="currentColor" opacity="0.1" />
      </svg>

      <h3 className="text-4xl font-extrabold mb-4">Coming Soon</h3>
      <p className="text-lg text-gray-700 max-w-xl text-center">
        Our team is hard at work building seamless integration with{' '}
        <span className="font-semibold">Google Calendar</span> and{' '}
        <span className="font-semibold">Google Sheets</span>.
        Never miss another cancellation or workflow update—stay tuned!
      </p>
    </div>
  );
}
