export const LANG_COOKIE = 'lang';
export const LANGS = /** @type {const} */ (['th', 'en']);

export const LANG_COOKIE_OPTIONS = /** @type {const} */ ({
  httpOnly: true, // ฝั่ง server อ่านคนเดียว ไม่มี JS ฝั่ง client แตะ
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
});

/** @param {unknown} raw @returns {'th' | 'en'} */
export function validLang(raw) {
  const v = String(raw ?? '');
  return LANGS.includes(/** @type {any} */ (v)) ? /** @type {any} */ (v) : 'th';
}

/**
 * locale สำหรับ Intl — **ไม่ใช่ค่าเดียวกับ `lang`**
 * th-TH ให้ปีพุทธศักราช ส่วน en-GB ให้คริสต์ศักราช ปีบนหน้าเดียวกันจึงต่างกัน 543
 * @param {'th' | 'en'} lang
 */
export const localeOf = (lang) => (lang === 'en' ? 'en-GB' : 'th-TH');

const DICT = {
  th: {
    'app.name': 'our memory lane',
    'app.tagline': 'ที่เก็บวันธรรมดาที่ไม่ธรรมดา — เขียนไว้เพื่อจะได้อ่านซ้ำในอีกสิบปี',
    'app.taglineShort': 'เขียนไว้เพื่อจะได้อ่านซ้ำในอีกสิบปี',
    'app.brandLine': 'ที่เก็บวันธรรมดา<br />ที่ไม่ธรรมดา',

    'nav.menu': 'เมนูหลัก',
    'nav.timeline': 'ไทม์ไลน์',
    'nav.calendar': 'ปฏิทิน',
    'nav.add': 'เพิ่มความทรงจำ',
    'nav.account': 'เมนูบัญชี',
    'nav.noName': 'ยังไม่ได้ตั้งชื่อ',
    'nav.myList': 'รายการของฉัน',
    'nav.settings': 'ตั้งค่า',
    'nav.logout': 'ออกจากระบบ',

    // ไทยไม่มีพหูพจน์ — ยังต้องเป็นฟังก์ชันเพราะอังกฤษต้องเติม s
    'dur.years': (n) => `${n} ปี`,
    'dur.months': (n) => `${n} เดือน`,
    'dur.days': (n) => `${n} วัน`,

    'home.since': 'นับจาก',
    'home.days': 'วัน',
    'home.hours': 'ชั่วโมง',
    'home.minutes': 'นาที',
    'home.seconds': 'วินาที',
    'home.emptyTitle': 'หน้านี้ยังว่างอยู่',
    'home.emptyBody': 'ความทรงจำแรกไม่ต้องยาว — วันที่ กับประโยคเดียวก็พอแล้ว',
    'home.emptyCta': 'เขียนความทรงจำแรก',
    'home.footer': 'ยังเขียนต่ออยู่',
    'home.starsLabel': (n) => `ให้ ${n} จาก 5 ดาว`,

    'cal.title': 'ปฏิทิน',
    // Pics / Memo เป็นคำในดีไซน์ ใช้เหมือนกันทั้งสองภาษา ไม่แปล
    'cal.pics': 'Pics',
    'cal.memories': 'Memo',
    'cal.empty': 'เดือนนี้ยังไม่มีความทรงจำ',
    'cal.emptyCta': 'เขียนเพิ่ม',
    'cal.prevMonth': 'เดือนก่อนหน้า',
    'cal.nextMonth': 'เดือนถัดไป',
    'cal.pickMonth': 'เลือกเดือน',
    'cal.weekdays': ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],

    'admin.new': 'เพิ่มความทรงจำ',
    'admin.edit': 'แก้ความทรงจำ',
    'admin.date': 'วันที่',
    'admin.place': 'สถานที่',
    'admin.optional': 'ไม่ใส่ก็ได้',
    'admin.title': 'หัวข้อ',
    'admin.titleHint': 'วันนี้เกิดอะไรขึ้น',
    'admin.rate': 'ให้ดาว',
    'admin.starN': (n) => `${n} ดาว`,
    'admin.noStars': 'ไม่ให้ดาว',
    'admin.story': 'เล่าให้ฟัง',
    'admin.photo': 'รูป',
    'admin.keepPhoto': 'ไม่เลือกไฟล์ใหม่ = เก็บรูปเดิมไว้',
    'admin.photoHint': 'jpg · png · webp · gif ไม่เกิน 8MB',
    'admin.noPhoto': 'no img',
    'admin.cancel': 'ยกเลิก',
    'admin.save': 'บันทึก',
    'admin.saveEdit': 'บันทึกการแก้ไข',
    'admin.saved': (n) => `ที่บันทึกไว้ ${n} รายการ`,
    'admin.starsShort': (n) => `${n} จาก 5 ดาว`,
    'admin.editShort': 'แก้',
    'admin.delete': 'ลบ',
    'admin.confirmDelete': 'ลบความทรงจำนี้?',

    // ข้อความ error ถูกโยนมาเป็นคีย์ ไม่ใช่ประโยค — lib จะได้ไม่ต้องรู้ว่าหน้าไหนใช้ภาษาอะไร
    'err.required': 'ต้องมีหัวข้อและวันที่',
    'err.saveFailed': 'บันทึกไม่สำเร็จ',
    'err.fileType': 'รองรับเฉพาะไฟล์ JPEG / PNG / WebP / GIF',
    'err.fileTooBig': 'ไฟล์ใหญ่เกิน 8MB',
  },
  en: {
    'app.name': 'our memory lane',
    'app.tagline': 'Where ordinary days are kept — written down to be read again in ten years',
    'app.taglineShort': 'Written down to be read again in ten years',
    'app.brandLine': 'Where ordinary days<br />are worth keeping',

    'nav.menu': 'Main menu',
    'nav.timeline': 'Timeline',
    'nav.calendar': 'Calendar',
    'nav.add': 'Add a memory',
    'nav.account': 'Account menu',
    'nav.noName': 'No name set',
    'nav.myList': 'My entries',
    'nav.settings': 'Settings',
    'nav.logout': 'Sign out',

    'dur.years': (n) => `${n} year${n === 1 ? '' : 's'}`,
    'dur.months': (n) => `${n} month${n === 1 ? '' : 's'}`,
    'dur.days': (n) => `${n} day${n === 1 ? '' : 's'}`,

    'home.since': 'since',
    // ponytail: ตัวนับที่เดินวินาทีใช้รูปพหูพจน์อย่างเดียว ("1 hours" โผล่ 1 ใน 24)
    // ถ้าจะทำให้ถูกต้องต้องส่งทั้งเอกพจน์/พหูพจน์เข้าไปในสคริปต์ ไม่คุ้มกับตัวเลขที่เปลี่ยนทุกวินาที
    'home.days': 'days',
    'home.hours': 'hours',
    'home.minutes': 'minutes',
    'home.seconds': 'seconds',
    'home.emptyTitle': 'Nothing here yet',
    'home.emptyBody': 'The first memory needn’t be long — a date and one sentence is plenty.',
    'home.emptyCta': 'Write the first memory',
    'home.footer': 'Still being written',
    'home.starsLabel': (n) => `Rated ${n} out of 5`,

    'cal.title': 'Calendar',
    'cal.pics': 'Pics',
    'cal.memories': 'Memo',
    'cal.empty': 'No memories this month',
    'cal.emptyCta': 'Add one',
    'cal.prevMonth': 'Previous month',
    'cal.nextMonth': 'Next month',
    'cal.pickMonth': 'Pick a month',
    'cal.weekdays': ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],

    'admin.new': 'Add a memory',
    'admin.edit': 'Edit memory',
    'admin.date': 'Date',
    'admin.place': 'Place',
    'admin.optional': 'Optional',
    'admin.title': 'Title',
    'admin.titleHint': 'What happened today?',
    'admin.rate': 'Rating',
    'admin.starN': (n) => `${n} star${n === 1 ? '' : 's'}`,
    'admin.noStars': 'No rating',
    'admin.story': 'The story',
    'admin.photo': 'Photo',
    'admin.keepPhoto': 'No new file = keep the current photo',
    'admin.photoHint': 'jpg · png · webp · gif up to 8MB',
    'admin.noPhoto': 'no img',
    'admin.cancel': 'Cancel',
    'admin.save': 'Save',
    'admin.saveEdit': 'Save changes',
    'admin.saved': (n) => `${n} saved`,
    'admin.starsShort': (n) => `${n} out of 5`,
    'admin.editShort': 'Edit',
    'admin.delete': 'Delete',
    'admin.confirmDelete': 'Delete this memory?',

    'err.required': 'A title and a date are required',
    'err.saveFailed': 'Could not save',
    'err.fileType': 'Only JPEG / PNG / WebP / GIF files are accepted',
    'err.fileTooBig': 'File is larger than 8MB',
  },
};

/**
 * คืนตัวแปลของภาษานั้น — คีย์ที่ยังไม่ได้แปลจะตกไปใช้ไทย
 * ทำให้แปลทีละหน้าได้โดยหน้าที่ยังไม่แตะยังใช้งานได้ปกติ
 * @param {'th' | 'en'} lang
 */
export function dict(lang) {
  const table = DICT[lang] ?? DICT.th;
  return /** @type {any} */ ((key, ...args) => {
    const v = table[key] ?? DICT.th[key] ?? key;
    return typeof v === 'function' ? v(...args) : v;
  });
}
