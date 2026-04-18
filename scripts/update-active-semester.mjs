import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'js', 'config.js');

const DEFAULT_SENTINELS = ['ENG101:01', 'MAT110:01', 'CSE110:01'];
const SENTINELS = parseCsv(process.env.NEW_SEMESTER_SENTINELS) || DEFAULT_SENTINELS;
const TERM_SEQUENCE = parseCsv(process.env.TERM_SEQUENCE) || ['spring', 'fall', 'summer'];
const THRESHOLD_DAYS = Number.parseInt(process.env.MID_EXAM_DAY_THRESHOLD || '10', 10);
const CDN_URL = process.env.CDN_URL || 'https://usis-cdn.eniamza.com/connect.json';
const LOCAL_CDN_FILE = process.env.LOCAL_CDN_FILE || '';
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.DRY_RUN || '');

async function main() {
  const configSource = await fs.readFile(configPath, 'utf8');
  const config = loadConfig(configSource);
  const currentSemester = getCurrentSemester(config);
  const currentDataPath = path.join(repoRoot, currentSemester.file);

  const currentPayload = JSON.parse(await fs.readFile(currentDataPath, 'utf8'));
  const currentCourses = extractCourses(currentPayload);
  const livePayload = await loadLivePayload();
  const liveCourses = extractCourses(livePayload);

  if (liveCourses.length === 0) {
    throw new Error('CDN payload is empty.');
  }

  const detection = detectSemesterRollover(currentCourses, liveCourses, SENTINELS, THRESHOLD_DAYS);

  if (detection.isNewSemester) {
    const nextSemester = buildNextSemester(currentSemester, TERM_SEQUENCE);
    const nextDataPath = path.join(repoRoot, nextSemester.file);
    const updatedSemesters = promoteSemester(config.dataSources.semesters, currentSemester.id, nextSemester);

    console.log(`New semester detected from ${detection.courseCode} section ${detection.section}: ${detection.previousDate} -> ${detection.nextDate} (${detection.diffDays} days)`);
    console.log(`Promoting ${nextSemester.name} as active semester.`);

    if (!DRY_RUN) {
      await writeJson(nextDataPath, liveCourses);
      await fs.writeFile(configPath, replaceSemestersBlock(configSource, updatedSemesters), 'utf8');
    }

    return;
  }

  console.log('No new semester detected. Refreshing the active semester archive file from CDN.');

  if (!DRY_RUN) {
    await writeJson(currentDataPath, liveCourses);
  }
}

function parseCsv(value) {
  if (!value) {
    return null;
  }

  const parts = value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : null;
}

function loadConfig(source) {
  const sandbox = {};
  vm.runInNewContext(`${source}\nthis.__CONFIG__ = CONFIG;`, sandbox, { filename: configPath });
  return sandbox.__CONFIG__;
}

function getCurrentSemester(config) {
  const currentSemester = config.dataSources.semesters.find(semester => semester.isCurrent);

  if (!currentSemester) {
    throw new Error('No active semester found in js/config.js.');
  }

  return currentSemester;
}

async function loadLivePayload() {
  if (LOCAL_CDN_FILE) {
    const localPath = path.isAbsolute(LOCAL_CDN_FILE)
      ? LOCAL_CDN_FILE
      : path.join(repoRoot, LOCAL_CDN_FILE);

    console.log(`Loading live payload from local file: ${localPath}`);
    return JSON.parse(await fs.readFile(localPath, 'utf8'));
  }

  console.log(`Fetching live payload from ${CDN_URL}`);
  const response = await fetch(CDN_URL, {
    headers: {
      'cache-control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CDN data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function extractCourses(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload && Array.isArray(payload.sections)) {
    return payload.sections;
  }

  throw new Error('Unsupported payload format. Expected an array, { data: [] }, or { sections: [] }.');
}

function detectSemesterRollover(currentCourses, liveCourses, sentinels, thresholdDays) {
  for (const sentinel of sentinels) {
    const [courseCode, rawSection] = sentinel.split(':');
    const section = normalizeSectionValue(rawSection);
    const currentCourse = findCourse(currentCourses, courseCode, section);
    const liveCourse = findCourse(liveCourses, courseCode, section);

    if (!currentCourse || !liveCourse) {
      continue;
    }

    const currentMidExam = getMidExamDate(currentCourse);
    const liveMidExam = getMidExamDate(liveCourse);

    if (!currentMidExam || !liveMidExam) {
      continue;
    }

    const diffDays = Math.abs(daysBetween(currentMidExam, liveMidExam));

    if (diffDays > thresholdDays) {
      return {
        isNewSemester: true,
        courseCode,
        section,
        previousDate: currentMidExam,
        nextDate: liveMidExam,
        diffDays
      };
    }
  }

  return { isNewSemester: false };
}

function findCourse(courses, courseCode, section) {
  return courses.find(course => {
    const currentCode = String(course.courseCode || '').trim().toUpperCase();
    const currentSection = normalizeSectionValue(getSectionValue(course));
    return currentCode === courseCode.toUpperCase() && currentSection === section;
  }) || null;
}

function getSectionValue(course) {
  if (course.sectionName) {
    return course.sectionName;
  }

  if (course.courseDetails) {
    const match = course.courseDetails.match(/\[(.*?)\]/);
    return match ? match[1] : '';
  }

  return '';
}

function normalizeSectionValue(value) {
  const section = String(value || '').trim();
  if (!section) {
    return '';
  }

  return /^\d+$/.test(section) ? section.padStart(2, '0') : section;
}

function getMidExamDate(course) {
  return (
    course.sectionSchedule?.midExamDate ||
    course.midExamDate ||
    parseDateFromDetail(course.sectionSchedule?.midExamDetail) ||
    parseDateFromDetail(course.midExamDetail) ||
    null
  );
}

function parseDateFromDetail(detail) {
  if (!detail) {
    return null;
  }

  const parsed = new Date(detail);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function daysBetween(left, right) {
  const leftDate = new Date(`${left}T00:00:00Z`);
  const rightDate = new Date(`${right}T00:00:00Z`);
  return Math.round((rightDate - leftDate) / 86400000);
}

function buildNextSemester(currentSemester, sequence) {
  const current = parseSemesterIdentity(currentSemester);
  const currentIndex = sequence.indexOf(current.term);

  if (currentIndex === -1) {
    throw new Error(`Current term "${current.term}" is not present in TERM_SEQUENCE.`);
  }

  const nextIndex = (currentIndex + 1) % sequence.length;
  const nextTerm = sequence[nextIndex];
  const yearIncrement = nextIndex <= currentIndex ? 1 : 0;
  const nextYearFull = current.yearFull + yearIncrement;
  const nextYearShort = String(nextYearFull).slice(-2);

  return {
    id: `${nextTerm}${nextYearShort}`,
    name: `${capitalize(nextTerm)} ${nextYearFull}`,
    file: `data/${nextTerm}-${nextYearShort}.json`,
    year: String(nextYearFull),
    dataFormat: 'spring25',
    isCurrent: true
  };
}

function parseSemesterIdentity(semester) {
  const idMatch = /^(spring|summer|fall)(\d{2})$/i.exec(String(semester.id || ''));
  if (idMatch) {
    return {
      term: idMatch[1].toLowerCase(),
      yearFull: 2000 + Number.parseInt(idMatch[2], 10)
    };
  }

  const nameMatch = /^(Spring|Summer|Fall)\s+(\d{4})$/i.exec(String(semester.name || ''));
  if (nameMatch) {
    return {
      term: nameMatch[1].toLowerCase(),
      yearFull: Number.parseInt(nameMatch[2], 10)
    };
  }

  throw new Error(`Unable to parse semester identity from ${semester.id || semester.name}.`);
}

function promoteSemester(semesters, currentSemesterId, nextSemester) {
  const existingTarget = semesters.find(semester => semester.id === nextSemester.id) || {};

  const remaining = semesters
    .filter(semester => semester.id !== nextSemester.id)
    .map(semester => {
      const nextValue = { ...semester };
      delete nextValue.isCurrent;
      return nextValue;
    });

  return [
    {
      ...existingTarget,
      ...nextSemester,
      isCurrent: true
    },
    ...remaining
  ];
}

function replaceSemestersBlock(source, semesters) {
  const startToken = '    semesters: [';
  const startIndex = source.indexOf(startToken);
  if (startIndex === -1) {
    throw new Error('Unable to locate semesters array in js/config.js.');
  }

  const openBracketIndex = source.indexOf('[', startIndex);
  let depth = 0;
  let closeBracketIndex = -1;

  for (let index = openBracketIndex; index < source.length; index++) {
    const char = source[index];
    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        closeBracketIndex = index;
        break;
      }
    }
  }

  if (closeBracketIndex === -1) {
    throw new Error('Unable to find the end of the semesters array.');
  }

  const rendered = renderSemesters(semesters);
  return `${source.slice(0, startIndex)}    semesters: [\n${rendered}\n    ]${source.slice(closeBracketIndex + 1)}`;
}

function renderSemesters(semesters) {
  return semesters.map(renderSemester).join(',\n');
}

function renderSemester(semester) {
  const lines = [
    '      {',
    `        id: '${semester.id}',`,
    `        name: '${semester.name}',`,
    `        file: '${semester.file}',`,
    `        year: '${semester.year}',`,
    semester.isCurrent
      ? `        dataFormat: '${semester.dataFormat}',`
      : `        dataFormat: '${semester.dataFormat}'`
  ];

  if (semester.isCurrent) {
    lines.push('        isCurrent: true');
  }

  lines.push('      }');
  return lines.join('\n');
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}