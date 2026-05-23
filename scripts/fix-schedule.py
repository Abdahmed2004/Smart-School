from pathlib import Path
p = Path('src/components/ScheduleView.jsx')
text = p.read_text(encoding='utf-8', errors='replace')
text = text.replace('????\ufffd ', '?????')
text = text.replace('\ufffda\ufffd\ufe0f', '??')
text = text.replace('\ufffdS"', '?')
p.write_text(text, encoding='utf-8')
print('patched schedule')
