// generate_ics.js
// Reads data.json and writes docs/calendar.ics
// Run with: node generate_ics.js

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data.json');
const outPath = path.join(__dirname, 'docs', 'calendar.ics');

const festivals = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function toICSDateTime(dateStr, timeStr) {
  // dateStr: "2026-08-14", timeStr: "14:00" -> "20260814T140000"
  const [y, m, d] = dateStr.split('-');
  const [hh, mm] = (timeStr || '00:00').split(':');
  return `${y}${m}${d}T${hh}${mm}00`;
}

function escapeText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line) {
  // iCal spec: lines should be folded at 75 octets. Keep it simple/safe.
  const max = 73;
  if (line.length <= max) return line;
  let result = '';
  let first = true;
  while (line.length > 0) {
    const chunkSize = first ? max : max - 1;
    result += (first ? '' : '\r\n ') + line.slice(0, chunkSize);
    line = line.slice(chunkSize);
    first = false;
  }
  return result;
}

const now = new Date();
const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

let ics = [];
ics.push('BEGIN:VCALENDAR');
ics.push('VERSION:2.0');
ics.push('PRODID:-//Festival Calendar//EN');
ics.push('CALSCALE:GREGORIAN');
ics.push('X-WR-CALNAME:Festivals');

festivals.forEach((f, i) => {
  const uid = `festival-${i}-${f.name.replace(/\s+/g, '-').toLowerCase()}@festival-ical`;
  const dtstart = toICSDateTime(f.startDate, f.startTime);
  const dtend = toICSDateTime(f.endDate || f.startDate, f.endTime || f.startTime);
  const ticketStatus = f.hasTickets ? '✅ Tickets confirmed' : '❌ No tickets yet';
  const description = escapeText(`${ticketStatus}${f.notes ? ' — ' + f.notes : ''}`);
  const summary = escapeText(`${f.hasTickets ? '🎟️' : '⚠️'} ${f.name}`);

  ics.push('BEGIN:VEVENT');
  ics.push(`UID:${uid}`);
  ics.push(`DTSTAMP:${dtstamp}`);
  ics.push(foldLine(`DTSTART:${dtstart}`));
  ics.push(foldLine(`DTEND:${dtend}`));
  ics.push(foldLine(`SUMMARY:${summary}`));
  ics.push(foldLine(`LOCATION:${escapeText(f.location)}`));
  ics.push(foldLine(`DESCRIPTION:${description}`));
  ics.push('END:VEVENT');
});

ics.push('END:VCALENDAR');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, ics.join('\r\n') + '\r\n', 'utf8');

console.log(`Wrote ${festivals.length} events to ${outPath}`);