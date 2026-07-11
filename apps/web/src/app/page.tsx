"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Shield, ShieldCheck, Database, Smartphone, FileText, ChevronDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is this calculator monorepo?",
    answer: "This is a full-stack, secure, and scalable cost calculator suite built using Next.js + React for the frontend, NestJS for the backend API layer, Redis for data caching, and Prisma to manage SQLite database transactions."
  },
  {
    question: "How do I start calculating costs?",
    answer: "Click 'Get Started' to enter the portal. You can register a new account or sign in using the provided demo credentials to access the construction cost sheet, kitchen woodwork customizer, interior door builders, and reports panels."
  },
  {
    question: "Can I manage product pricing and configurations?",
    answer: "Yes, by signing in as an Administrator using the admin credentials, you can access the Admin Dashboard to add new brands, change catalog product rates, configure door options, and view quotes stats."
  },
  {
    question: "How does the caching optimization work?",
    answer: "The NestJS backend checks Redis for configurations and product listings before reading from the SQLite file. If Redis goes offline, the API automatically triggers an in-memory fallback cache so that execution never halts."
  }
];

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-150/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-sky-100/30 rounded-full blur-3xl" />

      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-violet-900 text-white py-16 px-4 sm:px-6 lg:px-8 text-center relative shadow-lg">
        <div className="mx-auto max-w-4xl space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wider uppercase backdrop-blur-sm border border-white/10"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Monorepo Secure Workspace
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl font-extrabold sm:text-5xl lg:text-6xl tracking-tight"
          >
            🏠 Cost Calculator Portal
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-base sm:text-lg text-indigo-100 max-w-2xl mx-auto leading-relaxed"
          >
            Complete estimation system for custom floor construction, modular kitchen woodwork, customized doors, and wardrobe projects.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="pt-4 flex flex-wrap justify-center gap-3.5"
          >
            <Button
              onClick={() => router.push(user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login")}
              className="bg-white hover:bg-slate-100 text-indigo-700 font-bold px-8 py-3.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-950/20"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl"
            >
              📖 Documentation
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
        <h2 className="text-xl font-bold text-center text-slate-800 tracking-tight">Key System Capabilities</h2>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="👨‍💼"
            title="Admin Dashboard"
            desc="Expose catalog products master CRUD, categories, woodwork option prices, and custom doors templates."
          />
          <FeatureCard
            icon="🛍️"
            title="Customer Workspace"
            desc="Interactive area slider, quality grade presets, Cascade Door config matrix, and cart selectors."
          />
          <FeatureCard
            icon="📱"
            title="WhatsApp Integration"
            desc="Send compiled quote details directly via WhatsApp API with all costing notes formatted."
          />
          <FeatureCard
            icon="💾"
            title="Caching Layer (Redis)"
            desc="Accelerate catalog and config checks via Redis cache module with dynamic local memory fallbacks."
          />
          <FeatureCard
            icon="🎯"
            title="Rate Limiter & Security"
            desc="NestJS Throttler rate limiter and Helmet HTTP headers block endpoint abuse and spoofing."
          />
          <FeatureCard
            icon="📊"
            title="Reports & PDF Export"
            desc="Download detailed PDF invoices with items table breakdowns, installation charges, and taxes."
          />
        </div>
      </section>

      {/* Demo Credentials Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <span>🎮</span> Standard Demo Credentials
          </h2>
          <p className="text-xs text-indigo-700 font-semibold mt-1">
            Explore the dual-role workspace using pre-configured mock credentials:
          </p>

          <div className="grid gap-6 sm:grid-cols-2 mt-6">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="py-4 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                  👤 Customer View
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs font-semibold text-slate-700">
                <div>Email: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">customer@demo.com</code></div>
                <div>Password: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">customer123</code></div>
                <p className="text-[10px] text-slate-500 font-normal pt-2">
                  Build shopping carts, configure doors, and download PDF quotes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="py-4 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                  👨‍💼 Admin Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs font-semibold text-slate-700">
                <div>Email: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">admin@demo.com</code></div>
                <div>Password: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">admin123</code></div>
                <p className="text-[10px] text-slate-500 font-normal pt-2">
                  Full CRUD access to woodwork parameters, door structures, and quote requests list.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-16 space-y-6">
        <h2 className="text-xl font-bold text-center text-slate-800 tracking-tight">Frequently Asked Questions</h2>
        
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFAQ === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFAQ(isOpen ? null : index)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-slate-800 text-xs sm:text-sm hover:text-indigo-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-indigo-500 flex-shrink-0" />
                    {faq.question}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                
                {isOpen && (
                  <div className="px-5 pb-4 pt-0 text-xs sm:text-sm leading-relaxed text-slate-600 border-t border-slate-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-white">
      <CardContent className="p-6 text-center space-y-3">
        <div className="text-3xl">{icon}</div>
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        <p className="text-xs leading-relaxed text-slate-500">{desc}</p>
      </CardContent>
    </Card>
  );
}
