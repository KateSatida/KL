"""Run the game on your computer:   python tools/serve.py
Then open http://localhost:8000  (admin page: http://localhost:8000/admin.html)
"""
import functools
import http.server
import socket
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_manifest  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # always see your latest edits
        super().end_headers()

    def log_message(self, *args):
        pass


def lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except OSError:
        return "your-computer-ip"


if __name__ == "__main__":
    build_manifest.build()
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), handler)
    print(f"Game:  http://localhost:{PORT}")
    print(f"Admin: http://localhost:{PORT}/admin.html")
    print(f"Phone on the same Wi-Fi: http://{lan_ip()}:{PORT}  (camera needs the real https site)")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
