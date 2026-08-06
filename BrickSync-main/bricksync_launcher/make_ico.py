from PIL import Image

src = r'C:\Users\Mons\.gemini\antigravity\brain\e307c4c3-7a2b-46be-a9c5-de14650a8e8f\bricksync_icon_1785833878444.jpg'
dst = r'C:\Users\Mons\Desktop\bricksync_launcher\bricksync.ico'

img = Image.open(src).convert('RGBA')
img.save(dst, format='ICO', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('ICO 변환 완료! ->', dst)
