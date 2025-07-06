
import React from "react";
import GlowButton from "./Button";
import TV from "./tv";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden min-h-screen bg-white flex flex-col items-center justify-center px-4 sm:px-8 ">
      <div className="absolute top-[-40px] left-[-60px] w-[300px] h-[300px] bg-emerald-400 opacity-30 rounded-full blur-[120px] z-[-1]" />

      <div className="absolute top-90 right-[-120px] w-[350px] h-[350px] bg-sky-400 opacity-30 rounded-full blur-[120px] z-[-1.1]" />

      <div className="absolute top-[20px] right-[-20px] w-[250px] h-[250px] bg-orange-800 opacity-20 rounded-full blur-[60px] z-[-1]" />
      <div className="absolute top-80 left-[10px] w-[340px] h-[320px] bg-violet-400 opacity-25 rounded-full blur-[40px] z-[-1.1]" />
      {/* Contenido principal */}
      <div className="lg:mr-84 z-10 flex flex-col lg:flex-row items-start justify-start gap-82 lg:gap-0">
        {/* text and buttons */}
        <div className=" text-center max-w-xl lg:mr-40">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Detects last-minute cancelation and reacts for you
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Book your next appointment with confidence, knowing that your
            appointment will be available.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href={"/signup"}>
            <GlowButton variant="primary">Start now</GlowButton>
            </Link>
            <Link href="#Demo">
            <GlowButton variant="secondary">Demo ▼</GlowButton>
            </Link>
          </div>
        </div>
        {/* diagram */}
        <div className="flex flex-row items-center left-26 -top-56 lg:-top-18 lg:left-22 relative justify-center scale-75 lg:scale-95">
          <div className="relative -top-5 left-40">
            <TV />
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-[2.25] -z-5">
            <svg
              width="100%"
              height="200"
              viewBox="0 0 400 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 100 C 150 0, 350 200, 590 100"
                stroke="#2e2e2e"
                strokeWidth="6"
                strokeDasharray="12 12"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
          {/* message of cancelation */}
          <div className="absolute top-18 right-28 bg-white p-6 rounded-xl shadow-2xl border border-gray-200 h-48 w-56 animate-fadeIn">
            <div className="flex items-start flex-col">
              <div className="text-blue-500 text-2xl ">📅</div>
              <div className="text-left">
                <p className="text-md text-gray-800 font-semibold mb-2">
                  Appointment cancellation detected
                </p>
                <p className="text-sm text-gray-600 font-normal">
                  3:00 PM with Dr. Roberts is now available.
                </p>
    
              </div>
            </div>
          </div>
          
           <div className="absolute left-6 -top-16  rotate-x-210  origin-bottom-right rotate-z-80 -z-5">
            <div className="scale-160 ">
              <svg
              width="100%"
              height="200"
              viewBox="0 0 400 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 100 C 150 0, 350 200, 590 100"
                stroke="#2e2e2e"
                strokeWidth="6"
                strokeDasharray="12 12"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            </div>
            {/* here */}
          </div>
          <div className="absolute top-62 left-36 bg-white p-6 rounded-xl shadow-2xl border border-gray-200 h-48 w-56 animate-fadeIn ">
            <div className=" ">
              {/* text of email or sms */}
              <div className="flex flex-col items-start gap-3">



  {/* Texto principal */}
  <p className="text-md font-bold text-gray-800">
    Notification sent to 8 eligible clients
  </p>

  {/* Descripción */}
  <p className="text-xs text-gray-500 leading-relaxed">
    Gaplet automatically selected clients based on availability, past cancellation behavior,and proximal appointments.
  </p>
</div>
          
            <div className="rotate-25 absolute -top-6 left-38 h-auto w-32 text-center shadow-lg bg-gray-100  border border-gray-300 rounded-full px-4 py-2 text-xs text-gray-700 font-medium">
  "Reply YES to confirm."
</div>

<div className="-rotate-20 absolute -top-6 right-30 h-auto px-4 w-46 py-1 shadow-lg bg-gray-100  border border-gray-300 rounded-full text-xs text-gray-700">
   "Hi! An appointment just opened up at 3:00 PM. Would you like to take it?"
</div>

             </div>
          </div>
        </div>
      </div>
     

    </section>
  );
}