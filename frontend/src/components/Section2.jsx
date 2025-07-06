"use client";
import { motion } from "framer-motion";

export default function CallSection() {
  const lostBlocks = 18;
  const totalBlocks = 30;

  const blocks = Array.from({ length: totalBlocks }, (_, i) => (
    <motion.div
      key={i}
      className={`w-4 h-4 m-1 rounded-md ${
        i < lostBlocks ? "bg-[var(--danger)]" : "bg-[var(--input)]"
      }`}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.04, duration: 0.25 }}
      viewport={{ once: true }}
    />
  ));

  return (
    <div className="max-w-7xl mx-auto z-10 mb-32">
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center bg-white px-6 py-20 text-center overflow-hidden">
        <div className="absolute bottom-108 right-[-130px] w-[350px] h-[350px] lg:bg-sky-400 opacity-30 rounded-full blur-[120px] z-[-1.1]" />

      <div className="absolute bottom-[480px] left-[30px] w-[300px] h-[430px] lg:bg-violet-400 opacity-25 rounded-full blur-[40px] z-[-1.1]" />

        {/* Content */}
        <h3 className="text-sm md:text-base text-[var(--primary)] font-medium mb-2 tracking-wide relative ">
          What happens if you don’t react fast enough?
        </h3>

        <h2 className="text-3xl md:text-5xl font-bold text-[var(--foreground)] mb-2 relative ">
          How much money are you losing?
        </h2>

        <p className="text-lg text-[var(--muted-foreground)] max-w-xl mb-6 relative ">
          Missed appointments cost more than you think. Each block below represents{" "}
          <span className="text-[var(--primary)] font-semibold">$50</span> lost this month.
          Are you ready to stop the bleeding?
        </p>

        <div className="grid grid-cols-10 gap-1 mb-6 relative ">
          {blocks}
        </div>

        <div className="text-xl text-[var(--danger)] font-semibold mb-2 relative " >
          💸 $900 lost this month due to cancellations alone
        </div>

        <div className="flex flex-col md:flex-row items-center text-center gap-3 mt-6 max-w-[640px] relative ">
          <p className="text-[var(--muted-foreground)] text-base md:text-lg">
            At a dental clinic, losing just 4 appointments a month can mean over{" "}
            <span className="text-[var(--primary)] font-bold" >$1,000</span> in unrecovered revenue. 
            In salons, wellness centers, or therapy practices, the impact adds up silently—until it hits your bottom line.
          </p>
        </div>
      </section>
      <div id='HowItWorks'></div>
    </div>
  );
}
