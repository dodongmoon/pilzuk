export function uniquePhrases(records) {
  const seen = new Set();
  return records.filter(record => {
    if (seen.has(record.text)) return false;
    seen.add(record.text);
    return true;
  });
}

// Shuffle a bag so every distinct phrase appears once before the next cycle.
export function makeBag(records, previousText = '', random = Math.random) {
  const bag = [...uniquePhrases(records)];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  if (bag.length > 1 && bag[bag.length - 1].text === previousText) {
    [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
  return bag;
}

export function filterRecords(records, { year = 'all', type = 'all', query = '' } = {}) {
  const normalized = query.trim().normalize('NFC').toLocaleLowerCase('ko').replace(/\s+/g, '');
  return records.filter(record => {
    if (year !== 'all' && record.year !== Number(year)) return false;
    if (type === 'csat' && record.examType !== 'suneung') return false;
    if (type === 'mock' && record.examType === 'suneung') return false;
    return `${record.text} ${record.source} ${record.examName} ${record.year} ${record.academicYear}`.normalize('NFC').toLocaleLowerCase('ko').replace(/\s+/g, '').includes(normalized);
  });
}

export function examLabel(record) {
  const date = `${record.year}년 ${record.month}월`;
  if (record.examType === 'suneung') return `${date} · ${record.academicYear}학년도 대학수학능력시험`;
  if (record.examType === 'evaluation') return `${date} · ${record.academicYear}학년도 ${record.examName}`;
  if (record.examType === 'sample') return record.examName.includes('예비') ? `${date} · ${record.academicYear}학년도 수능 예비시행` : `${date} 공개 · ${record.academicYear}학년도 수능 예시문항`;
  if (record.examType === 'preliminary') return `${date} · ${record.academicYear}학년도 예비시행`;
  return `${date} 시행 · ${record.examName}${record.grade ? ' · ' + record.grade : ''}`;
}

export function sourceLabel(record) {
  if (record.sourceStatus === 'unknown') return '출전 미상';
  return record.source + (record.sourceStatus === 'estimated' ? ' (출전 추정)' : '');
}
