"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  User,
  Folder,
  FileText,
  Clock,
  FileDown,
  RefreshCw,
  LogOut,
  Calendar,
  Layers,
  CheckCircle,
  TrendingUp,
  Mail,
  Phone,
  Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setSyncing(true);
    try {
      const [projectsRes, quotesRes] = await Promise.all([
        api.projects.get(),
        api.quotes.get()
      ]);
      setProjects(projectsRes || []);
      setQuotes(quotesRes || []);
      setErrorMsg("");
    } catch (err: any) {
      console.error("Customer dashboard fetch error:", err);
      setErrorMsg("Failed to sync project and quote details.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "customer") {
        router.push("/login");
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const downloadQuotePDF = (quote: any) => {
    const doc = new jsPDF();
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CUSTOMER QUOTATION SUMMARY", 14, 25);
    
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.text("Prepared via CIMW Cost Calculator App", 14, 32);

    doc.setTextColor(50);
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("QUOTATION REFERENCE", 14, 55);
    
    const metaData = [
      ["Quote Reference Code", quote.id || "N/A"],
      ["Date Generated", quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString()],
      ["Calculator Model", quote.calculatorUsed || "Modular Kitchen"],
      ["Status", (quote.status || "Approved").toUpperCase()]
    ];
    
    (doc as any).autoTable({
      startY: 60,
      body: metaData,
      theme: "plain",
      styles: { cellPadding: 2, fontSize: 9 }
    });

    const clientY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CLIENT & PROJECT DETAILS", 14, clientY);

    const clientData = [
      ["Client Name", quote.customerName || "N/A"],
      ["Client Email", quote.customerEmail || "N/A"],
      ["City Location", quote.customerLocation || "N/A"],
      ["Linked Folder", quote.projectName || "Standard Project"]
    ];

    (doc as any).autoTable({
      startY: clientY + 5,
      body: clientData,
      theme: "striped",
      styles: { cellPadding: 3, fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`GRAND TOTAL ESTIMATE: ${formatCurrency(quote.totalAmount || 0)}`, 14, finalY);

    doc.save(`Quotation_${quote.customerName ? quote.customerName.replace(/\s+/g, "_") : "Client"}.pdf`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-slate-500">Loading your client workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              Customer Portal
            </h1>
            <p className="text-xs text-slate-400 font-semibold">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={syncing}
              className="h-8 text-xs font-bold border-slate-200"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 text-xs font-black text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" /> Log Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        
        {errorMsg && (
          <div className="bg-red-50 text-red-700 font-bold border border-red-200 rounded-lg p-3 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Quotations</span>
              <FileText className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black">{quotes.length}</div>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                Estimations Received
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Active Projects</span>
              <Folder className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black">{projects.filter((p) => p.status === "active").length}</div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Ongoing Workspaces
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Target Budget Estimate</span>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black">
                {formatCurrency(quotes.reduce((sum, q) => sum + (q.totalAmount || 0), 0))}
              </div>
              <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                Total Budget Preference
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Projects Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase text-slate-500 tracking-wider">Your Project Workspaces</h2>
          
          {projects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-bold text-xs">
              No active project folders linked to your account.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((proj) => (
                <Card key={proj.id} className="border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
                  <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">{proj.name}</CardTitle>
                      <CardDescription className="text-[9px] font-mono">ID: {proj.id}</CardDescription>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      {proj.status || "active"}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    {/* Expected Completion Date */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Target Delivery Date:</span>
                      <span className="font-bold text-slate-800">{proj.expectedCompletionDate || "N/A"}</span>
                    </div>

                    {/* Timeline Log updates */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 block border-b border-slate-100 pb-1">Site Activity Updates</span>
                      <div className="relative border-l-2 border-slate-200 pl-4 ml-1 space-y-3">
                        {proj.timeline && proj.timeline.length > 0 ? (
                          proj.timeline.map((t: any, idx: number) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[21px] top-1 bg-white border-2 border-indigo-600 rounded-full h-2.5 w-2.5"></span>
                              <div>
                                <span className="font-bold text-slate-800 text-[10px] block">{t.title}</span>
                                <span className="text-slate-500 text-[10px] block">{t.notes}</span>
                                <span className="text-[8px] text-slate-400 font-bold block mt-0.5">
                                  {new Date(t.date).toLocaleDateString()} at {new Date(t.date).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 italic">No timeline logs published yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Project images gallery */}
                    {proj.projectImages && proj.projectImages.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 block border-b border-slate-100 pb-1">Project Site Images</span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {proj.projectImages.map((img: string, idx: number) => (
                            <img
                              key={idx}
                              src={img}
                              alt="Project progress"
                              className="h-14 w-20 object-cover rounded border border-slate-200 flex-shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Quotations List Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase text-slate-500 tracking-wider">Your Estimate Sheets</h2>
          
          <Card className="border border-slate-200 bg-white overflow-hidden shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              {quotes.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold text-xs">
                  No estimate quotes generated for you yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Quotation ID</th>
                      <th className="px-4 py-3">Calculator Used</th>
                      <th className="px-4 py-3">Associated Project</th>
                      <th className="px-4 py-3 text-right">Date Generated</th>
                      <th className="px-4 py-3 text-right">Estimate Total</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {quotes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-black text-indigo-900 select-all">{q.id}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 uppercase text-[9.5px]">
                          {q.calculatorUsed || "Modular Kitchen"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{q.projectName || "Standard Estimate"}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-500">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-indigo-600 text-sm">
                          {formatCurrency(q.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            q.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {q.status || "Approved"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadQuotePDF(q)}
                            className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50"
                          >
                            <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </section>

      </main>
      
    </div>
  );
}
