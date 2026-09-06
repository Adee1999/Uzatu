const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const functions = source.slice(source.indexOf('function whatsappUrl('), source.indexOf('function initEventDetails('));
const CONFIG = { bride:'Әсем', whatsapp:{ rsvpPhone:'77000000000', organizerPhone:'77001112233' }, maxGuests:10 };

function fixture(blockPopup = false) {
  const nodes = new Map(), opened = [];
  class Element {
    constructor() { this.value=''; this.hidden=false; this.checked=false; this.disabled=false; this.attrs={}; this.handlers={}; }
    addEventListener(type, fn) { this.handlers[type]=fn; }
    setAttribute(key, value) { this.attrs[key]=value; }
    removeAttribute(key) { delete this.attrs[key]; if(key==='href') delete this.href; }
    focus() { this.focused=true; }
    fire(type) { this.handlers[type]({ preventDefault() {} }); }
  }
  const get = id => { if(!nodes.has(id)) nodes.set(id,new Element()); return nodes.get(id); };
  const yes=new Element(), no=new Element(); yes.value='yes'; no.value='no';
  get('rsvp-form').querySelectorAll=()=>[yes,no];
  const context={CONFIG, Event,document:{getElementById:get,dispatchEvent(){}},window:{open:(...args)=>{if(blockPopup)throw new Error('blocked');opened.push(args)}},animateCountdownValue:(element,value)=>{element.textContent=value}};
  vm.createContext(context); vm.runInContext(functions,context);
  context.initRSVP();
  const select=value=>{yes.checked=value==='yes';no.checked=value==='no';(yes.checked?yes:no).fire('change')};
  return {context,get,yes,no,select,opened,submit:()=>get('rsvp-form').fire('submit')};
}

test('required fields, whitespace-only names and invalid counts are rejected',()=>{
  const f=fixture();
  for(const input of [
    {guestName:'   ',attendance:'yes',guestCount:1},
    {guestName:'Аян',attendance:'',guestCount:1},
    ...[0,11,1.5,NaN,Infinity].map(guestCount=>({guestName:'Аян',attendance:'yes',guestCount}))
  ]) assert.ok(Object.keys(f.context.prepareRSVP(input).errors).length);
  f.submit(); assert.equal(f.opened.length,0);assert.equal(f.get('guestName').focused,true);
  assert.equal(f.get('guestName').attrs['aria-invalid'],'true');
});

test('radio changes preserve the attending count and disable both buttons on decline',()=>{
  const f=fixture(); f.select('yes');
  f.get('guest-plus').fire('click');f.get('guest-plus').fire('click');
  assert.equal(f.get('guestCount').textContent,'3');
  f.select('no');assert.equal(f.get('guestCount').textContent,'0');
  assert.equal(f.get('guest-minus').disabled,true);assert.equal(f.get('guest-plus').disabled,true);
  f.get('guest-plus').fire('click');assert.equal(f.get('guestCount').textContent,'0');
  f.select('yes');assert.equal(f.get('guestCount').textContent,'3');
});

test('counter clamps to 1–10 even for repeated direct button events',()=>{
  const f=fixture();f.select('yes');
  for(let i=0;i<20;i++)f.get('guest-plus').fire('click');
  assert.equal(f.get('guestCount').textContent,'10');assert.equal(f.get('guest-plus').disabled,true);
  for(let i=0;i<20;i++)f.get('guest-minus').fire('click');
  assert.equal(f.get('guestCount').textContent,'1');assert.equal(f.get('guest-minus').disabled,true);
});

test('Unicode names and reserved characters survive WhatsApp encoding',()=>{
  const f=fixture(); const result=f.context.prepareRSVP({guestName:'  Әсем & Аян + 1?  ',attendance:'yes',guestCount:10});
  const url=new URL(result.url);
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/77000000000');
  assert.equal(url.searchParams.get('text'),result.message);
  assert.ok(result.message.includes('Аты-жөні: Әсем & Аян + 1?'));
  assert.ok(result.message.includes('Қатысуы: Иә'));assert.ok(result.message.endsWith('Қонақтар саны: 10'));
});

test('decline produces a truthful zero-guest message',()=>{
  const f=fixture();f.get('guestName').value='Гүлмира';f.select('no');f.submit();
  const text=new URL(f.opened[0][0]).searchParams.get('text');
  assert.ok(text.includes('Қатысуы: Жоқ'));assert.ok(text.endsWith('Қонақтар саны: 0'));
  assert.equal(f.opened[0][1],'_blank');assert.equal(f.opened[0][2],'noopener,noreferrer');
  assert.equal(f.get('rsvp-success').hidden,false);
  assert.equal(f.get('rsvp-status').textContent,'Рақмет! Жауабыңыз дайын ❤️');
});

test('blocked popups retain the prepared reply link; editing invalidates the stale link',()=>{
  const f=fixture(true);f.get('guestName').value='Ерлан';f.select('yes');f.submit();
  assert.equal(f.get('rsvp-success').hidden,false);assert.ok(f.get('rsvp-whatsapp').href.startsWith('https://wa.me/'));
  f.get('guestName').value='Аян';f.get('guestName').fire('input');
  assert.equal(f.get('rsvp-success').hidden,true);assert.equal(f.get('rsvp-whatsapp').href,undefined);
  assert.equal(f.get('rsvp-status').textContent,'');
});

test('configured organizer and RSVP numbers generate separate official links',()=>{
  const f=fixture();assert.equal(f.context.whatsappUrl(CONFIG.whatsapp.organizerPhone),'https://wa.me/77001112233');
  const invalid=f.context.prepareRSVP({guestName:'Аян',attendance:'yes',guestCount:1},{...CONFIG,whatsapp:{...CONFIG.whatsapp,rsvpPhone:''}});
  assert.ok(invalid.errors.config);
});

test('form markup is accessible and all dates render from configuration',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.equal((html.match(/type="radio" name="attendance"/g)||[]).length,2);
  assert.ok(html.includes('autocomplete="name"'));assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('id="guestCount" aria-live="polite"'));
  assert.ok(!html.includes('20.09.2026'));assert.ok(!html.includes('20 · 09 · 2026'));
  assert.ok(html.indexOf('class="family')<html.indexOf('id="wedding-schedule"'));
  assert.ok(html.indexOf('id="venue"')<html.indexOf('id="rsvp"'));
  assert.ok(html.indexOf('id="rsvp"')<html.indexOf('id="contact"'));
  assert.ok(html.indexOf('id="contact"')<html.indexOf('id="farewell"'));
});

test('displayed dates and time follow the configured event timezone',()=>{
  const nodes=['day','month','year','weekday','time','numeric','compact','long'].map(date=>({dataset:{date},textContent:''}));
  const context={CONFIG:{bride:'Әсем',eventType:'ҚЫЗ ҰЗАТУ ТОЙЫ',hosts:'Айтжан мен Күнсұлу',event:{date:'2026-09-20T23:30:00Z',timezone:'Asia/Bishkek',city:'Бішкек'},venue:{name:'ULUU TOO PREMIUM',address:'Бішкек қ., Ленин даңғылы, 185/1'}},document:{querySelectorAll:()=>nodes,title:''}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function initEventDetails('),source.indexOf('function initPaperScenes('))+'\ninitEventDetails();',context);
  const value=id=>nodes.find(node=>node.dataset.date===id).textContent;
  assert.equal(value('day'),'21');assert.equal(value('year'),'2026');
  assert.equal(value('compact'),'21.09.2026');assert.equal(value('time'),'Сағат 05:30');
});
