// The five steps every Quake Explorer investigation follows, drawn in its side panel:
//
//   1. Question   one driving question
//   2. Predict    the student commits to an answer before looking (stored on this device)
//   3. Explore    what to do with the view; live readouts of the student's measurements
//   4. Why?       the science, short, with a link to the science page
//   5. Check      reveal the professionals' answer and compare
//
// Predicting first matters: a wrong prediction is what makes "why?" interesting. So the
// Check button stays off until a prediction is chosen. Nothing is sent anywhere: the
// prediction is kept in this browser (localStorage) under the quake's ID.
import { esc } from '../ui/page.js';

const KEY = (inv, eventId) => `uhsn.quakeExplorer.predict.${inv}.${eventId}`;

function load(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: fine */ }
}

/**
 * Draw the steps into `el`.
 * @param {HTMLElement} el
 * @param {object} cfg
 * @param {string} cfg.inv          'A' … 'D'
 * @param {string} cfg.question
 * @param {{prompt:string, options:Array<{value:string, label:string}>}} cfg.predict
 * @param {string} cfg.explore      HTML: what to do
 * @param {string} cfg.why          HTML: the science, with links to the science pages
 * @param {string} cfg.checkLabel   e.g. "Reveal the professionals' picks"
 * @param {() => void} cfg.onCheck
 * @returns {{readout:HTMLElement, result:HTMLElement, extra:HTMLElement,
 *   setEvent:(id:string)=>void, prediction:()=>string|null, setChecked:(on:boolean)=>void}}
 */
export function renderSteps(el, cfg) {
  const name = `qe-predict-${cfg.inv}`;
  el.innerHTML = `
    <h3>${esc(cfg.question)}</h3>
    <ol class="qe-steps">
      <li data-step="predict"><b>1 · Predict first</b>
        <p>${cfg.predict.prompt}</p>
        <div class="qe-choices" role="radiogroup">
          ${cfg.predict.options.map((o) => `<label><input type="radio" name="${name}" value="${esc(o.value)}"> <span>${o.label}</span></label>`).join('')}
        </div>
      </li>
      <li data-step="explore"><b>2 · Explore</b>
        <div>${cfg.explore}</div>
        <div class="qe-readout" data-part="readout"></div>
      </li>
      <li data-step="why"><b>3 · Why?</b>
        <details class="qe-why"><summary>The science in short</summary>${cfg.why}</details>
      </li>
      <li data-step="check"><b>4 · Check</b>
        <div class="actions"><button type="button" class="primary" data-part="check">${esc(cfg.checkLabel)}</button></div>
        <p class="hint" data-part="check-hint">Choose your prediction first.</p>
        <div data-part="result"></div>
      </li>
    </ol>
    <div data-part="extra"></div>`;
  const part = (p) => el.querySelector(`[data-part="${p}"]`);
  const radios = [...el.querySelectorAll(`input[name="${name}"]`)];
  const checkBtn = part('check');
  let eventId = '';

  const refresh = () => {
    const chosen = radios.find((r) => r.checked);
    checkBtn.disabled = !chosen;
    part('check-hint').hidden = !!chosen;
    el.querySelector('[data-step="predict"]').classList.toggle('done', !!chosen);
  };
  radios.forEach((r) => r.addEventListener('change', () => {
    if (eventId) save(KEY(cfg.inv, eventId), r.value);
    refresh();
  }));
  checkBtn.addEventListener('click', () => {
    el.querySelector('[data-step="check"]').classList.add('done');
    cfg.onCheck();
  });

  return {
    readout: part('readout'),
    result: part('result'),
    extra: part('extra'),
    setEvent(id) {
      eventId = id;
      const saved = load(KEY(cfg.inv, id));
      radios.forEach((r) => { r.checked = r.value === saved; });
      el.querySelector('[data-step="check"]').classList.remove('done');
      part('result').innerHTML = '';
      part('extra').innerHTML = '';
      refresh();
    },
    prediction: () => radios.find((r) => r.checked)?.value ?? null,
    predictionLabel: () => radios.find((r) => r.checked)?.nextElementSibling?.textContent.trim() ?? '',
    setChecked(on) { el.querySelector('[data-step="check"]').classList.toggle('done', on); },
  };
}
