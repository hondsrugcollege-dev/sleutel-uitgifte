import { TERMS_VERSION, terms } from './config.js';
import { itemList } from './logic.js';

export function buildPdf(s, m, org) {
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = 22;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('Ontvangstbewijs', 20, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`${m.docNo}   ${m.dateShort} ${m.timeShort}`, 190, y, { align: 'right' });
  y += 6; doc.setTextColor(90); doc.text(`Sleutels & alarmtags · ${org}`, 20, y); doc.setTextColor(0);
  y += 4; doc.setLineWidth(0.5); doc.line(20, y, 190, y); y += 10;

  doc.setFontSize(10);
  [['Ontvanger', s.name], ['Afdeling', s.dept || '—'], ['Uitgegeven', m.dateLong]].forEach(([k, v]) => {
    doc.setTextColor(90); doc.text(k, 20, y); doc.setTextColor(0); doc.text(v, 55, y); y += 6;
  });

  y += 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('MIDDEL', 20, y); doc.text('OMSCHRIJVING', 55, y); y += 2; doc.line(20, y, 190, y); y += 6;
  doc.setFontSize(10);
  itemList(s).forEach((it) => {
    doc.setFont('helvetica', 'bold'); doc.text(it.label, 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(it.detail, 55, y);
    y += 3; doc.setDrawColor(210); doc.setLineWidth(0.2); doc.line(20, y, 190, y); doc.setDrawColor(0); y += 6;
  });

  y += 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(`VOORWAARDEN (v${TERMS_VERSION})`, 20, y); y += 5;
  doc.setFont('helvetica', 'normal');
  terms(org).forEach((t) => {
    const lines = doc.splitTextToSize(`${t.n}. ${t.title}. ${t.body}`, 170);
    doc.text(lines, 20, y);
    y += lines.length * 3.6 + 1.6;
  });

  y = Math.max(y + 10, 240);
  if (s.sig) {
    // Passend binnen 72×26 mm met behoud van verhouding (prototype rekte uit).
    const { width, height } = doc.getImageProperties(s.sig);
    const k = Math.min(72 / width, 26 / height);
    doc.addImage(s.sig, 'PNG', 20, y - height * k, width * k, height * k);
  }
  doc.setLineWidth(0.3); doc.line(20, y, 120, y); y += 5;
  doc.setFontSize(9); doc.text(s.name, 20, y);
  doc.setTextColor(90); doc.text(`Getekend ${m.dateShort} ${m.timeShort} · akkoord voorwaarden`, 20, y + 5);
  return doc.output('blob');
}

export async function shareFile(file, title, text) {
  const data = { files: [file] };
  if (title) data.title = title;
  if (text) data.text = text;
  if (navigator.canShare?.(data)) {
    await navigator.share(data);
    return 'shared';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  return 'downloaded';
}
