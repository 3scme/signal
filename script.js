"use strict";

(() => {
  const tuner = document.querySelector("#tuner");
  const frequency = document.querySelector("#frequency");
  const signalName = document.querySelector("#signal-name");
  const meterFill = document.querySelector("#meter-fill");

  const powerButton = document.querySelector("#power");
  const powerReadout = document.querySelector("#power-readout");

  const volumeControl = document.querySelector("#volume");

  const modeButtons = document.querySelectorAll(".mode-button");
  const modeReadout = document.querySelector("#mode-readout");

  let powered = false;

  let audioContext = null;
  let noiseSource = null;
  let noiseGain = null;
  let toneOscillator = null;
  let toneGain = null;

  const signals = [
    {
      frequency: 4625,
      width: 18,
      name: "VOICE / WEAK",
      strength: 68,
      tone: 420
    },
    {
      frequency: 6070,
      width: 22,
      name: "MUSIC",
      strength: 76,
      tone: 520
    },
    {
      frequency: 7100,
      width: 16,
      name: "CW / INTERMITTENT",
      strength: 54,
      tone: 760
    },
    {
      frequency: 10000,
      width: 12,
      name: "TIME SIGNAL",
      strength: 92,
      tone: 1000
    },
    {
      frequency: 14230,
      width: 25,
      name: "VOICE / TWO STATIONS",
      strength: 70,
      tone: 560
    },
    {
      frequency: 18112,
      width: 10,
      name: "DATA",
      strength: 81,
      tone: 1180
    },
    {
      frequency: 23317,
      width: 8,
      name: "CARRIER",
      strength: 63,
      tone: 880
    }
  ];

  function nearestSignal(value) {
    let nearest = null;
    let distance = Infinity;

    for (const signal of signals) {
      const currentDistance = Math.abs(
        value - signal.frequency
      );

      if (
        currentDistance <= signal.width &&
        currentDistance < distance
      ) {
        nearest = signal;
        distance = currentDistance;
      }
    }

    return nearest;
  }

  function signalStrength(signal, value) {
    if (!signal) {
      return 2 + Math.random() * 10;
    }

    const distance = Math.abs(
      value - signal.frequency
    );

    const closeness =
      1 - distance / signal.width;

    return Math.max(
      8,
      signal.strength * closeness
    );
  }

  function updateDisplay() {
    const value = Number(tuner.value);

    frequency.textContent = value;

    if (!powered) {
      signalName.textContent = "—";
      meterFill.style.width = "0%";
      updateAudio(null, value);
      return;
    }

    const signal = nearestSignal(value);

    signalName.textContent = signal
      ? signal.name
      : "NO SIGNAL";

    const strength = signalStrength(signal, value);

    meterFill.style.width =
      `${Math.min(100, strength)}%`;

    updateAudio(signal, value);
  }

  function createNoiseBuffer(context) {
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(
      1,
      length,
      context.sampleRate
    );

    const channel = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      channel[i] =
        Math.random() * 2 - 1;
    }

    return buffer;
  }

  async function startAudio() {
    if (audioContext) {
      await audioContext.resume();
      return;
    }

    audioContext = new AudioContext();

    noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(audioContext);
    noiseSource.loop = true;

    noiseGain = audioContext.createGain();
    noiseGain.gain.value = 0;

    toneOscillator = audioContext.createOscillator();
    toneOscillator.type = "sine";

    toneGain = audioContext.createGain();
    toneGain.gain.value = 0;

    noiseSource.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    toneOscillator.connect(toneGain);
    toneGain.connect(audioContext.destination);

    noiseSource.start();
    toneOscillator.start();
  }

  function currentVolume() {
    return Number(volumeControl.value) / 100;
  }

  function updateAudio(signal, value) {
    if (
      !audioContext ||
      !noiseGain ||
      !toneGain
    ) {
      return;
    }

    if (!powered) {
      noiseGain.gain.setTargetAtTime(
        0,
        audioContext.currentTime,
        0.05
      );

      toneGain.gain.setTargetAtTime(
        0,
        audioContext.currentTime,
        0.05
      );

      return;
    }

    const volume = currentVolume();

    if (!signal) {
      noiseGain.gain.setTargetAtTime(
        volume * 0.11,
        audioContext.currentTime,
        0.05
      );

      toneGain.gain.setTargetAtTime(
        0,
        audioContext.currentTime,
        0.05
      );

      return;
    }

    const distance = Math.abs(
      value - signal.frequency
    );

    const quality =
      1 - distance / signal.width;

    noiseGain.gain.setTargetAtTime(
      volume * (0.10 - quality * 0.07),
      audioContext.currentTime,
      0.05
    );

    toneOscillator.frequency.setTargetAtTime(
      signal.tone + distance * 11,
      audioContext.currentTime,
      0.03
    );

    toneGain.gain.setTargetAtTime(
      volume * quality * 0.055,
      audioContext.currentTime,
      0.04
    );
  }

  powerButton.addEventListener(
    "click",
    async () => {
      powered = !powered;

      if (powered) {
        await startAudio();

        powerButton.classList.add("on");
        powerButton.textContent = "ON";
        powerReadout.textContent = "receiver on";
      } else {
        powerButton.classList.remove("on");
        powerButton.textContent = "POWER";
        powerReadout.textContent = "receiver off";
      }

      updateDisplay();
    }
  );

  tuner.addEventListener(
    "input",
    updateDisplay
  );

  volumeControl.addEventListener(
    "input",
    updateDisplay
  );

  modeButtons.forEach(button => {
    button.addEventListener(
      "click",
      () => {
        modeButtons.forEach(item => {
          item.classList.remove("active");
        });

        button.classList.add("active");

        modeReadout.textContent =
          button.dataset.mode;
      }
    );
  });

  updateDisplay();
})();