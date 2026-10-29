import pathlib, sys
d=pathlib.Path(__file__).resolve().parent
out=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else d.parent/'index.html'
s=(d/'shell.html').read_text()
s=s.replace('/*STYLE*/',(d/'style.css').read_text()).replace('/*ENGINE*/',(d/'engine.js').read_text()).replace('/*UI*/',(d/'ui.js').read_text())
out.write_text(s)
print('built', out, len(s)//1024, 'KB')
