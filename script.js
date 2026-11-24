(() => {
  'use strict';

  const PREDICT_API_URL = 'https://mental-health-score-zryj.onrender.com/';
  const GAUGE_ARC_LENGTH = 298.45; // Matches SVG semi-circle path length (pi * 95)

  const PLATFORM_PURPOSE_MAP = {
    LinkedIn: { suggested: ['Networking', 'Education'], text: 'Typical for LinkedIn: Networking or Education' },
    YouTube: { suggested: ['Education', 'Entertainment'], text: 'Typical for YouTube: Education or Entertainment' },
    Instagram: { suggested: ['Entertainment', 'Networking'], text: 'Typical for Instagram: Entertainment or Networking' },
    TikTok: { suggested: ['Entertainment', 'News'], text: 'Typical for TikTok: Entertainment or News' },
    Snapchat: { suggested: ['Entertainment', 'Networking'], text: 'Typical for Snapchat: Entertainment or Networking' },
    Twitter: { suggested: ['News', 'Networking'], text: 'Typical for Twitter: News or Networking' },
    Facebook: { suggested: ['Networking', 'News'], text: 'Typical for Facebook: Networking or News' },
    WhatsApp: { suggested: ['Networking', 'Education'], text: 'Typical for WhatsApp: Networking or Education' },
    WeChat: { suggested: ['Networking', 'News'], text: 'Typical for WeChat: Networking or News' },
    LINE: { suggested: ['Networking', 'Entertainment'], text: 'Typical for LINE: Networking or Entertainment' },
    KakaoTalk: { suggested: ['Networking', 'Entertainment'], text: 'Typical for KakaoTalk: Networking or Entertainment' },
    VKontakte: { suggested: ['Networking', 'Entertainment'], text: 'Typical for VKontakte: Networking or Entertainment' }
  };

  const form = document.getElementById('prediction-form');
  const predictBtn = document.getElementById('predict-btn');
  const resetBtn = document.getElementById('reset-btn');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnIcon = document.getElementById('btn-icon');
  const btnText = document.getElementById('btn-text');

  const countrySelect = document.getElementById('country');
  const platformSelect = document.getElementById('most_used_platform');
  const purposeGuide = document.getElementById('purpose-guide');
  const customCountryWrap = document.getElementById('custom-country-wrap');
  const customCountryInput = document.getElementById('custom-country');

  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const gaugeArc = document.getElementById('gauge-arc');
  const scoreNumber = document.getElementById('score-number');

  const apiErrorBox = document.getElementById('api-error-box');
  const apiErrorMessage = document.getElementById('api-error-message');

  const interpTag = document.getElementById('interp-tag');
  const interpHeading = document.getElementById('interp-heading');
  const interpBody = document.getElementById('interp-body');

  const snapScreen = document.getElementById('snap-screen');
  const snapSleep = document.getElementById('snap-sleep');
  const snapStudy = document.getElementById('snap-study');
  const snapActivity = document.getElementById('snap-activity');

  // Clear leading "0" on focus so users never have to delete zero before typing
  document.querySelectorAll('.zero-clearable').forEach((input) => {
    input.addEventListener('focus', () => {
      if (input.value === '0') {
        input.value = '';
      }
    });

    input.addEventListener('input', () => {
      // Strip accidental leading zero before another digit (e.g. "05" -> "5")
      if (/^0\d/.test(input.value)) {
        input.value = input.value.replace(/^0+/, '');
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim() === '') {
        input.value = '0';
      }
    });
  });

  // Sync range sliders with number inputs and dashboard snapshot cards
  const rangePairs = [
    { id: 'avg_daily_usage_hours', snapEl: snapScreen },
    { id: 'study_hours', snapEl: snapStudy },
    { id: 'physical_activity_hours', snapEl: snapActivity },
    { id: 'sleep_hours_per_night', snapEl: snapSleep }
  ];

  rangePairs.forEach(({ id, snapEl }) => {
    const numInput = document.getElementById(id);
    const rangeInput = document.getElementById(`range-${id}`);

    const syncSnapshot = (rawVal) => {
      const parsed = parseFloat(rawVal);
      const displayVal = Number.isFinite(parsed) ? parsed.toFixed(1) : '0.0';
      if (snapEl) snapEl.textContent = `${displayVal} hrs`;
    };

    rangeInput.addEventListener('input', (e) => {
      numInput.value = e.target.value;
      syncSnapshot(e.target.value);
      clearFieldError(id);
    });

    numInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (Number.isFinite(val) && val >= 0 && val <= 24) {
        rangeInput.value = val;
      }
      syncSnapshot(e.target.value);
      clearFieldError(id);
    });
  });

  // Update Primary Purpose guidance based on selected Most Used Platform
  function updatePurposeGuidance(platform) {
    const info = PLATFORM_PURPOSE_MAP[platform];
    const purposeButtons = document.querySelectorAll('.pill-btn[data-field="purpose_of_use"]');

    purposeButtons.forEach((btn) => btn.classList.remove('suggested'));

    if (!info) {
      purposeGuide.textContent = 'Select a platform above for a suggestion';
      return;
    }

    purposeGuide.textContent = info.text;
    purposeButtons.forEach((btn) => {
      if (info.suggested.includes(btn.dataset.value)) {
        btn.classList.add('suggested');
      }
    });
  }

  // Pill radio button groups
  document.querySelectorAll('.pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      const hiddenInput = document.getElementById(field);
      const group = btn.closest('.pill-group');

      group.querySelectorAll('.pill-btn').forEach((sibling) => {
        sibling.classList.remove('active');
        sibling.setAttribute('aria-checked', 'false');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      hiddenInput.value = value;
      clearFieldError(field);
    });
  });

  // Country "Other" toggle
  countrySelect.addEventListener('change', () => {
    clearFieldError('country');
    if (countrySelect.value === 'Other') {
      customCountryWrap.classList.remove('hidden');
    } else {
      customCountryWrap.classList.add('hidden');
      customCountryInput.value = '';
    }
  });

  platformSelect.addEventListener('change', () => {
    clearFieldError('most_used_platform');
    updatePurposeGuidance(platformSelect.value);
  });

  // Initialize guidance for default platform
  updatePurposeGuidance(platformSelect.value);

  function setFieldError(fieldId, message) {
    const errEl = document.getElementById(`error-${fieldId}`);
    if (errEl) errEl.textContent = message;
  }

  function clearFieldError(fieldId) {
    const errEl = document.getElementById(`error-${fieldId}`);
    if (errEl) errEl.textContent = '';
  }

  function clearAllErrors() {
    document.querySelectorAll('.field-error').forEach((el) => {
      el.textContent = '';
    });
    apiErrorBox.classList.add('hidden');
    apiErrorMessage.textContent = '';
  }

  function setLoadingState(isLoading) {
    predictBtn.disabled = isLoading;
    statusBadge.classList.remove('error');

    if (isLoading) {
      btnSpinner.classList.remove('hidden');
      btnIcon.classList.add('hidden');
      btnText.textContent = 'Reading Signal...';
      statusBadge.classList.add('loading');
      statusText.textContent = 'Analyzing Signal';
    } else {
      btnSpinner.classList.add('hidden');
      btnIcon.classList.remove('hidden');
      btnText.textContent = 'Read My Signal';
      statusBadge.classList.remove('loading');
    }
  }

  function validateAndBuildPayload() {
    clearAllErrors();
    let isValid = true;

    const ageRaw = document.getElementById('age').value.trim();
    const age = Number(ageRaw);
    if (ageRaw === '' || !Number.isInteger(age) || age < 14 || age > 100) {
      setFieldError('age', 'Enter a whole number between 14 and 100.');
      isValid = false;
    }

    if (!countrySelect.value) {
      setFieldError('country', 'Please select a country.');
      isValid = false;
    }

    if (!platformSelect.value) {
      setFieldError('most_used_platform', 'Please select your most used platform.');
      isValid = false;
    }

    const requiredSelections = [
      { id: 'gender', label: 'gender' },
      { id: 'academic_level', label: 'academic level' },
      { id: 'purpose_of_use', label: 'purpose of use' },
      { id: 'stress_level', label: 'stress level' }
    ];

    requiredSelections.forEach(({ id, label }) => {
      if (!document.getElementById(id).value) {
        setFieldError(id, `Please select a ${label}.`);
        isValid = false;
      }
    });

    const unlocksRaw = document.getElementById('daily_unlocks').value.trim();
    const dailyUnlocks = Number(unlocksRaw);
    if (unlocksRaw === '' || !Number.isInteger(dailyUnlocks) || dailyUnlocks < 0) {
      setFieldError('daily_unlocks', 'Enter a whole number of 0 or more.');
      isValid = false;
    }

    const hourFields = [
      { id: 'avg_daily_usage_hours', label: 'Daily screen usage' },
      { id: 'study_hours', label: 'Study hours' },
      { id: 'physical_activity_hours', label: 'Physical activity hours' },
      { id: 'sleep_hours_per_night', label: 'Sleep hours' }
    ];

    const numericValues = {};
    hourFields.forEach(({ id, label }) => {
      const raw = document.getElementById(id).value.trim();
      const val = Number(raw);
      if (raw === '' || Number.isNaN(val) || val < 0 || val > 24) {
        setFieldError(id, `${label} must be between 0 and 24 hours.`);
        isValid = false;
      } else {
        numericValues[id] = val;
      }
    });

    if (!isValid) return null;

    let selectedCountry = countrySelect.value;
    if (selectedCountry === 'Other' && customCountryInput.value.trim() !== '') {
      selectedCountry = customCountryInput.value.trim();
    }

    // Exact field names and types expected by FastAPI StudentData Pydantic model
    return {
      age: age,
      gender: document.getElementById('gender').value,
      country: selectedCountry,
      academic_level: document.getElementById('academic_level').value,
      most_used_platform: platformSelect.value,
      purpose_of_use: document.getElementById('purpose_of_use').value,
      avg_daily_usage_hours: numericValues.avg_daily_usage_hours,
      daily_unlocks: dailyUnlocks,
      study_hours: numericValues.study_hours,
      physical_activity_hours: numericValues.physical_activity_hours,
      sleep_hours_per_night: numericValues.sleep_hours_per_night,
      stress_level: document.getElementById('stress_level').value
    };
  }

  function getInterpretation(score) {
    if (score >= 8.0) {
      return {
        tierClass: 'tier-high',
        tag: 'Thriving Signal',
        heading: 'Strong Mental Well-Being',
        body: 'Your digital habits, sleep, and lifestyle indicators align with a healthy, resilient mental health score. Keep protecting your rest and offline balance.'
      };
    }
    if (score >= 6.0) {
      return {
        tierClass: 'tier-high',
        tag: 'Balanced Signal',
        heading: 'Steady Well-Being',
        body: 'Your overall signal is positive and balanced. Small improvements in screen boundaries or consistent sleep could push your well-being even higher.'
      };
    }
    if (score >= 4.0) {
      return {
        tierClass: 'tier-mid',
        tag: 'Moderate Strain',
        heading: 'Signals Worth Monitoring',
        body: 'Your inputs suggest moderate daily strain. Consider trimming passive screen time, adding a short physical activity break, and prioritizing 7–8 hours of sleep.'
      };
    }
    return {
      tierClass: 'tier-low',
      tag: 'Elevated Strain',
      heading: 'High Stress / Low Recovery Signal',
      body: 'Your predicted score indicates elevated strain. Focusing on restorative sleep, stepping back from frequent phone unlocks, and reaching out to peers or campus support can help.'
    };
  }

  function renderPrediction(score) {
    const clampedScore = Math.max(0, Math.min(10, Number(score)));
    const offset = GAUGE_ARC_LENGTH * (1 - clampedScore / 10);

    gaugeArc.style.strokeDashoffset = offset.toFixed(2);
    scoreNumber.textContent = clampedScore.toFixed(2);

    const interp = getInterpretation(clampedScore);
    interpTag.className = `interp-tag ${interp.tierClass}`;
    interpTag.textContent = interp.tag;
    interpHeading.textContent = interp.heading;
    interpBody.textContent = interp.body;

    statusBadge.classList.remove('error', 'loading');
    statusText.textContent = 'Signal Captured';
  }

  function showApiError(message) {
    statusBadge.classList.remove('loading');
    statusBadge.classList.add('error');
    statusText.textContent = 'Connection Error';
    apiErrorMessage.textContent = message;
    apiErrorBox.classList.remove('hidden');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = validateAndBuildPayload();
    if (!payload) return;

    setLoadingState(true);

    try {
      const response = await fetch(PREDICT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let detail = `Server responded with status ${response.status}.`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            detail = Array.isArray(errData.detail)
              ? errData.detail.map((d) => `${d.loc?.slice(-1)[0] || 'field'}: ${d.msg}`).join('; ')
              : String(errData.detail);
          }
        } catch (_) {
          // Ignore JSON parse error on non-JSON error responses
        }
        throw new Error(detail);
      }

      const data = await response.json();
      if (typeof data.predicted_mental_health_score !== 'number') {
        throw new Error('Unexpected response format from /predict endpoint.');
      }

      renderPrediction(data.predicted_mental_health_score);
    } catch (error) {
      const isNetworkErr = error instanceof TypeError;
      const friendlyMsg = isNetworkErr
        ? `Could not reach ${PREDICT_API_URL}. Make sure your FastAPI server is running (uvicorn main:app --reload) and CORS is enabled.`
        : error.message;
      showApiError(friendlyMsg);
    } finally {
      setLoadingState(false);
    }
  });

  // Reset every field to zero or unselected
  resetBtn.addEventListener('click', () => {
    clearAllErrors();

    // Clear / zero numeric inputs (zero clears automatically on focus)
    document.getElementById('age').value = '';
    document.getElementById('daily_unlocks').value = '0';

    // Unselect dropdowns
    countrySelect.value = '';
    platformSelect.value = '';
    customCountryWrap.classList.add('hidden');
    customCountryInput.value = '';
    updatePurposeGuidance('');

    // Unselect all pill button groups
    ['gender', 'academic_level', 'purpose_of_use', 'stress_level'].forEach((field) => {
      document.getElementById(field).value = '';
      document.querySelectorAll(`.pill-btn[data-field="${field}"]`).forEach((btn) => {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      });
    });

    // Zero all hour sliders, numeric inputs, and snapshot metrics
    rangePairs.forEach(({ id, snapEl }) => {
      const numInput = document.getElementById(id);
      const rangeInput = document.getElementById(`range-${id}`);
      numInput.value = '0';
      rangeInput.value = '0';
      if (snapEl) snapEl.textContent = '0.0 hrs';
    });

    // Reset dashboard
    gaugeArc.style.strokeDashoffset = GAUGE_ARC_LENGTH;
    scoreNumber.textContent = '--';
    statusBadge.classList.remove('error', 'loading');
    statusText.textContent = 'Ready to Analyze';
    interpTag.className = 'interp-tag';
    interpTag.textContent = 'Awaiting Input';
    interpHeading.textContent = 'Your well-being signal will appear here';
    interpBody.innerHTML =
      'Complete the three sections on the left and click <strong>Read My Signal</strong> to receive a real-time prediction from your FastAPI machine learning model.';
  });
})();
