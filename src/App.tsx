/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Clipboard, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  FileText, 
  Globe, 
  Settings, 
  Code, 
  Copy, 
  ExternalLink, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Play, 
  Square, 
  Laptop, 
  ListFilter,
  AlertCircle,
  Edit,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SavedLink } from "./types";
import { generateDocxBlob, generateTxtContent, triggerDownload, triggerTxtDownload } from "./utils/exporter";
import { pythonScriptContent, windowsBatchScript } from "./utils/pythonCode";

// دالة التحقق من صحة الرابط
const isUrl = (text: string): boolean => {
  const trimmed = text.trim();
  const regex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?(\?.*)?$/i;
  return regex.test(trimmed);
};

// استخراج الروابط من النص الطويل
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

export default function App() {
  // القائمة الافتراضية للروابط لتكون البداية ممتلئة بأمثلة تفاعلية
  const [links, setLinks] = useState<SavedLink[]>(() => {
    const saved = localStorage.getItem("saved_links");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: "1",
        url: "https://www.pinterest.com/pin/123456789/",
        title: "تصميم مكرامي جداري عصري - ديكور بوهيمي",
        category: "ديكور",
        description: "لوحة جدارية مصنوعة يدوياً من خيوط القطن الطبيعي لتزيين غرف المعيشة والمساحات الضيقة.",
        tags: ["ديكور", "بوهيمي", "مكرامي"],
        timestamp: "27/6/2026، 01:15 ص"
      },
      {
        id: "2",
        url: "https://www.pinterest.com/pin/987654321/",
        title: "وصفة كعكة الشوكولاتة الداكنة السهلة",
        category: "طبخ",
        description: "طريقة عمل كيكة الشوكولاتة الغنية بصلصة الكاكاو والقهوة السريعة في 30 دقيقة.",
        tags: ["طبخ", "حلويات", "كيك"],
        timestamp: "27/6/2026، 01:22 ص"
      }
    ];
  });

  const [inputUrl, setInputUrl] = useState("");
  const [contextText, setContextText] = useState("");
  const [bulkText, setBulkText] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [activeTab, setActiveTab] = useState<"clipper" | "desktop">("clipper");
  
  // حالة مراقبة حافظة المتصفح
  const [isListeningBrowser, setIsListeningBrowser] = useState(false);
  const [lastClipboardVal, setLastClipboardVal] = useState("");
  const [clipboardLog, setClipboardLog] = useState<string[]>([]);
  
  // حالات التحميل والرسائل والنسخ
  const [isLoading, setIsLoading] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: "success" | "info" | "error"} | null>(null);
  
  // تعديل يدوي للرابط
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);

  // تخزين الحافظة محلياً
  useEffect(() => {
    localStorage.setItem("saved_links", JSON.stringify(links));
  }, [links]);

  // إظهار التنبيهات المؤقتة
  const showNotification = (message: string, type: "success" | "info" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // معالجة إضافة رابط مفرد
  const handleAddSingleLink = async (urlToAdd?: string, customContext?: string) => {
    const targetUrl = (urlToAdd || inputUrl).trim();
    if (!targetUrl) {
      showNotification("يرجى إدخال الرابط أولاً", "error");
      return;
    }

    if (!isUrl(targetUrl)) {
      showNotification("الرابط المدخل غير صالح، يرجى التأكد منه", "error");
      return;
    }

    // التحقق من تكرار الرابط
    if (links.some(l => l.url.toLowerCase() === targetUrl.toLowerCase())) {
      showNotification("هذا الرابط تم حفظه مسبقاً في القائمة", "info");
      setInputUrl("");
      return;
    }

    setIsLoading(true);
    showNotification("جاري تحليل الرابط باستخدام ذكاء Gemini الاصطناعي...", "info");

    try {
      const response = await fetch("/api/enrich-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          contextText: customContext || contextText
        })
      });

      if (!response.ok) throw new Error("فشل الاتصال بالخادم");
      const enrichedData = await response.json();

      const newLink: SavedLink = {
        id: Date.now().toString(),
        url: targetUrl,
        title: enrichedData.title || "رابط ويب جديد",
        category: enrichedData.category || "عام",
        description: enrichedData.description || "لا يوجد وصف متوفر حالياً.",
        tags: enrichedData.tags || ["ويب"],
        timestamp: new Date().toLocaleString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          year: "numeric",
          month: "numeric",
          day: "numeric"
        })
      };

      setLinks(prev => [newLink, ...prev]);
      showNotification(`تم حفظ وتصنيف الرابط بنجاح: ${newLink.title}`, "success");
      
      if (!urlToAdd) {
        setInputUrl("");
        setContextText("");
      }
    } catch (error) {
      console.error(error);
      // إضافة الرابط بشكل مبدئي عند تعذر الاتصال بالذكاء الاصطناعي
      const domain = new URL(targetUrl).hostname;
      const fallbackLink: SavedLink = {
        id: Date.now().toString(),
        url: targetUrl,
        title: domain.replace("www.", "") || "رابط محفوظ",
        category: targetUrl.includes("pinterest") ? "ديكور" : "عام",
        description: "تم الحفظ تلقائياً بدون تحليل ذكي بسبب عطل مؤقت في الشبكة.",
        tags: targetUrl.includes("pinterest") ? ["بنترست", "تصميم"] : ["ويب"],
        timestamp: new Date().toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true })
      };
      setLinks(prev => [fallbackLink, ...prev]);
      showNotification("تم حفظ الرابط بالوضع الاحتياطي (تعذر الاتصال بـ Gemini)", "info");
      if (!urlToAdd) {
        setInputUrl("");
        setContextText("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // معالجة استخراج الروابط من النص الطويل
  const handleBulkExtract = () => {
    if (!bulkText.trim()) {
      showNotification("يرجى لصق نص ممتلئ بالروابط أولاً", "error");
      return;
    }

    const foundUrls = extractUrls(bulkText);
    if (foundUrls.length === 0) {
      showNotification("لم يتم العثور على أي روابط صالحة في النص المستند", "error");
      return;
    }

    // تصفية الروابط التي لم تحفظ بعد
    const uniqueNewUrls = foundUrls.filter(
      url => !links.some(l => l.url.toLowerCase() === url.toLowerCase())
    );

    if (uniqueNewUrls.length === 0) {
      showNotification("جميع الروابط المستخرجة موجودة بالفعل في القائمة", "info");
      return;
    }

    showNotification(`تم العثور على ${foundUrls.length} رابطاً. جاري معالجة الروابط الفريدة تلقائياً...`, "info");
    
    // إضافة الروابط بالتتابع لتجنب الضغط على الخادم
    uniqueNewUrls.forEach((url, index) => {
      setTimeout(() => {
        handleAddSingleLink(url, `مستخرج من نص مجمع: ${bulkText.slice(0, 150)}...`);
      }, index * 2000);
    });

    setBulkText("");
  };

  // محاكاة المراقبة التلقائية لحافظة المتصفح
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkBrowserClipboard = async () => {
      if (!isListeningBrowser) return;
      try {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (trimmed && trimmed !== lastClipboardVal && isUrl(trimmed)) {
          setLastClipboardVal(trimmed);
          setClipboardLog(prev => [`[${new Date().toLocaleTimeString('ar-SA')}] تم رصد رابط جديد: ${trimmed.slice(0, 45)}...`, ...prev.slice(0, 10)]);
          
          // التأكد من عدم الحفظ المتكرر
          if (!links.some(l => l.url.toLowerCase() === trimmed.toLowerCase())) {
            handleAddSingleLink(trimmed, "تم جلبه تلقائياً عبر ميزة مراقبة حافظة المتصفح");
          }
        }
      } catch (err) {
        // فشل الصلاحية أو عدم التركيز
      }
    };

    if (isListeningBrowser) {
      // فحص أولي
      checkBrowserClipboard();
      // فحص عند عودة التركيز للنافذة وهو الأكثر أماناً في المتصفحات
      window.addEventListener("focus", checkBrowserClipboard);
      // فحص دوري اختياري
      interval = setInterval(checkBrowserClipboard, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", checkBrowserClipboard);
    };
  }, [isListeningBrowser, lastClipboardVal, links]);

  // تبديل حالة مراقبة حافظة المتصفح
  const toggleBrowserListening = async () => {
    if (!isListeningBrowser) {
      try {
        // طلب الإذن الأولي لقراءة الحافظة
        await navigator.clipboard.readText();
        setIsListeningBrowser(true);
        setLastClipboardVal("");
        showNotification("تم تفعيل ميزة مراقبة الحافظة بالمتصفح! انسخ أي رابط وافتح هذه الصفحة ليتم حفظه فوراً", "success");
      } catch (e) {
        showNotification("يرجى منح صلاحية الحافظة للموقع لكي تعمل الميزة التلقائية", "error");
      }
    } else {
      setIsListeningBrowser(false);
      showNotification("تم إيقاف ميزة المراقبة التلقائية بالمتصفح", "info");
    }
  };

  // نسخ الرابط يدوياً
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkId(id);
    showNotification("تم نسخ الرابط إلى الحافظة", "success");
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // حذف رابط من القائمة
  const handleDeleteLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    showNotification("تم حذف الرابط من القائمة بنجاح", "success");
  };

  // تحديث بيانات رابط تم تعديله يدوياً
  const handleSaveEdit = () => {
    if (!editingLink) return;
    setLinks(prev => prev.map(l => l.id === editingLink.id ? editingLink : l));
    setEditingLink(null);
    showNotification("تم حفظ التعديلات بنجاح", "success");
  };

  // تصفير القائمة كاملة
  const handleClearAll = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في حذف جميع الروابط المحفوظة؟")) {
      setLinks([]);
      localStorage.removeItem("saved_links");
      showNotification("تم تصفير قائمة الروابط بالكامل", "success");
    }
  };

  // تصدير كملف Word DOCX
  const handleExportDocx = async () => {
    if (links.length === 0) {
      showNotification("القائمة فارغة، أضف بعض الروابط للتصدير", "error");
      return;
    }
    try {
      showNotification("جاري توليد مستند Word منمق...", "info");
      const blob = await generateDocxBlob(links);
      triggerDownload(blob, "Saved_Pinterest_Links.docx");
      showNotification("تم تحميل ملف Saved_Pinterest_Links.docx بنجاح!", "success");
    } catch (err) {
      showNotification("حدث خطأ أثناء توليد ملف Word", "error");
    }
  };

  // تصدير كملف نصي TXT
  const handleExportTxt = () => {
    if (links.length === 0) {
      showNotification("القائمة فارغة، أضف بعض الروابط للتصدير", "error");
      return;
    }
    const content = generateTxtContent(links);
    triggerTxtDownload(content, "Saved_Links.txt");
    showNotification("تم تحميل ملف Saved_Links.txt بنجاح!", "success");
  };

  // نسخ كود بايثون البرمجي لسطح المكتب
  const copyPythonScript = () => {
    navigator.clipboard.writeText(pythonScriptContent);
    setCopiedScript(true);
    showNotification("تم نسخ كود بايثون البرمجي لسطح المكتب!", "success");
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // تنزيل كود البايثون كملف جاهز للتشغيل
  const downloadPythonScriptFile = () => {
    const blob = new Blob([pythonScriptContent], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, "pinterest_clipper_desktop.py");
    showNotification("تم تحميل ملف pinterest_clipper_desktop.py الجاهز للتشغيل!", "success");
  };

  // تنزيل ملف معالج بناء EXE التلقائي لنظام ويندوز
  const downloadWindowsBatchFile = () => {
    const blob = new Blob([windowsBatchScript], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, "build_windows.bat");
    showNotification("تم تحميل ملف build_windows.bat التلقائي لبناء تطبيق EXE!", "success");
  };

  // استخراج قائمة التصنيفات الفريدة المتاحة
  const categories = ["الكل", ...Array.from(new Set(links.map(l => l.category)))];

  // تصفية الروابط المعروضة بناءً على البحث والتصنيف المحدد
  const filteredLinks = links.filter(link => {
    const matchesSearch = 
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      link.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = selectedCategory === "الكل" || link.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950" dir="rtl">
      
      {/* شريط الإشعارات العائمة */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${
              notification.type === "success" ? "bg-emerald-950 border-emerald-500 text-emerald-200" :
              notification.type === "error" ? "bg-rose-950 border-rose-500 text-rose-200" :
              "bg-cyan-950 border-cyan-500 text-cyan-200"
            }`}
          >
            {notification.type === "success" && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
            {notification.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {notification.type === "info" && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />}
            <span className="font-medium text-sm md:text-base">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الهيدر الرئيسي الفخم */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-cyan-600 to-pink-600 rounded-2xl shadow-lg shadow-cyan-950/50">
              <Clipboard className="w-6 h-6 text-white" id="main-logo-icon" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">
                حافظ الروابط الذكي & بنترست
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                تجميع الروابط التلقائي، التصنيف الذكي بـ Gemini، والتصدير المباشر لـ Word
              </p>
            </div>
          </div>
          
          {/* محدد التبويبات الفخم */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 self-stretch sm:self-auto shadow-inner">
            <button 
              onClick={() => setActiveTab("clipper")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "clipper" 
                  ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-md shadow-cyan-950/50" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>مستودع الويب الذكي</span>
            </button>
            <button 
              onClick={() => setActiveTab("desktop")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "desktop" 
                  ? "bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-md shadow-pink-950/50" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>تطبيق سطح المكتب 💻</span>
            </button>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* التبويب الأول: مستودع الويب الذكي */}
        {activeTab === "clipper" && (
          <div className="space-y-8">
            
            {/* إحصائيات سريعة ومراقبة المتصفح */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* إجمالي الروابط */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <FileText className="w-32 h-32 text-white" />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-medium text-slate-400 block mb-1">إجمالي الروابط</span>
                    <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">{links.length}</span>
                  </div>
                  <div className="p-2.5 bg-cyan-950/50 rounded-xl border border-cyan-800/40 text-cyan-400">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <span className="text-xs text-slate-500 block mt-4">تم حفظها وتصنيفها محلياً في المتصفح</span>
              </div>

              {/* بنترست وحصتها */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Check className="w-32 h-32 text-white" />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-medium text-slate-400 block mb-1">روابط Pinterest</span>
                    <span className="text-3xl font-extrabold text-pink-400 tracking-tight">
                      {links.filter(l => l.url.includes("pinterest") || l.url.includes("pin.it")).length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-pink-950/50 rounded-xl border border-pink-800/40 text-pink-400">
                    <span className="text-lg font-bold">P</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 block mt-4">مصادر الإلهام والديكور والأزياء</span>
              </div>

              {/* حالة مراقبة حافظة المتصفح الفعالة */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl col-span-1 md:col-span-2 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                      مراقبة الحافظة بالمتصفح
                      <span className={`w-2 h-2 rounded-full ${isListeningBrowser ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`}></span>
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      عند التشغيل، يستشعر الموقع أي رابط تقوم بنسخه بمجرد تنشيط النافذة ويقوم بتحليله وحفظه تلقائياً.
                    </p>
                  </div>
                  <button 
                    onClick={toggleBrowserListening}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isListeningBrowser 
                        ? "bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800" 
                        : "bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800"
                    }`}
                  >
                    {isListeningBrowser ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isListeningBrowser ? "إيقاف المراقبة" : "تشغيل المراقبة"}</span>
                  </button>
                </div>

                {isListeningBrowser && clipboardLog.length > 0 && (
                  <div className="mt-4 bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-16 overflow-y-auto">
                    <span className="text-[10px] font-mono text-emerald-400 block border-b border-slate-800 pb-1 mb-1">مراقب الحافظة النشط:</span>
                    <p className="text-[11px] font-mono text-slate-300 leading-relaxed truncate">{clipboardLog[0]}</p>
                  </div>
                )}
              </div>

            </div>

            {/* قسم الإدخال وإدراج الروابط */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* إضافة رابط منفرد مع ذكاء Gemini الاصطناعي */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 p-4 opacity-5 pointer-events-none">
                  <Sparkles className="w-16 h-16 text-cyan-400" />
                </div>

                <div className="flex items-center gap-2.5 mb-6">
                  <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">إضافة رابط ذكي ومحلل</h3>
                    <p className="text-xs text-slate-400">الصق رابطاً واحداً لنقوم باستخراجه وتحليله بالذكاء الاصطناعي الفائق</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">عنوان الرابط (URL):</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://www.pinterest.com/pin/..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all pl-12 text-left"
                        dir="ltr"
                      />
                      <Globe className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">ملاحظات أو سياق إضافي (اختياري):</label>
                    <textarea 
                      value={contextText}
                      onChange={(e) => setContextText(e.target.value)}
                      placeholder="اكتب أي ملاحظة عن هذا الرابط لتساعد الذكاء الاصطناعي في تحديد التصنيف والوسوم الدقيقة"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all h-20 resize-none leading-relaxed"
                    />
                  </div>

                  <button 
                    onClick={() => handleAddSingleLink()}
                    disabled={isLoading || !inputUrl.trim()}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                    ) : (
                      <Plus className="w-5 h-5 text-slate-950" />
                    )}
                    <span>{isLoading ? "جاري التحليل والحفظ الذكي..." : "إضافة وتحليل الرابط"}</span>
                  </button>
                </div>
              </div>

              {/* استخراج جماعي من نصوص مجمعة */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="p-2 bg-pink-950 text-pink-400 rounded-lg">
                    <Clipboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">صندوق الاستخراج الجماعي</h3>
                    <p className="text-xs text-slate-400">انسخ نصاً طويلاً من شات أو منشور، وسنقوم باستخراج كافة الروابط منه دفعة واحدة</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">النص المنسوخ بالكامل:</label>
                    <textarea 
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="لصق النص هنا... مثلاً: 'هذه مجموعة من روابط الديكور التي وجدتها اليوم: https://pin.it/abc و أيضاً رابط رائع للطبخ https://pin.it/def'"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-pink-500 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all h-40 resize-none leading-relaxed"
                    />
                  </div>

                  <button 
                    onClick={handleBulkExtract}
                    disabled={isLoading || !bulkText.trim()}
                    className="w-full bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span>تصفية واستخراج الروابط وحفظها تلقائياً</span>
                  </button>
                </div>
              </div>

            </div>

            {/* قسم إدارة الروابط المحفوظة وتصدير الملفات */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              
              {/* البار العلوي للإجراءات، البحث، والتصدير */}
              <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex flex-col xl:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-lg font-bold">مستودع الروابط المحفوظة</h3>
                  <p className="text-xs text-slate-400 mt-1">ابحث، رتب، قم بتصدير القائمة مباشرة إلى ملفات Word و TXT مهيأة للتحميل</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  {/* البحث */}
                  <div className="relative flex-1 sm:flex-none min-w-[200px]">
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ابحث بالعنوان أو الرابط أو الوسوم..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-100 outline-none transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* أزرار التصدير */}
                  <button 
                    onClick={handleExportDocx}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل Word (DOCX)</span>
                  </button>

                  <button 
                    onClick={handleExportTxt}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>تنزيل قائمة نصية (TXT)</span>
                  </button>

                  <button 
                    onClick={handleClearAll}
                    title="تفريغ المستودع"
                    className="p-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* فلتر التصنيفات */}
              <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800 flex items-center gap-3 overflow-x-auto">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
                  <ListFilter className="w-3.5 h-3.5" />
                  تصفيات سريعة:
                </span>
                <div className="flex items-center gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        selectedCategory === cat 
                          ? "bg-cyan-500 text-slate-950 font-bold" 
                          : "bg-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* قائمة الكروت للروابط */}
              <div className="p-6 md:p-8">
                {filteredLinks.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                      <Globe className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-slate-300 font-bold text-base">لا توجد روابط تطابق فلتر البحث</h4>
                      <p className="text-slate-500 text-xs mt-1">جرب إدخال روابط جديدة أو تعديل فلتر البحث أعلاه</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatePresence>
                      {filteredLinks.map((link) => (
                        <motion.div
                          key={link.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-slate-900/60 rounded-2xl border border-slate-800/60 hover:border-slate-700/80 p-5 flex flex-col justify-between gap-4 transition-all relative group"
                        >
                          <div>
                            {/* تصنيف ووقت الكارت */}
                            <div className="flex justify-between items-center mb-3">
                              <span className="px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800/40 text-[11px] font-bold rounded-full">
                                {link.category}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {link.timestamp}
                              </span>
                            </div>

                            {/* العنوان */}
                            <h4 className="text-sm font-bold text-slate-100 leading-snug tracking-tight mb-2 group-hover:text-cyan-400 transition-colors">
                              {link.title}
                            </h4>

                            {/* الرابط الصغير */}
                            <p className="text-xs text-slate-500 font-mono truncate text-left mb-3 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-900">
                              {link.url}
                            </p>

                            {/* الوصف */}
                            <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                              {link.description}
                            </p>
                          </div>

                          {/* الوسوم والتحكم الذكي */}
                          <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                            <div className="flex flex-wrap gap-1.5">
                              {link.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] font-medium text-slate-500">
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* أزرار الإجراءات */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              
                              <button
                                onClick={() => setEditingLink(link)}
                                title="تعديل يدوي"
                                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => copyToClipboard(link.url, link.id)}
                                title="نسخ الرابط"
                                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all relative cursor-pointer"
                              >
                                {copiedLinkId === link.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                title="فتح في صفحة جديدة"
                                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              <button
                                onClick={() => handleDeleteLink(link.id)}
                                title="حذف"
                                className="p-2 hover:bg-rose-950/50 hover:text-rose-400 text-slate-500 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* التبويب الثاني: تطبيق سطح المكتب البرمجي */}
        {activeTab === "desktop" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            
            {/* بطاقة توضيحية فخمة */}
            <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-pink-950/30 p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 p-8 opacity-5 pointer-events-none">
                <Laptop className="w-24 h-24 text-pink-400" />
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                <div className="p-4 bg-pink-950 text-pink-400 rounded-2xl shrink-0 border border-pink-800/30">
                  <Laptop className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">تحويل كود البايثون لتطبيق سطح مكتب متكامل 💻</h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    لقد قمنا بتحديث وتحسين كود البايثون الخاص بك وإضافة **واجهة مستخدم رسومية حديثة (Dark Mode Modern GUI)** مبنية على مكتبة Tkinter مع معالجة خيوط التنفيذ لحل مشكلة تجمد الشاشة وحفظ ملفات Word تلقائياً.
                  </p>
                </div>
              </div>

              {/* أزرار الإجراءات السريعة للكود */}
              <div className="flex flex-wrap gap-3 mt-4">
                <button 
                  onClick={copyPythonScript}
                  className="flex items-center gap-2 px-5 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? "تم نسخ الكود البرمجي!" : "نسخ كود البايثون الكامل"}</span>
                </button>

                <button 
                  onClick={downloadPythonScriptFile}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل الملف البرمجي (.py)</span>
                </button>

                <button 
                  onClick={downloadWindowsBatchFile}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950 animate-bounce" />
                  <span>تنزيل أداة تحويل الـ EXE التلقائية بنقرة واحدة (.bat) ⚡</span>
                </button>
              </div>
            </div>

            {/* خطوات تشغيل وتثبيت البرنامج بالتفصيل */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <span>كيفية تثبيت وتشغيل التطبيق على جهاز الكمبيوتر الخاص بك</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* خطوة 1 */}
                <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-cyan-400 block mb-2">الخطوة الأولى: تثبيت المتطلبات</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      تأكد من تثبيت بايثون على جهازك، ثم افتح نافذة الأوامر (Command Prompt أو Terminal) وانسخ السطر التالي لتثبيت المكتبات اللازمة للمراقبة وتعديل مستندات Word:
                    </p>
                  </div>
                  <div className="mt-4 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-center relative select-all cursor-pointer text-[11px] text-cyan-300">
                    pip install pyperclip python-docx
                  </div>
                </div>

                {/* خطوة 2 */}
                <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-cyan-400 block mb-2">الخطوة الثانية: تشغيل الكود</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      قم بإنشاء ملف نصي جديد باسم <span className="font-mono text-slate-200">app.py</span> على سطح المكتب، والصق فيه الكود البرمجي المقابل (الذي نسخته أو حملته من الأعلى)، ثم قم بتشغيله بالضغط المزدوج أو كتابة الأمر:
                    </p>
                  </div>
                  <div className="mt-4 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-center text-[11px] text-pink-400">
                    python app.py
                  </div>
                </div>

                {/* خطوة 3 */}
                <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-cyan-400 block mb-2">الخطوة الثالثة: التحويل لبرنامج EXE</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      لتحويل هذا السكربت البرمجي إلى برنامج تنفيذي (.exe) يعمل بنقرة واحدة بدون الحاجة لفتح نافذة الأوامر أو تنصيب بايثون لدى مستخدمين آخرين، قم بتثبيت أداة pyinstaller ثم شغّل:
                    </p>
                  </div>
                  <div className="mt-4 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-center relative select-all cursor-pointer text-[10px] text-amber-300 leading-relaxed">
                    pip install pyinstaller<br/>
                    pyinstaller --noconsole --onefile app.py
                  </div>
                </div>
              </div>

              {/* تحذير وتلميحات هامة */}
              <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  <strong>ملاحظة تقنية هامة:</strong> في الكود المحسن المرفق بالأسفل، قمنا بتطبيق ميزة <span className="font-mono">Threading</span> حتى يظل تطبيق سطح المكتب يستجيب للأزرار ولتتمكن من إيقافه والتحكم به بسهولة في أي وقت دون أن تتجمد واجهته أثناء العمل في الخلفية.
                </p>
              </div>
            </div>

            {/* معاينة الكود الفعلي المطور */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-pink-400" />
                  معاينة الكود المطور المكتوب ببايثون (UI Included)
                </span>
                <button 
                  onClick={copyPythonScript}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الكود</span>
                </button>
              </div>

              <div className="p-6 overflow-x-auto bg-slate-950 font-mono text-xs text-left max-h-[450px]" dir="ltr">
                <pre className="text-emerald-400 leading-relaxed whitespace-pre font-mono">
                  {pythonScriptContent}
                </pre>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* مودال التعديل اليدوي للرابط */}
      <AnimatePresence>
        {editingLink && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 w-full max-w-xl shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-cyan-400" />
                  تعديل معلومات الرابط
                </h3>
                <button 
                  onClick={() => setEditingLink(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <span className="text-sm font-bold">X</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">العنوان:</label>
                  <input 
                    type="text"
                    value={editingLink.title}
                    onChange={(e) => setEditingLink(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-2">التصنيف الرئيسي:</label>
                    <input 
                      type="text"
                      value={editingLink.category}
                      onChange={(e) => setEditingLink(prev => prev ? { ...prev, category: e.target.value } : null)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-2">الوسوم (مفصولة بفاصلة):</label>
                    <input 
                      type="text"
                      value={editingLink.tags.join(", ")}
                      onChange={(e) => setEditingLink(prev => prev ? { ...prev, tags: e.target.value.split(",").map(t => t.trim()) } : null)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">الوصف والتحليل:</label>
                  <textarea 
                    value={editingLink.description}
                    onChange={(e) => setEditingLink(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none h-24 resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
                <button 
                  onClick={() => setEditingLink(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* الفوتر الجميل */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950/40 text-center mt-12 text-xs text-slate-500 leading-relaxed">
        <p>© 2026 حافظ الروابط التلقائي الذكي. جميع الحقوق محفوظة.</p>
        <p className="mt-1">تمت الصياغة باستخدام React و Express مدمجاً بذكاء Gemini الفائق.</p>
      </footer>

    </div>
  );
}
