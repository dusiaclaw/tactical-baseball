import pathlib
d=pathlib.Path(__file__).resolve().parent
out=d.parent/'index.html'
s=(d/'shell.html').read_text()
s=s.replace('/*STYLE*/',(d/'style.css').read_text()).replace('/*ENGINE*/',(d/'engine.js').read_text()).replace('/*UI*/',(d/'ui.js').read_text())
out.write_text(s)
print('built', len(s)//1024, 'KB')
