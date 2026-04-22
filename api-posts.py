#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, os, urllib.parse

POSTS_FILE = '/root/igreja-sem-nome-site/igreja-sem-nome/data/posts.json'

def load_posts():
    with open(POSTS_FILE, 'r') as f:
        return json.load(f)

def save_posts(posts):
    with open(POSTS_FILE, 'w') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type,X-API-Key')
        self.end_headers()

    def check_auth(self):
        key = self.headers.get('X-API-Key', '')
        if key != 'jarvis-igreja-2026':
            self.send_json(401, {'erro': 'Não autorizado'})
            return False
        return True

    def do_GET(self):
        if self.path == '/posts':
            self.send_json(200, load_posts())
        else:
            self.send_json(404, {'erro': 'Rota não encontrada'})

    def do_POST(self):
        if self.path != '/posts':
            self.send_json(404, {'erro': 'Rota não encontrada'})
            return
        if not self.check_auth(): return
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))

        # Validação dos campos obrigatórios
        required = ['titulo', 'resumo', 'categoria', 'data']
        missing = [f for f in required if not body.get(f)]
        if missing:
            self.send_json(400, {'erro': f'Campos obrigatórios faltando: {", ".join(missing)}'})
            return

        posts = load_posts()
        novo_id = max((p['id'] for p in posts), default=0) + 1
        novo = {
            'id': novo_id,
            'titulo': body['titulo'],
            'data': body['data'],
            'resumo': body['resumo'],
            'texto': body.get('texto', body['resumo']),
            'imagem': body.get('imagem', 'https://images.unsplash.com/photo-1504052433629-a6ef81a54d30?w=400'),
            'categoria': body['categoria'],
        }
        if body.get('link'):
            novo['link'] = body['link']

        posts.append(novo)
        save_posts(posts)
        self.send_json(201, {'sucesso': True, 'post': novo})

    def do_DELETE(self):
        if not self.path.startswith('/posts/'):
            self.send_json(404, {'erro': 'Rota não encontrada'})
            return
        if not self.check_auth(): return
        try:
            post_id = int(self.path.split('/')[-1])
        except:
            self.send_json(400, {'erro': 'ID inválido'})
            return
        posts = load_posts()
        novos = [p for p in posts if p['id'] != post_id]
        if len(novos) == len(posts):
            self.send_json(404, {'erro': 'Post não encontrado'})
            return
        save_posts(novos)
        self.send_json(200, {'sucesso': True, 'removido': post_id})

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 3041), Handler)
    print('API rodando na porta 3041')
    server.serve_forever()
