"use client";
import { motion } from "framer-motion";

export default function CallSection() {
  const lostBlocks = 18;
  const totalBlocks = 30;

  const blocks = Array.from({ length: totalBlocks }, (_, i) => (
    <motion.div
      key={i}
      className={`w-4 h-4 m-1 rounded-md ${
        i < lostBlocks ? "bg-red-500" : "bg-gray-200"
      }`}
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      transition={{ delay: i * 0.05, duration: 0.3 }}
      viewport={{ once: true }}
    />
  ));

  return (
    <div className="max-w-7xl mx-auto">
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 via-white to-white px-6 py-20 text-center overflow-hidden">
        {/* Top blur overlay to blend previous section */}
        <div className="absolute top-0 left-0 w-full h-64 bg-white/40 backdrop-blur-md z-[-1]" />

        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
          How much money are you losing?
        </h2>

        <p className="text-lg text-center text-gray-600 max-w-xl mb-10">
          Last-minute cancellations cost you more than you think. Each block below represents{" "}
          <span className="text-blue-600 font-semibold">$50</span> lost this month. 
          How many more are you willing to let go?
        </p>

        <div className="grid grid-cols-10 gap-1 mb-8">{blocks}</div>

        <div className="text-xl text-red-600 font-semibold mb-10">
          💸 $900 lost this month due to cancellations alone
        </div>

        <div className="flex flex-col md:flex-row items-center text-center gap-3 mt-6 max-w-[640px]">
        
          <p className="text-gray-700 text-base md:text-lg">
            At a dental clinic, losing 4 appointments a month can mean over{" "}
            <span className="text-blue-600 font-bold">$1,000</span> in unrecovered revenue. 
            In barbershops, spas, or wellness centers, the impact is quieter—but constant. 
            These losses often go unnoticed… until you add them up.
          </p>
        </div>
      </section>
    </div>
  );
}
