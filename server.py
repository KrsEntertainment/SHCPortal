#!/usr/bin/env python3
"""Статический сервер Школьного портала (чистый развёрнутый экземпляр)."""
import http.server
import socketserver

PORT = 8090


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with ReusableTCPServer(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        print(f"Школьный портал запущен на порту {PORT} (кэширование отключено)")
        httpd.serve_forever()
