"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    question: "Do I need to change my booking system?",
    answer:
      "No. Gaplet works with your existing booking system or calendar. We integrate with popular platforms and keep integrating more constantly.",
  },
  {
    question: "Do my clients need to download an app?",
    answer:
      "Not at all. Clients receive SMS or email notifications and can book directly through the link—no app required.",
  },
  {
    question: "Can I choose which appointments trigger notifications?",
    answer:
      "Yes. You can set filters by service type, provider, time windows, timezone, and even client history—like if they haven’t booked in a while or have a booking coming soon.",
  },
  {
    question: "Can I edit the replacement appointment?",
    answer:
      "Absolutely. The replacement inherits the original details by default, but you can edit date, time, or client info before confirming.",
  },
  {
    question: "How fast do replacements usually happen?",
    answer:
      "Most replacements happen within minutes, especially when notifications go out simultaneously to multiple eligible clients.",
  },
  {
    question: "Is Gaplet secure and private?",
    answer:
      "Yes. All data is encrypted in transit and at rest. We comply with data protection standards across Canada and the U.S.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-24 px-6  max-w-4xl mx-auto" id='FAQ'>
      <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
      <div className="space-y-6">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="border border-border rounded-xl bg-background px-6 py-5 transition-all duration-300"
            >
              <button
                onClick={() => toggle(index)}
                className="w-full flex justify-between items-center text-left"
              >
                <span className="text-lg font-medium text-foreground">
                  {faq.question}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
                )}
              </button>

              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  isOpen ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"
                }`}
              >
                <div className="text-muted-foreground text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
