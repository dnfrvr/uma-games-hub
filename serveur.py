#!/usr/bin/env python3
"""Serveur local pour Dress my Drew.

Identique à `python -m http.server`, mais il interdit la mise en cache.
Sans ça, le navigateur continue de servir l'ancien style.css ou l'ancien
manifest.json après une modification, et on croit à tort que le changement
n'a pas été pris en compte.

    python serveur.py           # http://localhost:8777
    python serveur.py 9000      # sur un autre port
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SansCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    with ThreadingHTTPServer(("", port), SansCache) as serveur:
        print("Dress my Drew : http://localhost:%d/index.html" % port)
        print("Ctrl+C pour arreter.")
        try:
            serveur.serve_forever()
        except KeyboardInterrupt:
            print("\nArrete.")


if __name__ == "__main__":
    main()
