/* audio-recorder.js — Botão de mic para Rádio Louvor e Gratidão
 * Grava áudio do usuário, envia pro backend Python (faster-whisper) pra transcrição,
 * e o texto transcrito vai pro chat do Hermes.
 * Baseado no padrão da Rádio Sub-12 / Mega Crystal.
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
  const BLUE = '#3182ce';
  const GREEN = '#2ecc71';
  const GOLD = '#d4a73a';

  let mediaRecorder = null;
  let audioChunks = [];
  let stream = null;
  let state = 'idle';

  function setIdle() {
    state = 'idle';
    btn.classList.remove('recording', 'uploading');
    iconMic.style.display = '';
    iconStop.style.display = 'none';
    if (status) { status.textContent = 'Toque pra gravar sua mensagem de voz'; status.style.color = '#cbd5e0'; }
    btn.disabled = false;
  }
  function setRecording() {
    state = 'recording';
    btn.classList.add('recording');
    iconMic.style.display = 'none';
    iconStop.style.display = '';
    if (status) { status.textContent = '🔴 Gravando... (toque pra parar)'; status.style.color = '#fff'; }
    btn.disabled = false;
  }
  function setUploading() {
    state = 'uploading';
    btn.classList.remove('recording');
    btn.classList.add('uploading');
    iconMic.style.display = '';
    iconStop.style.display = 'none';
    if (status) { status.textContent = '⏳ Enviando áudio...'; status.style.color = GOLD; }
    btn.disabled = true;
  }
  function setTranscribing() {
    if (status) { status.textContent = '🤖 Transcrevendo áudio (IA)...'; status.style.color = BLUE; }
  }
  function setSending(text) {
    if (status) { status.textContent = '📤 Enviando pro Hermes: "' + text.substring(0, 60) + (text.length > 60 ? '...' : '') + '"'; status.style.color = BLUE; }
  }
  function setSuccess(text) {
    if (status) { status.textContent = '✅ Enviado! "' + text.substring(0, 60) + '"'; status.style.color = GREEN; }
  }
  function setError(msg) {
    if (status) { status.textContent = '❌ ' + msg; status.style.color = RED; }
  }

  async function startRecording() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });

      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(m => MediaRecorder.isTypeSupported(m)) || '';
      mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();
      setRecording();
    } catch (e) {
      console.error('[audio-rec] getUserMedia falhou:', e);
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
      setTimeout(setIdle, 4000);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  }

  async function handleStop() {
    setUploading();
    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });

    if (blob.size < 800) {
      setError('Áudio muito curto. Tente novamente.');
      setTimeout(setIdle, 3000);
      return;
    }

    try {
      setTranscribing();
      const fd = new FormData();
      fd.append('audio', blob, `rec-${Date.now()}.webm`);

      const r = await fetch('https://audio.automacaojs.us/audio', {
        method: 'POST',
        body: fd
      });

      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const texto = (data.transcricao || '').trim();

      if (!texto || texto === '(áudio sem fala detectada)') {
        setError('Não consegui entender o áudio. Fala mais alto ou tenta de novo.');
        setTimeout(setIdle, 4000);
        return;
      }

      setSending(texto);
      await enviarNoChat(texto);
      setSuccess(texto);
      setTimeout(setIdle, 5000);
    } catch (e) {
      console.error('[audio-rec] falhou:', e);
      setError('Erro ao processar áudio: ' + e.message);
      setTimeout(setIdle, 4000);
    }
  }

  async function enviarNoChat(texto) {
    const chatSection = document.getElementById('chat-ao-vivo');
    if (!chatSection) return;
    const iframe = chatSection.querySelector('iframe');
    if (iframe) {
      try {
        iframe.contentWindow.postMessage({
          type: 'prefill-message',
          message: texto
        }, '*');
      } catch (e) {
        console.warn('[audio-rec] postMessage falhou:', e);
      }
    }
    chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  });

  setIdle();
})();