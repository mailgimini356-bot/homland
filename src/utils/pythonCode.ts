export const pythonScriptContent = `import time
import pyperclip
import re
import os
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import webbrowser
from docx import Document

# أسماء الملفات التي سيتم حفظ الروابط فيها
doc_name = "Saved_Pinterest_Links.docx"
txt_name = "Saved_Links.txt"

# إنشاء ملف الوورد إذا لم يكن موجوداً
def init_files():
    if not os.path.exists(doc_name):
        try:
            doc = Document()
            doc.add_heading('الروابط المحفوظة (بنترست وغيرها)', 0)
            doc.save(doc_name)
        except Exception as e:
            print(f"خطأ أثناء إنشاء ملف Word: {e}")

# دالة للتحقق مما إذا كان النص المنسوخ هو رابط صالح
def is_url(text):
    regex = re.compile(
        r'^(?:http|ftp)s?://' # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\\.)+(?:[A-Z]{2,6}\\.?|[A-Z0-9-]{2,}\\.?)|' # domain...
        r'localhost|' # localhost...
        r'\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})' # ...or ip
        r'(?::\\d+)?' # optional port
        r'(?:/?|[/?]\\S+)$', re.IGNORECASE)
    return re.match(regex, text) is not None

class LinkClipperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("حافظ الروابط التلقائي - تطبيق سطح المكتب")
        self.root.geometry("600x500")
        self.root.configure(bg="#1e1e2e")
        self.root.resizable(False, False)
        
        init_files()
        
        self.is_listening = False
        self.recent_value = ""
        self.listener_thread = None
        
        # تحسين المظهر العام
        self.style = ttk.Style()
        self.style.theme_use("clam")
        
        self.create_widgets()
        
    def create_widgets(self):
        # العنوان الرئيسي
        title_label = tk.Label(
            self.root, 
            text="📋 حافظ روابط بنترست والويب التلقائي", 
            font=("Segoe UI", 16, "bold"), 
            bg="#1e1e2e", 
            fg="#cdd6f4"
        )
        title_label.pack(pady=15)
        
        # حالة الخدمة
        self.status_frame = tk.Frame(self.root, bg="#252538", bd=1, relief="flat")
        self.status_frame.pack(fill="x", padx=20, pady=5)
        
        self.status_indicator = tk.Label(
            self.status_frame, 
            text="● الخدمة متوقفة حالياً", 
            font=("Segoe UI", 11, "bold"), 
            bg="#252538", 
            fg="#f38ba8"
        )
        self.status_indicator.pack(side="right", padx=15, pady=10)
        
        # زر التشغيل والإيقاف
        self.toggle_btn = tk.Button(
            self.status_frame,
            text="بدء المراقبة التلقائية",
            font=("Segoe UI", 10, "bold"),
            bg="#a6e3a1",
            fg="#11111b",
            activebackground="#89b4fa",
            activeforeground="#11111b",
            bd=0,
            cursor="hand2",
            padx=10,
            command=self.toggle_listening
        )
        self.toggle_btn.pack(side="left", padx=15, pady=10)
        
        # قائمة الروابط المحفوظة مؤخراً
        list_label = tk.Label(
            self.root, 
            text="الروابط التي تم حفظها في هذه الجلسة:", 
            font=("Segoe UI", 10, "bold"), 
            bg="#1e1e2e", 
            fg="#bac2de"
        )
        list_label.pack(anchor="ne", padx=20, pady=(15, 5))
        
        # صندوق عرض السجلات
        self.log_box = tk.Text(
            self.root,
            height=12,
            width=65,
            bg="#181825",
            fg="#a6e3a1",
            font=("Consolas", 10),
            bd=0,
            padx=10,
            pady=10
        )
        self.log_box.pack(padx=20, pady=5)
        self.log_box.insert("1.0", "اضغط على زر (بدء المراقبة التلقائية) ثم انسخ أي رابط لتجربة الخدمة...\\n")
        self.log_box.config(state="disabled")
        
        # أزرار الإجراءات السريعة
        btn_frame = tk.Frame(self.root, bg="#1e1e2e")
        btn_frame.pack(pady=15, fill="x", padx=20)
        
        open_doc_btn = tk.Button(
            btn_frame,
            text="📄 فتح ملف Word (DOCX)",
            font=("Segoe UI", 10, "bold"),
            bg="#89b4fa",
            fg="#11111b",
            bd=0,
            cursor="hand2",
            padx=12,
            pady=6,
            command=lambda: self.open_file(doc_name)
        )
        open_doc_btn.pack(side="right", padx=5)
        
        open_txt_btn = tk.Button(
            btn_frame,
            text="📝 فتح ملف نصي (TXT)",
            font=("Segoe UI", 10, "bold"),
            bg="#f9e2af",
            fg="#11111b",
            bd=0,
            cursor="hand2",
            padx=12,
            pady=6,
            command=lambda: self.open_file(txt_name)
        )
        open_txt_btn.pack(side="right", padx=5)
        
        clear_logs_btn = tk.Button(
            btn_frame,
            text="🧹 مسح السجلات",
            font=("Segoe UI", 10, "bold"),
            bg="#45475a",
            fg="#cdd6f4",
            bd=0,
            cursor="hand2",
            padx=12,
            pady=6,
            command=self.clear_logs
        )
        clear_logs_btn.pack(side="left", padx=5)

    def toggle_listening(self):
        if not self.is_listening:
            self.is_listening = True
            self.status_indicator.config(text="● الخدمة نشطة وتراقب الحافظة", fg="#a6e3a1")
            self.toggle_btn.config(text="إيقاف المراقبة التلقائية", bg="#f38ba8")
            self.log_message("[تنبيه] بدأت خدمة مراقبة الحافظة التلقائية...")
            
            # تشغيل المراقبة في خيط منفصل لتجنب تجميد الواجهة رسومياً
            self.listener_thread = threading.Thread(target=self.monitor_clipboard, daemon=True)
            self.listener_thread.start()
        else:
            self.is_listening = False
            self.status_indicator.config(text="● الخدمة متوقفة حالياً", fg="#f38ba8")
            self.toggle_btn.config(text="بدء المراقبة التلقائية", bg="#a6e3a1")
            self.log_message("[تنبيه] تم إيقاف خدمة المراقبة التلقائية.")

    def monitor_clipboard(self):
        while self.is_listening:
            try:
                tmp_value = pyperclip.paste().strip()
                if tmp_value != self.recent_value:
                    self.recent_value = tmp_value
                    if is_url(self.recent_value):
                        self.save_link(self.recent_value)
            except Exception as e:
                pass
            time.sleep(1)

    def save_link(self, link):
        try:
            # الحفظ في ملف نصي
            with open(txt_name, "a", encoding="utf-8") as f:
                f.write(link + "\\n")
            
            # الحفظ في ملف وورد
            doc = Document(doc_name)
            doc.add_paragraph(link)
            doc.save(doc_name)
            
            self.log_message(f"[تم الحفظ بنجاح] : {link}")
        except Exception as e:
            self.log_message(f"[خطأ أثناء الحفظ] : {e}")

    def log_message(self, msg):
        self.log_box.config(state="normal")
        self.log_box.insert("end", f"{msg}\\n")
        self.log_box.see("end")
        self.log_box.config(state="disabled")

    def open_file(self, filename):
        if os.path.exists(filename):
            try:
                os.startfile(filename)
            except AttributeError:
                # للأنظمة الأخرى مثل لينكس أو ماك
                import subprocess
                try:
                    subprocess.call(['open', filename])
                except:
                    try:
                        subprocess.call(['xdg-open', filename])
                    except Exception as e:
                        messagebox.showerror("خطأ", f"لا يمكن فتح الملف تلقائياً: {e}")
        else:
            messagebox.showwarning("تنبيه", f"الملف {filename} غير موجود بعد. يرجى حفظ بعض الروابط أولاً لتوليده.")

    def clear_logs(self):
        self.log_box.config(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.config(state="disabled")

if __name__ == "__main__":
    root = tk.Tk()
    app = LinkClipperApp(root)
    root.mainloop()
`;

export const windowsBatchScript = `@echo off
:: Batch file to compile pinterest_clipper_desktop.py into a Windows .exe automatically
chcp 65001 > nul
title معالج تثبيت وبناء تطبيق حافظ الروابط التلقائي لسطح المكتب

echo ==========================================================
echo    معالج التثبيت وبناء تطبيق حافظ الروابط لسطح المكتب
echo ==========================================================
echo.

:: 1. Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] لم يتم العثور على لغة بايثون (Python) مثبتة على هذا الجهاز!
    echo يرجى تحميل بايثون وتثبيتها من الموقع الرسمي أولاً: https://www.python.org/downloads/
    echo وتأكد من تحديد خيار "Add Python to PATH" أثناء التثبيت.
    echo.
    pause
    exit
)

echo [1/3] تم العثور على لغة بايثون بنجاح.
echo [2/3] جاري تثبيت المكتبات البرمجية المطلوبة (pyperclip, python-docx, pyinstaller)...
python -m pip install --upgrade pip
pip install pyperclip python-docx pyinstaller

if %errorlevel% neq 0 (
    echo [خطأ] حدث خطأ أثناء تثبيت المكتبات. يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.
    pause
    exit
)

echo.
echo [3/3] جاري تحويل السكربت البرمجي إلى تطبيق سطح مكتب مستقل (exe)...
echo يرجى الانتظار قليلاً، قد يستغرق هذا دقيقة أو دقيقتين...
pyinstaller --noconsole --onefile --name="Pinterest_Link_Clipper" pinterest_clipper_desktop.py

if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء ملف الـ EXE. تأكد من وجود ملف pinterest_clipper_desktop.py في نفس المجلد.
    pause
    exit
)

echo.
echo ==========================================================
echo    تم بناء التطبيق بنجاح! مبروك!
echo ==========================================================
echo ستجد ملف التطبيق الجديد باسم "Pinterest_Link_Clipper.exe"
echo داخل مجلد يسمى "dist" في نفس هذا المجلد الحالي.
echo.
echo يمكنك الآن نقل هذا الملف التشغيلي (.exe) إلى سطح المكتب وتشغيله بنقرة واحدة!
echo.
pause
`;
