// EDIT WEDDING DETAILS HERE. Dates, names, venue and contact links use this one source.
const CONFIG = {
  bride: "Әсемнің",
  eventType: "ҚЫЗ ҰЗАТУ ТОЙЫ",
  event: { date: "2026-10-13T17:00:00+06:00", timezone: "Asia/Almaty", city: "Жетісай" },
  hosts: "Айтжан & Күнсұлу",
  venue: {
    name: "GOLDEN HILLS BALLROOM",
    address: "Бішкек қ., Ленин даңғылы, 185/1",
    mapUrl: "https://2gis.ru/geo/68.381110,40.908318"
  },
  whatsapp: { rsvpPhone: "+77071681968", organizerPhone: "+77071681968" },
  musicPath: "assets/music.mp3",
  musicEnabled: true,
  musicFileAvailable: true, // Set true after adding music.mp3; otherwise a quiet original instrumental plays.
  stampSoundPath: "assets/stamp.mp3",
  stampSoundEnabled: false, // Enable only after adding the optional audio file.
  waxHeartPath: null, // Set to "assets/wax-heart.png" if adding your own seal image.
  maxGuests: 10
};

let invitationOpened = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const audio = document.getElementById('background-music');
const musicButton = document.getElementById('music-toggle');
let revealObserver;
let motionPaused = reducedMotion.matches;
let ambientMusic = null;
const hero = document.querySelector('.hero');

function initEnvelope() {
  document.getElementById('open-seal').addEventListener('click', openInvitation);
}

function openInvitation() {
  if (invitationOpened) return;
  invitationOpened = true;
  const seal = document.getElementById('open-seal');
  seal.disabled = true;
  seal.setAttribute('aria-expanded', 'true');
  document.body.classList.add('invitation-open');
  if (CONFIG.musicEnabled) tryPlayMusic();
  window.setTimeout(() => {
    const page = document.getElementById('invitation');
    page.inert = false;
    page.removeAttribute('aria-hidden');
    document.body.classList.add('page-visible');
    const intro = document.getElementById('intro');
    intro.classList.add('departed');
    intro.inert = true;
    intro.setAttribute('aria-hidden', 'true');
    page.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    hero.classList.add('is-active', 'in-view');
    document.dispatchEvent(new Event('invitation:opened'));
    document.getElementById('motion-toggle').hidden = false;
    document.querySelectorAll('.reveal').forEach(element => {
      if (revealObserver) revealObserver.observe(element);
      else element.classList.add('visible');
    });
  }, reducedMotion.matches ? 30 : 1900);
}

function updateMusicState() {
  const playing = ambientMusic ? ambientMusic.playing : !audio.paused && !audio.ended;
  musicButton.classList.toggle('playing', playing);
  musicButton.setAttribute('aria-pressed', String(playing));
  musicButton.setAttribute('aria-label', playing ? 'Музыканы тоқтату' : 'Музыканы қосу');
  musicButton.querySelector('.music-symbol').textContent = playing ? '♫' : 'Ⅱ';
}

async function tryPlayMusic() {
  try { if (ambientMusic) await ambientMusic.play(); else await audio.play(); } catch { /* Playback restrictions are optional. */ }
  updateMusicState();
}

function initMusic() {
  if (!CONFIG.musicEnabled || !CONFIG.musicPath) return;
  if (CONFIG.musicFileAvailable) audio.src = CONFIG.musicPath;
  else ambientMusic = createAmbientMusic();
  musicButton.hidden = false;
  audio.addEventListener('play', updateMusicState);
  audio.addEventListener('pause', updateMusicState);
  audio.addEventListener('error', () => { musicButton.hidden = true; });
  musicButton.addEventListener('click', () => {
    if (ambientMusic) { if (ambientMusic.playing) ambientMusic.pause(); else tryPlayMusic(); updateMusicState(); }
    else if (audio.paused) tryPlayMusic();
    else audio.pause();
  });
}

// Small original music-box accompaniment when no audio file has been supplied.
// AudioContext is created only from the seal/music-button interaction.
function createAmbientMusic() {
  let context, master, interval, step = 0;
  const notes = [69,72,76,72,67,71,74,71,65,69,72,69,67,71,74,76];
  const player = { playing:false };
  function note(midi, duration, volume) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(volume, now + .025);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(envelope); envelope.connect(master);
    oscillator.start(now); oscillator.stop(now + duration + .05);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  function playStep() {
    if (!player.playing) return;
    const midi = notes[step % notes.length];
    note(midi, 2.1, .12); note(midi + 12, 1.2, .025);
    if (step % 4 === 0) note(midi - 24, 4, .07);
    step++;
  }
  player.play = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context) { context = new AudioContext(); master = context.createGain(); master.gain.value = .24; master.connect(context.destination); }
    await context.resume();
    if (player.playing) return;
    player.playing = true; playStep(); interval = window.setInterval(playStep, 1100);
  };
  player.pause = () => { player.playing = false; window.clearInterval(interval); if (context) context.suspend().catch(() => {}); };
  return player;
}

function initCountdown() {
  const target = new Date(CONFIG.event.date).getTime();
  const fields = ['days', 'hours', 'minutes', 'seconds'].map(id => document.getElementById(id));
  let interval;
  function tick() {
    const remaining = Number.isFinite(target) ? Math.max(0, Math.floor((target - Date.now()) / 1000)) : 0;
    const values = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
    fields.forEach((field, i) => animateCountdownValue(field, String(values[i]).padStart(2, '0')));
    if (remaining === 0) {
      document.getElementById('countdown-caption').textContent = Number.isFinite(target) ? 'Бүгін — біздің ерекше күніміз! 🤍' : 'Кездескенше!';
      window.clearInterval(interval);
    }
    return remaining;
  }
  if (tick() > 0) interval = window.setInterval(tick, 1000);
}

function initRevealAnimations() {
  document.querySelectorAll('.reveal').forEach(group => {
    [...group.children].forEach((child, index) => {
      // Special timelines own their transforms; generic children use stagger utilities.
      if (child.matches('.cinema-date, .countdown, .letter-animation, .photo-frame img, .button, h2')) return;
      child.classList.add('stagger-item');
      child.style.setProperty('--stagger', `${Math.min(index, 5) * 120}ms`);
    });
  });
  document.querySelectorAll('.countdown > div').forEach((box, index) => box.style.setProperty('--stagger', `${index * 120 + 300}ms`));
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
}

function initParallax() {
  const desktop = window.matchMedia('(min-width: 768px) and (pointer: fine)');
  const layers = [...document.querySelectorAll('[data-depth]')];
  const photo = document.querySelector('[data-image-parallax]');
  let frame = 0, x = 0, y = 0, heroHeight = 900, photoCenter = 0;
  let photoVisible = false;
  function measure() {
    // Geometry is cached on resize/open/load, never read on pointer/scroll frames.
    heroHeight = hero.offsetHeight || 900;
    photoCenter = photo.getBoundingClientRect().top + window.scrollY + photo.offsetHeight / 2;
    schedule();
  }
  function render() {
    frame = 0;
    if (motionPaused || document.hidden || !invitationOpened) return;
    if (hero.classList.contains('in-view')) {
      const progress = Math.min(1, window.scrollY / heroHeight);
      layers.forEach(layer => {
        const depth = Number(layer.dataset.depth);
        const dx = desktop.matches ? Math.max(-6, Math.min(6, x * depth)) : 0;
        const dy = Math.max(-8, Math.min(8, desktop.matches ? y * depth + progress * depth : progress * depth));
        layer.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0)`;
      });
    }
    if (photoVisible) {
      const travel = desktop.matches ? 20 : 7;
      const progress = (window.scrollY + window.innerHeight / 2 - photoCenter) / window.innerHeight;
      photo.style.setProperty('--image-y', `${Math.max(-travel, Math.min(travel, progress * travel))}px`);
    }
  }
  function schedule() { if (!frame && !motionPaused) frame = requestAnimationFrame(render); }
  hero.addEventListener('pointermove', event => {
    if (!desktop.matches) return;
    x = event.clientX / window.innerWidth * 2 - 1;
    y = event.clientY / window.innerHeight * 2 - 1;
    schedule();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { x = y = 0; schedule(); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure, { once: true });
  document.addEventListener('invitation:opened', measure);
  document.addEventListener('invitation:motionchange', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === hero) hero.classList.toggle('in-view', entry.isIntersecting);
        else photoVisible = entry.isIntersecting;
      });
      schedule();
    }).observe(hero);
    new IntersectionObserver(entries => { photoVisible = entries[0].isIntersecting; schedule(); }).observe(photo);
  } else { photoVisible = true; }
}

// A single accessible heading remains readable while decorative letters animate.
function initLetterAnimations() {
  document.querySelectorAll('[data-letters]').forEach(heading => {
    const text = heading.textContent;
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = text;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    let index = 0;
    text.split(/(\s+)/).forEach(word => {
      if (/^\s+$/.test(word)) { visual.append(document.createTextNode(word)); return; }
      const wrapper = document.createElement('span');
      wrapper.className = 'letter-word';
      Array.from(word).forEach(character => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = character;
        span.style.setProperty('--letter-delay', `${index++ * 35}ms`);
        wrapper.append(span);
      });
      visual.append(wrapper);
    });
    heading.replaceChildren(accessible, visual);
  });
}

function initSvgDrawAnimations() {
  document.querySelectorAll('.ornament').forEach(ornament => {
    ornament.innerHTML = '<svg viewBox="0 0 180 30" aria-hidden="true"><path class="draw-path" pathLength="1" d="M2 15H60Q73 15 80 8L90 1L100 8Q107 15 120 15H178M60 15Q73 15 80 22L90 29L100 22Q107 15 120 15M84 15L90 9L96 15L90 21Z"/></svg>';
  });
}

function initFloatingPetals() {
  const field = document.querySelector('.petal-field');
  for (let index = 0; index < 8; index++) {
    const petal = document.createElement('i');
    petal.className = 'petal';
    petal.style.setProperty('--petal-x', `${8 + index * 12}%`);
    petal.style.setProperty('--petal-size', `${9 + index % 4 * 3}px`);
    petal.style.setProperty('--petal-duration', `${14 + index % 4 * 3}s`);
    petal.style.setProperty('--petal-delay', `${index * 2.1}s`);
    field.append(petal);
  }
}

function animateCountdownValue(field, value) {
  if (field.dataset.value === value) return;
  const previous = field.dataset.value;
  field.dataset.value = value;
  const next = document.createElement('span');
  next.className = 'digit';
  next.textContent = value;
  field.replaceChildren(next);
  if (!previous || motionPaused || document.hidden || !field.closest('.visible, .scene-visible')) return;
  const old = document.createElement('span');
  old.className = 'digit digit-old digit-exit';
  old.textContent = previous;
  old.setAttribute('aria-hidden', 'true');
  next.classList.add('digit-enter');
  field.append(old);
  window.setTimeout(() => old.remove(), 450);
}

function initHeroTimeline() {
  document.body.classList.add('motion-ready');
  const control = document.getElementById('motion-toggle');
  function syncMotion() {
    document.body.classList.toggle('motion-paused', motionPaused);
    control.setAttribute('aria-pressed', String(motionPaused));
    control.setAttribute('aria-label', motionPaused ? 'Анимацияны қосу' : 'Анимацияны тоқтату');
    control.firstElementChild.textContent = motionPaused ? '▷' : 'Ⅱ';
    document.dispatchEvent(new Event('invitation:motionchange'));
  }
  control.addEventListener('click', () => { motionPaused = !motionPaused; syncMotion(); });
  reducedMotion.addEventListener('change', event => { motionPaused = event.matches; syncMotion(); });
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('tab-hidden', document.hidden));
  syncMotion();
  document.querySelectorAll('.floral img').forEach(image => {
    image.addEventListener('error', () => { image.closest('.floral').hidden = true; });
  });
}

function initWhatsApp() {
  document.getElementById('organizer-whatsapp').href = whatsappUrl(CONFIG.whatsapp.organizerPhone);
  document.getElementById('map-link').href = CONFIG.venue.mapUrl;
}

function whatsappUrl(phone, message = '') {
  const number = String(phone).replace(/\D/g, '');
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

// Pure validation/message construction keeps guest data local and is easy to test.
function prepareRSVP(values, config = CONFIG) {
  const guestName = String(values.guestName || '').trim().replace(/\s+/g, ' ');
  const attendance = values.attendance;
  const guestCount = attendance === 'no' ? 0 : Number(values.guestCount);
  const errors = {};
  if (!guestName) errors.name = 'Аты-жөніңізді жазыңыз.';
  else if (guestName.length > 120) errors.name = 'Аты-жөніңіз 120 таңбадан аспауы керек.';
  if (!['yes', 'no'].includes(attendance)) errors.attendance = 'Иә немесе Жоқ жауабын таңдаңыз.';
  if (attendance !== 'no' && (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > config.maxGuests)) {
    errors.count = `Қонақтар саны 1 мен ${config.maxGuests} аралығында болуы керек.`;
  }
  if (!/^\d{7,15}$/.test(String(config.whatsapp.rsvpPhone).replace(/\D/g, ''))) errors.config = 'WhatsApp нөмірі дұрыс көрсетілмеген.';
  if (Object.keys(errors).length) return { errors };
  const message = `Сәлеметсіз бе!\n\n${config.bride}ның қыз ұзату тойына\nқатысу туралы жауабымды жіберіп отырмын.\n\nАты-жөні: ${guestName}\nҚатысуы: ${attendance === 'yes' ? 'Иә' : 'Жоқ'}\nҚонақтар саны: ${guestCount}`;
  return { errors, guestName, attendance, guestCount, message, url:whatsappUrl(config.whatsapp.rsvpPhone, message) };
}

function initRSVP() {
  const form = document.getElementById('rsvp-form');
  const name = document.getElementById('guestName');
  const radios = [...form.querySelectorAll('input[name="attendance"]')];
  const minus = document.getElementById('guest-minus'), plus = document.getElementById('guest-plus');
  const output = document.getElementById('guestCount');
  const success = document.getElementById('rsvp-success');
  const errorNodes = { name:document.getElementById('name-error'), attendance:document.getElementById('attendance-error'), count:document.getElementById('count-error'), config:document.getElementById('rsvp-error') };
  let count = 1, lastYesCount = 1;
  function attendance() { return radios.find(radio => radio.checked)?.value || ''; }
  function showErrors(errors = {}) {
    Object.entries(errorNodes).forEach(([key, element]) => {
      element.textContent = errors[key] || '';
      element.hidden = !errors[key];
    });
    name.setAttribute('aria-invalid', String(Boolean(errors.name)));
    radios.forEach(radio => radio.setAttribute('aria-invalid', String(Boolean(errors.attendance))));
  }
  function updateCounter() {
    const declined = attendance() === 'no';
    minus.disabled = declined || count <= 1;
    plus.disabled = declined || count >= CONFIG.maxGuests;
    document.getElementById('guest-stepper').setAttribute('aria-disabled', String(declined));
    document.getElementById('guest-count-note').textContent = declined ? 'Қатыспайтын болсаңыз, қонақтар саны — 0.' : `Өзіңізді қоса есептеңіз. Ең көбі — ${CONFIG.maxGuests}.`;
    animateCountdownValue(output, String(count));
  }
  function invalidatePreparedReply() {
    success.hidden = true;
    document.getElementById('rsvp-status').textContent = '';
    document.getElementById('rsvp-whatsapp').removeAttribute('href');
    showErrors();
    document.dispatchEvent(new Event('invitation:layoutchange'));
  }
  radios.forEach(radio => radio.addEventListener('change', () => {
    if (attendance() === 'no') { if (count > 0) lastYesCount = count; count = 0; }
    else count = lastYesCount;
    invalidatePreparedReply(); updateCounter();
  }));
  minus.addEventListener('click', () => {
    if (attendance() === 'no' || count <= 1) return;
    lastYesCount = --count; invalidatePreparedReply(); updateCounter();
  });
  plus.addEventListener('click', () => {
    if (attendance() === 'no' || count >= CONFIG.maxGuests) return;
    lastYesCount = ++count; invalidatePreparedReply(); updateCounter();
  });
  name.addEventListener('input', invalidatePreparedReply);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const result = prepareRSVP({ guestName:name.value, attendance:attendance(), guestCount:count });
    showErrors(result.errors);
    if (Object.keys(result.errors).length) {
      if (result.errors.name) name.focus();
      else if (result.errors.attendance) radios[0].focus();
      else if (result.errors.count) plus.focus();
      return;
    }
    document.getElementById('rsvp-whatsapp').href = result.url;
    success.hidden = false;
    document.getElementById('rsvp-status').textContent = 'Рақмет! Жауабыңыз дайын ❤️';
    // Synchronous user-initiated navigation; no fetch, backend, persistence or automatic sending.
    try { window.open(result.url, '_blank', 'noopener,noreferrer'); } catch { /* The visible link also works when popups are blocked. */ }
    document.dispatchEvent(new Event('invitation:layoutchange'));
  });
  document.getElementById('rsvp-fields').disabled = false;
  updateCounter();
}

function initEventDetails() {
  const content = {
    bride:CONFIG.bride, eventType:CONFIG.eventType,
    hosts:CONFIG.hosts, city:CONFIG.event.city,
    venue:CONFIG.venue.name, address:CONFIG.venue.address
  };
  document.querySelectorAll('[data-content]').forEach(element => { element.textContent = content[element.dataset.content] || ''; });
  document.title = `${content.bride} — Тойға шақырту`;
  const date = new Date(CONFIG.event.date);
  if (!Number.isFinite(date.getTime())) return;
  // Numeric Intl parts handle the timezone; explicit Kazakh words avoid M09/SUN on limited ICU browsers.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone:CONFIG.event.timezone, day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(date).map(part => [part.type,part.value]));
  const months = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
  const weekdays = ['ЖЕКСЕНБІ','ДҮЙСЕНБІ','СЕЙСЕНБІ','СӘРСЕНБІ','БЕЙСЕНБІ','ЖҰМА','СЕНБІ'];
  const {day,year,month:monthNumber,hour,minute} = parts;
  const month = months[Number(monthNumber)-1];
  const weekdayUpper = weekdays[new Date(Date.UTC(Number(year),Number(monthNumber)-1,Number(day))).getUTCDay()];
  const titleCase = word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  const monthTitle = titleCase(month);
  const weekdayTitle = titleCase(weekdayUpper);
  const values = {
    day, month:month.toUpperCase(), year, weekday:weekdayUpper,
    monthTitle, weekdayTitle, monthLower:month, weekdayLower:weekdayUpper.toLowerCase(),
    clock:`${hour}:${minute}`, time:`Сағат ${hour}:${minute}`,
    numeric:`${day} · ${monthNumber} · ${year}`, compact:`${day}.${monthNumber}.${year}`,
    long:`${day} ${month.toUpperCase()} ${year}`, venue:`${day} ${month} ${year} · ${hour}:${minute}`,
    venueDate:`${day} ${month}, ${year} жыл, ${weekdayUpper.toLowerCase()}, ${hour}:${minute}`
  };
  document.querySelectorAll('[data-date]').forEach(element => { element.textContent = values[element.dataset.date] || ''; });
}

function initPaperScenes() {
  const scenes = [...document.querySelectorAll('.paper-scene')];
  const contact = document.getElementById('contact');
  const layers = [...contact.querySelectorAll('[data-contact-depth]')];
  let frame = 0, center = 0;
  function measure() {
    if (!invitationOpened) return;
    center = contact.getBoundingClientRect().top + window.scrollY + contact.offsetHeight / 2;
    schedule();
  }
  function render() {
    frame = 0;
    if (motionPaused || reducedMotion.matches || document.hidden || !contact.classList.contains('scene-in-view')) return;
    const offset = window.scrollY + window.innerHeight / 2 - center;
    const limit = window.innerWidth < 768 ? 7 : 18;
    layers.forEach(layer => {
      // Preserve distinct depths instead of clamping every flower to the same offset.
      const y = Math.tanh(offset / window.innerHeight * 1.8) * limit * Number(layer.dataset.contactDepth) / .08;
      layer.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
    });
  }
  function schedule() { if (!frame && !motionPaused) frame = requestAnimationFrame(render); }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('scene-in-view', entry.isIntersecting);
      if (entry.isIntersecting) entry.target.classList.add('scene-visible');
      schedule();
    }), { threshold:.1 });
    scenes.forEach(scene => observer.observe(scene));
  } else scenes.forEach(scene => scene.classList.add('scene-visible', 'scene-in-view'));
  scenes.forEach(scene => scene.addEventListener('focusin', () => scene.classList.add('scene-visible')));
  document.querySelectorAll('.paper-floral img,.contact-flower-layer img').forEach(image => image.addEventListener('error', () => { image.style.display = 'none'; }));
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', measure, { passive:true });
  window.addEventListener('load', measure, { once:true });
  ['invitation:opened', 'invitation:motionchange', 'invitation:layoutchange'].forEach(event => document.addEventListener(event, measure));
  if (document.fonts) document.fonts.ready.then(measure);
}

function initWaxStamp() {
  const image = document.getElementById('wax-heart-image');
  if (CONFIG.waxHeartPath) {
    image.addEventListener('load', () => { image.hidden = false; document.querySelector('.wax-heart-fallback').style.display = 'none'; });
    image.addEventListener('error', () => { image.hidden = true; });
    image.src = CONFIG.waxHeartPath;
  }
  if (!CONFIG.stampSoundEnabled || !CONFIG.stampSoundPath) return;
  const stamp = new Audio();
  stamp.preload = 'none'; stamp.volume = .16; stamp.src = CONFIG.stampSoundPath;
  let played = false;
  document.getElementById('wax-heart').addEventListener('animationstart', event => {
    if (event.animationName !== 'wax-stamp' || played || !invitationOpened || motionPaused) return;
    played = true;
    window.setTimeout(() => {
      if (document.hidden || motionPaused) return;
      stamp.play().catch(() => {});
    }, 650);
  });
}

function initPhoto() {
  const photo = document.getElementById('invitation-photo');
  const loaded = () => document.body.classList.add('has-photo');
  const failed = () => { photo.hidden = true; photo.style.display = 'none'; };
  photo.addEventListener('load', loaded);
  photo.addEventListener('error', failed);
  if (photo.complete) photo.naturalWidth ? loaded() : failed();
}

// Scroll distance -> arc length -> exact SVG coordinates. No layout reads in animation frames.
function initWeddingTimeline() {
  const section = document.getElementById('wedding-schedule');
  const sticky = section.querySelector('.timeline-sticky');
  const path = document.getElementById('timeline-path');
  const progressPath = document.getElementById('timeline-progress');
  const heart = document.getElementById('timeline-heart');
  const arrival = heart.querySelector('.heart-arrival');
  const venue = document.getElementById('venue');
  const events = [...section.querySelectorAll('.timeline-event')].map(element => ({
    element, progress: Number(element.dataset.progress)
  }));
  const stops = [...section.querySelectorAll('[data-stop]')];
  const clamp = value => Math.max(0, Math.min(1, value));
  const viewBoxHeight = path.ownerSVGElement.viewBox.baseVal.height;
  let pathLength = path.getTotalLength();
  let start = 0, travel = 1, current = 0, previous = 0;
  let frame = 0, measureFrame = 0, lastTime = 0, finalPulsed = false;
  let arrivalAnimation;

  section.classList.add('timeline-ready');
  function cacheGeometry() {
    measureFrame = 0;
    if (!invitationOpened) return;
    start = section.getBoundingClientRect().top + window.scrollY;
    // Actual pinned distance, including the mobile small-viewport height.
    travel = Math.max(0, section.offsetHeight - sticky.offsetHeight);
    pathLength = path.getTotalLength();
    progressPath.style.strokeDasharray = String(pathLength);
    // Positions use the same SVG curve as the heart, converted to responsive percentages.
    events.forEach(event => {
      const point = path.getPointAtLength(pathLength * event.progress);
      event.element.style.setProperty('--event-y', `${point.y / viewBoxHeight * 100}%`);
    });
    stops.forEach(stop => {
      const point = path.getPointAtLength(pathLength * Number(stop.dataset.stop));
      stop.setAttribute('cx', point.x);
      stop.setAttribute('cy', point.y);
    });
    if (motionPaused || reducedMotion.matches) {
      if (arrivalAnimation) arrivalAnimation.cancel();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      progressPath.style.strokeDashoffset = '0';
      section.classList.remove('timeline-moving');
      return;
    }
    schedule();
  }
  function requestMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(cacheGeometry);
  }
  function pulse() {
    if (motionPaused || reducedMotion.matches) return;
    // WAAPI restarts a pulse without forcing a synchronous layout.
    if (typeof arrival.animate === 'function') {
      if (arrivalAnimation) arrivalAnimation.cancel();
      arrivalAnimation = arrival.animate([
        { transform:'scale(1)' }, { transform:'scale(1.2)', offset:.4 }, { transform:'scale(1)' }
      ], { duration:650, easing:'cubic-bezier(.19,1,.22,1)' });
    } else {
      arrival.classList.remove('arrived');
      requestAnimationFrame(() => arrival.classList.add('arrived'));
    }
  }
  function paint(progress) {
    const point = path.getPointAtLength(pathLength * progress);
    heart.setAttribute('transform', `translate(${point.x} ${point.y})`);
    progressPath.style.strokeDashoffset = String(pathLength * (1 - progress));
    let active = -1;
    events.forEach((event, index) => { if (progress >= event.progress - .035) active = index; });
    events.forEach((event, index) => {
      event.element.classList.toggle('is-reached', index <= active);
      event.element.classList.toggle('is-active', index === active);
      event.element.classList.toggle('is-past', index < active);
      event.element.classList.toggle('is-near', Math.abs(progress - event.progress) <= .08);
      if (index === active) event.element.setAttribute('aria-current', 'step');
      else event.element.removeAttribute('aria-current');
    });
    stops.forEach(stop => stop.classList.toggle('reached', progress >= Number(stop.dataset.stop)));
    if (events.some(event => previous < event.progress && progress >= event.progress)) pulse();
    if (progress === 1 && !finalPulsed) { pulse(); finalPulsed = true; }
    if (progress < .98) finalPulsed = false;
    section.style.setProperty('--handoff', clamp((progress - .97) / .03).toFixed(3));
    section.style.setProperty('--hint-opacity', clamp((progress - .90) / .06).toFixed(3));
    venue.classList.toggle('venue-ready', progress >= .95);
    previous = progress;
  }
  function render(time) {
    frame = 0;
    if (motionPaused || reducedMotion.matches || document.hidden || !invitationOpened) return;
    const target = travel > 0 ? clamp((window.scrollY - start) / travel) : 0;
    const elapsed = Math.min(64, lastTime ? time - lastTime : 16);
    lastTime = time;
    // Time-based smoothing behaves consistently on 60/120 Hz phones and reverse scrolling.
    current += (target - current) * (1 - Math.exp(-elapsed / 70));
    const moving = Math.abs(target - current) > .00015;
    if (!moving) current = target;
    paint(current);
    section.classList.toggle('timeline-moving', moving);
    if (moving) frame = requestAnimationFrame(render);
    else lastTime = 0;
  }
  function schedule() {
    if (!frame && !motionPaused && !reducedMotion.matches && invitationOpened && !document.hidden) frame = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', requestMeasure, { passive:true });
  window.addEventListener('load', requestMeasure, { once:true });
  document.addEventListener('invitation:opened', requestMeasure);
  document.addEventListener('invitation:motionchange', requestMeasure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    else schedule();
  });
  if (document.fonts) document.fonts.ready.then(requestMeasure);
  if ('ResizeObserver' in window) {
    // Font wrapping or content edits above the scene can change its document offset.
    const observer = new ResizeObserver(requestMeasure);
    observer.observe(document.querySelector('.hero'));
    observer.observe(document.getElementById('celebration'));
    observer.observe(document.querySelector('.family'));
    const dressCode = document.querySelector('.dress-code');
    if (dressCode) observer.observe(dressCode);
  }
  progressPath.style.strokeDasharray = String(pathLength);
  progressPath.style.strokeDashoffset = String(pathLength);
  paint(0);
  requestMeasure();
}

initHeroTimeline();
initEventDetails();
initLetterAnimations();
initSvgDrawAnimations();
initFloatingPetals();
initMusic();
initEnvelope();
initCountdown();
initRevealAnimations();
initParallax();
initWhatsApp();
initPhoto();
initWeddingTimeline();
initRSVP();
initPaperScenes();
initWaxStamp();
