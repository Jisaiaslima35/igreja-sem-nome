#!/usr/bin/env python3
"""
API de áudio para Rádio Louvor e Gratidão.
Recebe POST /audio com FormData (campo 'audio'), transcreve com faster-whisper,
devolve JSON com o texto transcrito.
Roda na porta 9903. Sem login (igual chat Hermes público).
"""
import os, sys, json, uuid, tempfile, subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# faster-whisper pode demorar pra carregar na primeira vez (~10s)
# Cache padrão em ~/.cache/huggingface/
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TRANSCRIBE_SCRIPT = os.path.join(SCRIPT_DIR, "transcribe.py")

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def _send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(204, {})

    def do_POST(self):
        if self.path == '/audio' or self.path == '/':
            try:
                ctype = self.headers.get('Content-Type', '')
                if 'multipart/form-data' not in ctype:
                    return self._send_json(400, {'erro': 'esperado multipart/form-data'})

                # Parse simples de multipart: extrai o campo 'audio'
                boundary = ctype.split('boundary=')[1].split(';')[0].strip().encode()
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)

                # Salvar arquivo temporário
                tmp_path = os.path.join(tempfile.gettempdir(), f'audio-{uuid.uuid4().hex[:8]}.webm')
                with open(tmp_path, 'wb') as f:
                    f.write(self._extract_audio(body, boundary))

                # Transcrever
                try:
                    result = subprocess.run(
                        ['python3', TRANSCRIBE_SCRIPT, tmp_path],
                        capture_output=True, text=True, timeout=60
                    )
                    transcript = result.stdout.strip()
                    if not transcript:
                        transcript = '(áudio sem fala detectada)'
                except subprocess.TimeoutExpired:
                    return self._send_json(504, {'erro': 'transcrição demorou demais'})
                except Exception as e:
                    return self._send_json(500, {'erro': f'erro ao transcrever: {e}'})
                finally:
                    try: os.unlink(tmp_path)
                    except: pass

                return self._send_json(200, {'sucesso': True, 'transcricao': transcript})
            except Exception as e:
                return self._send_json(500, {'erro': str(e)[:200]})
        return self._send_json(404, {'erro': 'rota não encontrada'})

    def _extract_audio(self, body, boundary):
        """Extrai o conteúdo do campo 'audio' do multipart."""
        sep = b'--' + boundary
        parts = body.split(sep)
        for part in parts:
            if b'name="audio"' in part:
                # Encontrar o início do conteúdo (depois de \r\n\r\n)
                idx = part.find(b'\r\n\r\n')
                if idx == -1:
                    continue
                content = part[idx+4:]
                # Remover \r\n no fim
                if content.endswith(b'\r\n'):
                    content = content[:-2]
                return content
        return b''

    def do_GET(self):
        if self.path == '/health':
            return self._send_json(200, {'status': 'ok', 'service': 'audio-transcribe'})
        return self._send_json(404, {'erro': 'rota não encontrada'})

if __name__ == '__main__':
    server = ThreadingHTTPServer(('0.0.0.0', 9903), Handler)
    print('Audio API rodando em http://0.0.0.0:9903')
    print(f'  POST /audio  (multipart, campo "audio")')
    print(f'  GET  /health')
    print(f'  Transcrição via: {TRANSCRIBE_SCRIPT}')
    server.serve_forever()