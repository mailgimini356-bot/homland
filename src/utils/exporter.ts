import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { SavedLink } from "../types";

export async function generateDocxBlob(links: SavedLink[]): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "قائمة الروابط المحفوظة (من بنترست والويب)",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Paragraph({
            text: `تم توليد هذا التقرير تلقائياً بواسطة أداة Link Clipper الذكية في تاريخ: ${new Date().toLocaleDateString('ar-SA')}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 500 },
          }),
          ...links.flatMap(link => [
            new Paragraph({
              children: [
                new TextRun({
                  text: link.title || "رابط محفوظ",
                  bold: true,
                  size: 26, // 13pt
                  color: "0F172A",
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "التصنيف الرئيسي: ", bold: true, color: "475569" }),
                new TextRun({ text: link.category || "عام", color: "475569" }),
                new TextRun({ text: "   |   التاريخ: ", bold: true, color: "475569" }),
                new TextRun({ text: link.timestamp || "", color: "475569" }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "الوصف والتحليل: ", bold: true, color: "475569" }),
                new TextRun({ text: link.description || "لا يوجد وصف متوفر.", color: "334155" }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "الوسوم: ", bold: true, color: "475569" }),
                new TextRun({ text: link.tags.map(t => `#${t}`).join("، "), color: "0284C7" }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "الرابط الأصلي: ", bold: true, color: "0284C7" }),
                new TextRun({ text: link.url, color: "0284C7", underline: {} }),
              ],
              spacing: { after: 300 },
            }),
            new Paragraph({
              text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          ])
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function generateTxtContent(links: SavedLink[]): string {
  if (links.length === 0) return "";
  return links.map(link => {
    return `العنوان: ${link.title}
التصنيف: ${link.category}
التاريخ: ${link.timestamp}
الرابط: ${link.url}
الوصف: ${link.description}
الوسوم: ${link.tags.join(", ")}
--------------------------------------------------`;
  }).join("\n\n");
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerTxtDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, filename);
}
