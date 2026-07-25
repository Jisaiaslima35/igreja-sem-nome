/* audio-recorder.js — Botão de mic para Rádio Louvor e Gratidão
 * Grava áudio do usuário, transcreve via Web Speech API,
 * e envia o texto transcrito como mensagem pro chat do Hermes.
 * Baseado no padrão do audio-recorder.js da Rádio Sub-12.
 */
(function() {
  'use strict';
  if (window.__AUDIO_RECORDER_LOADED__) return;
  window.__AUDIO_RECORDER_LOADED__ = true;

  const btn = document.getElementById('btn-mic');
  const iconMic = document.getElementById('mic-icon');
  const iconStop = document.getElementById('mic-stop');
  const status = document.getElementById('mic-status');
  if (!btn) return;

  const RED = '#ef4444';
  const SLATE = '#475569';
  const GOLD = '#d4a73a';

  let mediaRecorder = null;
  let audioChunks = [];
  let stream = null;
  let recognition = null;
  let state = 'idle';

  function setIdle() {
    state = 'idle';
    btn.classList.remove('recording', 'uploading');
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.animation = '';
    iconMic.style.display = '';
    iconStop.style.display = 'none';
    if (status) { status.textContent = 'Toque pra gravar'; status.style.color = '#718096'; }
    btn.disabled = false;
  }
  function setRecording() {
    state = 'recording';
    btn.classList.add('recording');
    iconMic.style.display = 'none';
    iconStop.style.display = '';
    if (status) { status.textContent = '🔴 Gravando... (toque pra parar)'; status.style.color = RED; }
    btn.disabled = false;
  }
  function setTranscribing() {
    state = 'transcribing';
    btn.classList.remove('recording');
    btn.classList.add('uploading');
    iconMic.style.display = '';
    iconStop.style.display = 'none';
    if (status) { status.textContent = '⏳ Transcrevendo áudio...'; status.style.color = GOLD; }
    btn.disabled = true;
  }
  function setSending() {
    state = 'sending';
    if (status) { status.textContent = '📤 Enviando pro Hermes...'; status.style.color = '#3182ce'; }
  }

  function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = true;
    return rec;
  }

  async function startRecording() {
    try {
      // 1. Pede acesso ao mic
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });

      // 2. Configura MediaRecorder (pra ter o arquivo de áudio também)
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(m => MediaRecorder.isTypeSupported(m)) || '';
      mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();

      // 3. Inicia transcrição em tempo real (Web Speech API)
      recognition = initSpeechRecognition();
      if (recognition) {
        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (status) {
            status.textContent = '🔴 ' + (transcript || 'Gravando...') + '...';
          }
          // Salva o último transcript
          window.__LAST_TRANSCRIPT__ = transcript;
        };
        recognition.onerror = (e) => {
          console.warn('[audio-rec] erro de reconhecimento:', e.error);
        };
        try {
          recognition.start();
        } catch (e) {
          console.warn('[audio-rec] não foi possível iniciar reconhecimento:', e);
        }
      }

      setRecording();
    } catch (e) {
      console.error('[audio-rec] getUserMedia falhou:', e);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      setIdle();
    }
  }

  function stopRecording() {
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  }

  async function handleStop() {
    setTranscribing();

    // Pega o transcript (se teve reconhecimento de voz) ou converte via API
    let transcript = window.__LAST_TRANSCRIPT__ || '';

    // Se não teve transcript via Web Speech, tenta enviar o blob pro backend
    if (!transcript.trim()) {
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      if (blob.size < 800) {
        alert('Áudio muito curto. Tente novamente.');
        setIdle();
        return;
      }
      // Fallback: envia como arquivo (sem transcrição automática)
      // Por enquanto só avisamos que precisa de transcrição server-side
      if (status) {
        status.textContent = '⚠️ Seu navegador não tem reconhecimento de voz. Use o teclado.';
      }
      setTimeout(() => setIdle(), 4000);
      return;
    }

    // Envia o texto transcrito pro chat do Hermes
    setSending();
    await enviarNoChat(transcript.trim());
    window.__LAST_TRANSCRIPT__ = '';
    setIdle();
  }

  async function enviarNoChat(texto) {
    // Procura o iframe do chat
    const chatSection = document.getElementById('chat-ao-vivo');
    if (!chatSection) return;
    const iframe = chatSection.querySelector('iframe');
    if (!iframe) return;

    try {
      // Tenta enviar via postMessage (se o chat aceitar)
      iframe.contentWindow.postMessage({
        type: 'prefill-message',
        message: texto
      }, '*');
    } catch (e) {
      console.warn('[audio-rec] postMessage falhou:', e);
    }

    // Rola até o chat
    chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Fallback visual: mostra um toast
    if (status) {
      status.textContent = '✅ Mensagem enviada! "' + texto.substring(0, 50) + (texto.length > 50 ? '...' : '') + '"';
      status.style.color = '#2ecc71';
    }
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  });

  setIdle();
})();
