/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - CLINICAL ANESTHESIA CALCULATOR ENGINE
 * High-yield bedside calculators for:
 * 1. Pediatric Emergency Formulas & Airway
 * 2. ARDSNet Lung-Protective Ventilation (PBW, Vt, Driving Pressure)
 * 3. Local Anesthetic Maximum Dosing & Intralipid Rescue
 * 4. Sodium Deficit & Hyper-/Hyponatremia 24h Safe Limit
 */

(function (global) {
  'use strict';

  // --- Pure Calculation Methods ---

  /**
   * Pediatric emergency calculations based on age & weight
   */
  function calculatePediatrics(age, weight) {
    const ageVal = parseFloat(age) || 4;
    const wtVal = parseFloat(weight) || 16;

    const uncuffed = (ageVal / 4) + 4.0;
    const cuffed = (ageVal / 4) + 3.5;
    const depth = (ageVal / 2) + 12;
    const adrMg = (wtVal * 0.01).toFixed(2);
    const adrMl = (wtVal * 0.1).toFixed(1);
    const atropin = Math.max(0.1, wtVal * 0.02).toFixed(2);
    const rocuronium = (wtVal * 0.6).toFixed(1);
    const rocuroniumRSI = (wtVal * 1.0).toFixed(1);
    const defib = Math.round(wtVal * 4);
    const fluidsMin = Math.round(wtVal * 10);
    const fluidsMax = Math.round(wtVal * 20);

    return {
      age: ageVal,
      weight: wtVal,
      uncuffed,
      cuffed,
      depth,
      adrMg,
      adrMl,
      atropin,
      rocuronium,
      rocuroniumRSI,
      defib,
      fluidsMin,
      fluidsMax
    };
  }

  /**
   * ARDSNet PBW & protective ventilation calculations
   */
  function calculateARDS(gender, height) {
    const gen = gender === 'female' ? 'female' : 'male';
    const ht = parseFloat(height) || 175;

    const base = (gen === 'male') ? 50.0 : 45.5;
    const pbw = Math.max(30, base + 0.91 * (ht - 152.4));
    const vt6 = Math.round(pbw * 6);
    const vt8 = Math.round(pbw * 8);

    return {
      gender: gen,
      height: ht,
      pbw,
      vt6,
      vt8,
      drivingPressureMax: 14
    };
  }

  /**
   * Local Anesthetic maximum doses and Intralipid rescue bolus
   */
  function calculateLocalAnesthetics(weight) {
    const wt = parseFloat(weight) || 70;

    const ropi = Math.min(300, Math.round(wt * 3.0));
    const bupi = Math.min(150, Math.round(wt * 2.0));
    const lidoPur = Math.min(300, Math.round(wt * 4.0));
    const lidoAdr = Math.min(500, Math.round(wt * 7.0));
    const prilo = Math.min(500, Math.round(wt * 6.0));
    const lipidBolus = Math.round(wt * 1.5);

    return {
      weight: wt,
      ropivacaine: ropi,
      bupivacaine: bupi,
      lidocainePlain: lidoPur,
      lidocaineEpi: lidoAdr,
      prilocaine: prilo,
      intralipidBolus: lipidBolus
    };
  }

  /**
   * Sodium deficit calculation & safe 24h limits (ODS prevention)
   */
  function calculateSodium(demog, weight, naCurrent) {
    const dm = demog || 'male';
    const wt = parseFloat(weight) || 70;
    const naCur = parseFloat(naCurrent) || 118;

    let factor = 0.6;
    if (dm === 'female' || dm === 'elderly_male') factor = 0.5;
    else if (dm === 'elderly_female') factor = 0.45;

    const tbw = wt * factor;
    const deficit = Math.max(0, Math.round(tbw * (140 - naCur)));
    const maxDayNa = (naCur + 8).toFixed(0);

    return {
      demog: dm,
      weight: wt,
      naCurrent: naCur,
      factor,
      tbw,
      deficit,
      maxDayNa
    };
  }

  // --- Copy Helper ---
  function copyCalcValues(text, btn) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ In Zwischenablage kopiert!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.remove('copied');
        }, 2200);
      });
    }
  }

  // --- DOM Integration & Controller ---

  function initClinicalCalculators(closeModalFn) {
    const elCalcTrigger = document.getElementById('calc-trigger');
    const elCalcModal = document.getElementById('calc-modal');
    const elCalcModalClose = document.getElementById('calc-modal-close');

    if (elCalcTrigger && elCalcModal) {
      elCalcTrigger.addEventListener('click', () => {
        elCalcModal.classList.add('active');
        recalculateAll();
      });
    }
    if (elCalcModalClose && elCalcModal) {
      elCalcModalClose.addEventListener('click', () => {
        if (typeof closeModalFn === 'function') {
          closeModalFn(elCalcModal);
        } else {
          elCalcModal.classList.remove('active');
        }
      });
    }

    // Calculator Tabs
    const elCalcTabBar = document.getElementById('calc-tab-bar');
    if (elCalcTabBar && elCalcModal) {
      const tabBtns = elCalcTabBar.querySelectorAll('.calc-tab-btn');
      const panels = {
        peds: document.getElementById('calc-panel-peds'),
        ards: document.getElementById('calc-panel-ards'),
        la: document.getElementById('calc-panel-la'),
        na: document.getElementById('calc-panel-na')
      };

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.getAttribute('data-tab');

          Object.keys(panels).forEach(key => {
            if (panels[key]) {
              panels[key].style.display = (key === tab) ? 'block' : 'none';
            }
          });
        });
      });
    }

    // Pediatric Calc Inputs
    const elPedsAge = document.getElementById('peds-age-input');
    const elPedsWeight = document.getElementById('peds-weight-input');
    const elPedsResults = document.getElementById('peds-calc-results');

    function renderPediatricsUI() {
      if (!elPedsResults) return;
      const age = parseFloat(elPedsAge ? elPedsAge.value : 4) || 4;
      const wt = parseFloat(elPedsWeight ? elPedsWeight.value : 16) || 16;
      const res = calculatePediatrics(age, wt);

      elPedsResults.innerHTML = `
        <div class="calc-card-metric highlight-safe">
          <div class="calc-metric-title">🫁 Tubus gecufft / unblockt</div>
          <div class="calc-metric-value">${res.cuffed.toFixed(1)} mm <small style="font-size: 0.8rem; font-weight: normal;">(uncuffed: ${res.uncuffed.toFixed(1)})</small></div>
          <div class="calc-metric-note">Einführtiefe Zähne: <strong>ca. ${res.depth.toFixed(1)} cm</strong> (Formel: ID × 3)</div>
        </div>
        <div class="calc-card-metric highlight-alert">
          <div class="calc-metric-title">🚨 Adrenalin Notfall (ALS)</div>
          <div class="calc-metric-value">${res.adrMg} mg <small style="font-size: 0.8rem; font-weight: normal;">(= ${res.adrMl} ml 1:10.000)</small></div>
          <div class="calc-metric-note">10 µg/kg i.v. alle 3–5 Min bei Kreislaufstillstand</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">❤️ Atropin (Bradykardie)</div>
          <div class="calc-metric-value">${res.atropin} mg</div>
          <div class="calc-metric-note">20 µg/kg i.v. (Mindestdosis: 0.1 mg gegen paradoxe Bradykardie)</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">⚡ Defibrillation (VF/pVT)</div>
          <div class="calc-metric-value">${res.defib} Joule</div>
          <div class="calc-metric-note">4 J/kg biphasisch ab 1. Schock</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">💊 Rocuronium</div>
          <div class="calc-metric-value">${res.rocuronium} mg <small style="font-size: 0.8rem; font-weight: normal;">(RSI: ${res.rocuroniumRSI} mg)</small></div>
          <div class="calc-metric-note">0.6 mg/kg elektiv, 1.0 mg/kg für RSI (Sugammadex bereit!)</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">💧 Flüssigkeitsbolus</div>
          <div class="calc-metric-value">${res.fluidsMin} – ${res.fluidsMax} ml</div>
          <div class="calc-metric-note">10–20 ml/kg kristalloide Vollelektrolytlösung</div>
        </div>
        <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
          <button class="btn-calc-copy" onclick="ClinicalCalculators.copyCalcValues('Pädiatrie (${res.age} Jahre, ${res.weight} kg): Tubus ${res.cuffed.toFixed(1)} mm (Tiefe ${res.depth.toFixed(1)} cm) | Adrenalin ${res.adrMg} mg | Atropin ${res.atropin} mg | Defib ${res.defib} J | Rocuronium ${res.rocuronium} mg (RSI: ${res.rocuroniumRSI} mg)', this)">
            📋 Pädiatrie-Werte kopieren
          </button>
        </div>
      `;
    }

    if (elPedsAge && elPedsWeight) {
      elPedsAge.addEventListener('input', () => {
        const age = parseFloat(elPedsAge.value) || 0;
        if (age > 0) {
          elPedsWeight.value = Math.round((age + 4) * 2);
        }
        renderPediatricsUI();
      });
      elPedsWeight.addEventListener('input', renderPediatricsUI);
    }

    // ARDS Calc Inputs
    const elArdsGender = document.getElementById('ards-gender-input');
    const elArdsHeight = document.getElementById('ards-height-input');
    const elArdsResults = document.getElementById('ards-calc-results');

    function renderArdsUI() {
      if (!elArdsResults) return;
      const gender = elArdsGender ? elArdsGender.value : 'male';
      const height = parseFloat(elArdsHeight ? elArdsHeight.value : 175) || 175;
      const res = calculateARDS(gender, height);

      elArdsResults.innerHTML = `
        <div class="calc-card-metric highlight-safe">
          <div class="calc-metric-title">⚖️ Predicted Body Weight (PBW)</div>
          <div class="calc-metric-value">${res.pbw.toFixed(1)} kg</div>
          <div class="calc-metric-note">Devine-Formel basierend auf Körpergröße ${res.height} cm</div>
        </div>
        <div class="calc-card-metric highlight-safe">
          <div class="calc-metric-title">🫁 Lungenprotektives VT (6 ml/kg)</div>
          <div class="calc-metric-value">${res.vt6} ml</div>
          <div class="calc-metric-note"><strong>Goldstandard:</strong> Striktes ARDSNet-Zielvolumen</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">🫁 Moderates VT (8 ml/kg)</div>
          <div class="calc-metric-value">${res.vt8} ml</div>
          <div class="calc-metric-note">Obergrenze bei nicht-geschädigter Lunge</div>
        </div>
        <div class="calc-card-metric highlight-alert">
          <div class="calc-metric-title">⚠️ Driving Pressure Limit</div>
          <div class="calc-metric-value">ΔP ≤ ${res.drivingPressureMax} cmH₂O</div>
          <div class="calc-metric-note">ΔP = P_plat – PEEP. Bei Überschreitung: Mortalität ↑</div>
        </div>
        <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
          <button class="btn-calc-copy" onclick="ClinicalCalculators.copyCalcValues('ARDS Beatmung (${res.height} cm): PBW ${res.pbw.toFixed(1)} kg | Vt (6 ml/kg): ${res.vt6} ml (Goldstandard) | Vt (8 ml/kg): ${res.vt8} ml | Max. Driving Pressure: ΔP ≤ 14 cmH₂O', this)">
            📋 Beatmungswerte kopieren
          </button>
        </div>
      `;
    }

    if (elArdsGender && elArdsHeight) {
      elArdsGender.addEventListener('change', renderArdsUI);
      elArdsHeight.addEventListener('input', renderArdsUI);
    }

    // LA Calc Inputs
    const elLaWeight = document.getElementById('la-weight-input');
    const elLaResults = document.getElementById('la-calc-results');

    function renderLaUI() {
      if (!elLaResults) return;
      const wt = parseFloat(elLaWeight ? elLaWeight.value : 70) || 70;
      const res = calculateLocalAnesthetics(wt);

      elLaResults.innerHTML = `
        <div class="calc-card-metric">
          <div class="calc-metric-title">💉 Ropivacain (max. 3 mg/kg)</div>
          <div class="calc-metric-value">${res.ropivacaine} mg</div>
          <div class="calc-metric-note">Max. Höchstdosis für ${res.weight} kg (absolute Obergrenze 225–300 mg)</div>
        </div>
        <div class="calc-card-metric highlight-alert">
          <div class="calc-metric-title">💉 Bupivacain (max. 2 mg/kg)</div>
          <div class="calc-metric-value">${res.bupivacaine} mg</div>
          <div class="calc-metric-note">Kardiotoxisch! Absolute Obergrenze 150 mg beachten!</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">💉 Lidocain (pur vs. Adrenalin)</div>
          <div class="calc-metric-value">${res.lidocainePlain} mg <small style="font-size: 0.8rem; font-weight: normal;">(+Adr: ${res.lidocaineEpi} mg)</small></div>
          <div class="calc-metric-note">4 mg/kg pur, 7 mg/kg mit Vasokonstriktor-Zusatz</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">💉 Prilocain (max. 6 mg/kg)</div>
          <div class="calc-metric-value">${res.prilocaine} mg</div>
          <div class="calc-metric-note">Cave: Methämoglobinämie! (Antidot: Toluidinblau 2–4 mg/kg)</div>
        </div>
        <div class="calc-card-metric highlight-alert">
          <div class="calc-metric-title">🧴 Intralipid 20% Rescue-Bolus</div>
          <div class="calc-metric-value">${res.intralipidBolus} ml i.v.</div>
          <div class="calc-metric-note">1.5 ml/kg über 1 Min bei LAST, danach 0.25 ml/kg/min</div>
        </div>
        <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
          <button class="btn-calc-copy" onclick="ClinicalCalculators.copyCalcValues('LA Höchstdosen (${res.weight} kg): Ropivacain ${res.ropivacaine} mg | Bupivacain ${res.bupivacaine} mg | Lidocain pur ${res.lidocainePlain} mg (mit Adr: ${res.lidocaineEpi} mg) | Prilocain ${res.prilocaine} mg | Intralipid 20% Bolus: ${res.intralipidBolus} ml', this)">
            📋 LA-Dosen kopieren
          </button>
        </div>
      `;
    }

    if (elLaWeight) {
      elLaWeight.addEventListener('input', renderLaUI);
    }

    // Sodium Calc Inputs
    const elNaDemog = document.getElementById('na-demog-input');
    const elNaWeight = document.getElementById('na-weight-input');
    const elNaCurrent = document.getElementById('na-current-input');
    const elNaResults = document.getElementById('na-calc-results');

    function renderSodiumUI() {
      if (!elNaResults) return;
      const demog = elNaDemog ? elNaDemog.value : 'male';
      const wt = parseFloat(elNaWeight ? elNaWeight.value : 70) || 70;
      const naCur = parseFloat(elNaCurrent ? elNaCurrent.value : 118) || 118;
      const res = calculateSodium(demog, wt, naCur);

      elNaResults.innerHTML = `
        <div class="calc-card-metric highlight-safe">
          <div class="calc-metric-title">💧 Gesamtkörperwasser (TBW)</div>
          <div class="calc-metric-value">${res.tbw.toFixed(1)} Liter</div>
          <div class="calc-metric-note">${(res.factor * 100).toFixed(0)}% des Körpergewichts (${res.weight} kg)</div>
        </div>
        <div class="calc-card-metric">
          <div class="calc-metric-title">🧪 Berechnetes Na⁺-Defizit</div>
          <div class="calc-metric-value">${res.deficit} mmol</div>
          <div class="calc-metric-note">Bis zur Norm (140 mmol/l). Formel: TBW × (140 – Na_ist)</div>
        </div>
        <div class="calc-card-metric highlight-alert">
          <div class="calc-metric-title">🛑 Max. 24h-Zielgrenze</div>
          <div class="calc-metric-value">≤ ${res.maxDayNa} mmol/l</div>
          <div class="calc-metric-note"><strong>Max. +8 bis 10 mmol/l pro 24h!</strong> Gefahr der pontinen Myelinolyse (ODS) bei zu raschem Ausgleich!</div>
        </div>
        <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
          <button class="btn-calc-copy" onclick="ClinicalCalculators.copyCalcValues('Natrium-Defizit (${res.weight} kg, Na_ist: ${res.naCurrent} mmol/l): TBW ${res.tbw.toFixed(1)} L | Defizit bis 140: ${res.deficit} mmol | Max. 24h-Grenze: ≤ ${res.maxDayNa} mmol/l (+8 mmol/l max/Tag)', this)">
            📋 Natrium-Werte kopieren
          </button>
        </div>
      `;
    }

    if (elNaDemog && elNaWeight && elNaCurrent) {
      elNaDemog.addEventListener('change', renderSodiumUI);
      elNaWeight.addEventListener('input', renderSodiumUI);
      elNaCurrent.addEventListener('input', renderSodiumUI);
    }

    function recalculateAll() {
      renderPediatricsUI();
      renderArdsUI();
      renderLaUI();
      renderSodiumUI();
    }

    // Expose recalculateUI
    ClinicalCalculators.recalculateAll = recalculateAll;
    global.recalculateAllMedicalCalculators = recalculateAll;
    global.calcPediatrics = renderPediatricsUI;
    global.calcArds = renderArdsUI;
    global.calcLA = renderLaUI;
    global.calcSodium = renderSodiumUI;

    // Run initial calculation
    recalculateAll();
  }

  const ClinicalCalculators = {
    calculatePediatrics,
    calculateARDS,
    calculateLocalAnesthetics,
    calculateSodium,
    copyCalcValues,
    init: initClinicalCalculators
  };

  // Attach global backward-compatibility helpers
  global.copyCalcValues = copyCalcValues;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClinicalCalculators;
  } else {
    global.ClinicalCalculators = ClinicalCalculators;
  }
})(typeof window !== 'undefined' ? window : this);
