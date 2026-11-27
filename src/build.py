# Bouwt index.html uit de drie bronbestanden. Gebruik: python3 src/build.py
from pathlib import Path
src = Path(__file__).parent
(src.parent / 'index.html').write_text(''.join((src / f).read_text() for f in ('kop.html', 'logica.js', 'schermen.js')))
print('index.html gebouwd')
