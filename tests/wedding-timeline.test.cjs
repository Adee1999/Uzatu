// Run with: node --test tests/wedding-timeline.test.cjs
// Deterministic tests of the scroll controller; no browser or runtime dependencies.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const controller = script.slice(script.indexOf('function initWeddingTimeline()'), script.indexOf('\ninitHeroTimeline();'));

function fixture() {
  let boundsReads = 0, lengthReads = 0, pulses = 0, time = 0, nextFrame = 0;
  const frames = new Map(), listeners = new Map();
  class Node {
    constructor() {
      this.dataset = {}; this.attributes = {}; this.values = {}; this.classes = new Set();
      this.style = { setProperty:(key, value) => { this.values[key] = value; } };
      this.classList = {
        add:(...names) => names.forEach(name => this.classes.add(name)),
        remove:(...names) => names.forEach(name => this.classes.delete(name)),
        toggle:(name, value) => value ? this.classes.add(name) : this.classes.delete(name)
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    animate() { pulses++; return { cancel() {} }; }
  }
  const section = new Node(), sticky = new Node(), route = new Node();
  const progress = new Node(), heart = new Node(), arrival = new Node(), venue = new Node();
  const events = [.15, .45, .75, .95].map(value => Object.assign(new Node(), { dataset:{ progress:String(value) } }));
  const stops = [.15, .45, .75, .95].map(value => Object.assign(new Node(), { dataset:{ stop:String(value) } }));
  const pointAt = distance => ({ x:180 + 105 * Math.sin(distance / 1000 * 4 * Math.PI), y:18 + distance / 1000 * 540 });
  route.getTotalLength = () => { lengthReads++; return 1000; };
  route.getPointAtLength = distance => {
    assert.ok(distance >= 0 && distance <= 1000, 'arc length must stay within route');
    return pointAt(distance);
  };
  route.ownerSVGElement = { viewBox:{ baseVal:{ height:640 } } };
  section.offsetHeight = 2400; sticky.offsetHeight = 800;
  section.getBoundingClientRect = () => { boundsReads++; return { top:1200 - context.window.scrollY }; };
  section.querySelector = () => sticky;
  section.querySelectorAll = selector => selector === '.timeline-event' ? events : stops;
  heart.querySelector = () => arrival;
  const nodes = { 'wedding-schedule':section, 'timeline-path':route, 'timeline-progress':progress, 'timeline-heart':heart, venue };
  const listen = (name, callback) => listeners.set(name, callback);
  const context = {
    invitationOpened:true, motionPaused:false, reducedMotion:{ matches:false },
    document:{ getElementById:id => nodes[id], addEventListener:listen, hidden:false },
    window:{ scrollY:0, addEventListener:listen },
    requestAnimationFrame:callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame:id => frames.delete(id)
  };
  vm.createContext(context); vm.runInContext(controller + '\ninitWeddingTimeline();', context);
  function flush() {
    let count = 0;
    while (frames.size) {
      assert.ok(count++ < 200, 'animation must settle and stop requesting frames');
      const batch = [...frames.values()]; frames.clear();
      time += 16; batch.forEach(callback => callback(time));
    }
  }
  function scrollTo(value) { context.window.scrollY = 1200 + value * 1600; listeners.get('scroll')(); flush(); }
  flush();
  return { context, section, progress, heart, venue, events, stops, pointAt, flush, scrollTo,
    fire:name => listeners.get(name)(), stats:() => ({ boundsReads, lengthReads, pulses }) };
}

test('heart and drawn line use the same SVG arc length at every event and rewind', () => {
  const f = fixture();
  for (const value of [0, .15, .45, .75, .95, 1, .45, 0]) {
    f.scrollTo(value);
    const expected = f.pointAt(value * 1000);
    assert.equal(f.heart.attributes.transform, `translate(${expected.x} ${expected.y})`);
    assert.ok(Math.abs(Number(f.progress.style.strokeDashoffset) - 1000 * (1 - value)) < .001);
  }
  assert.ok(f.events.every(event => !event.classes.has('is-reached')));
});

test('events activate in order; earlier events mute and finale leads to venue', () => {
  const f = fixture();
  f.scrollTo(.46);
  assert.ok(f.events[0].classes.has('is-past'));
  assert.equal(f.events[1].attributes['aria-current'], 'step');
  assert.ok(!f.events[2].classes.has('is-reached'));
  f.scrollTo(1);
  assert.ok(f.events.every(event => event.classes.has('is-reached')));
  assert.ok(f.venue.classes.has('venue-ready'));
  assert.ok(f.stats().pulses >= 4);
  f.scrollTo(.1);
  assert.ok(!f.venue.classes.has('venue-ready'));
});

test('geometry is cached during scrolling, markers use responsive SVG coordinates', () => {
  const f = fixture(), before = f.stats();
  for (const value of [.1, .3, .7]) f.scrollTo(value);
  assert.equal(f.stats().boundsReads, before.boundsReads);
  assert.equal(f.stats().lengthReads, before.lengthReads);
  assert.equal(f.stops[0].attributes.cx, f.pointAt(150).x);
  assert.equal(f.events[0].values['--event-y'], `${f.pointAt(150).y / 640 * 100}%`);
  f.fire('resize'); f.flush();
  assert.equal(f.stats().boundsReads, before.boundsReads + 1);
});

test('progress clamps, pause exposes the full path and resume uses current scroll', () => {
  const f = fixture();
  f.scrollTo(-10); assert.equal(Number(f.progress.style.strokeDashoffset), 1000);
  f.scrollTo(10); assert.equal(Number(f.progress.style.strokeDashoffset), 0);
  f.context.motionPaused = true; f.fire('invitation:motionchange'); f.flush();
  f.scrollTo(.25); assert.equal(Number(f.progress.style.strokeDashoffset), 0);
  f.context.motionPaused = false; f.fire('invitation:motionchange'); f.flush();
  assert.equal(Number(f.progress.style.strokeDashoffset), 750);
  f.context.reducedMotion.matches = true;
  f.fire('invitation:motionchange'); f.flush();
  const reads = f.stats().lengthReads;
  f.scrollTo(.9); assert.equal(f.stats().lengthReads, reads);
});

test('markup keeps identical paths, required times, configurable map and unique IDs', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const paths = [...html.matchAll(/id="timeline-(?:path|progress)" d="([^"]+)"/g)];
  assert.equal(paths.length, 2); assert.equal(paths[0][1], paths[1][1]);
  for (const time of ['17:00', '17:30', '18:00']) assert.ok(html.includes(`datetime="${time}"`));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(html.includes('ULUU TOO')); assert.ok(html.includes('185/1'));
  assert.ok(script.includes("document.getElementById('map-link').href = CONFIG.venue.mapUrl"));
});
