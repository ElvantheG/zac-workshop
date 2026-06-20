from PIL import Image, ImageDraw, ImageFont

W, H = 800, 700
img = Image.new("RGB", (W, H), "#e8e0d4")
draw = ImageDraw.Draw(img)

# fonts
font_reg  = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", 28)
font_bold = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", 40)
font_ital = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf", 26)
font_sm   = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", 24)
font_sm_i = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf", 24)
# white box with border
pad = 40
box = [pad, pad, W - pad, H - pad]
draw.rectangle(box, fill="white", outline="#222222", width=3)

cx = W // 2
y = 70

# heart
draw.text((cx, y), "♡", font=font_reg, fill="#222222", anchor="mt")
y += 52

# "Vores kære"
draw.text((cx, y), "Vores kære", font=font_reg, fill="#222222", anchor="mt")
y += 44

# Name
draw.text((cx, y), "Poul Erik Christensen", font=font_bold, fill="#111111", anchor="mt")
y += 56

# Dates
draw.text((cx, y), "✶ 15. januar 1946          † 19. juni 2026", font=font_sm, fill="#222222", anchor="mt")
y += 46

# divider line
draw.line([(pad + 60, y), (W - pad - 60, y)], fill="#bbbbbb", width=1)
y += 20

# personal lines
for line in [
    "Altid klar med en kæk bemærkning –",
    "du vil blive savnet og husket af mange.",
    "",
    "Tak for alt, hvad du var for os.",
]:
    draw.text((cx, y), line, font=font_ital, fill="#222222", anchor="mt")
    y += 36

y += 10

# family
draw.text((cx, y), "Elvan og Pia", font=font_ital, fill="#222222", anchor="mt")
y += 44

# divider line
draw.line([(pad + 60, y), (W - pad - 60, y)], fill="#bbbbbb", width=1)
y += 16

# funeral
for line in [
    "Bisættelse finder sted torsdag den 25. juni kl. 13.00",
    "i Mariager Kirke.",
]:
    draw.text((cx, y), line, font=font_sm, fill="#222222", anchor="mt")
    y += 34

img.save("/home/user/zac-workshop/dodsannonce.png", "PNG")
print("Gemt som dodsannonce.png")
