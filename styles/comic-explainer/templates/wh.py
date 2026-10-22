import json, subprocess, numpy as np, os
for k in list(os.environ):
    if 'proxy' in k.lower(): pass
from faster_whisper import WhisperModel
a = subprocess.run(['ffmpeg','-v','error','-i','narration.wav','-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout
x = np.frombuffer(a, np.float32)
m = WhisperModel('small', device='cpu', compute_type='int8')
segs, info = m.transcribe(x, language='zh', word_timestamps=True, vad_filter=False, initial_prompt='以下是普通话的句子，关于国家数据集团、数据要素、联邦学习、东数西算。')
out=[]
for s in segs:
    out.append({'s':s.start,'e':s.end,'text':s.text,'words':[{'w':w.word,'s':w.start,'e':w.end} for w in s.words]})
    print(f'{s.start:.1f}-{s.end:.1f} {s.text}', flush=True)
json.dump(out, open('whisper.json','w'), ensure_ascii=False)
