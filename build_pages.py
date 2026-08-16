#!/usr/bin/env python3
"""Generate the journal, bag and account pages from data/content.json.

Static site, no build step at serve time — this just writes HTML once so the
pages stay hand-editable afterwards. Re-run after editing data/content.json.
"""
import json, os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(ROOT, 'data', 'content.json'), encoding='utf-8'))
BLOG, UI = C['blog'], C['ui']

MARK = ('<svg class="logo__mark" viewBox="0 0 149 42" aria-hidden="true">'
        '<path fill="none" stroke="currentColor" stroke-width="3.7" stroke-linejoin="miter" '
        'stroke-miterlimit="10" d="M20.5 2.2 H38 L73.5 38.8 L109 2.2 H128.5 '
        'A18.3 18.3 0 0 1 128.5 38.8 H109 L73.5 2.2 L38 38.8 H20.5 '
        'A18.3 18.3 0 0 1 20.5 2.2 Z"/></svg>')

def head(title, desc, extra_css='', theme='#071b10'):
    return f'''<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="{theme}">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" href="assets/fonts/IRANYekanXFaNum-VF.woff2" crossorigin>
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="assets/icon/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="علیپور">
<link rel="stylesheet" href="css/app.css">{extra_css}
</head>
<body>

<a class="skip" href="#main">پرش به محتوای اصلی</a>

<header class="nav">
  <div class="wrap nav__in">
    <a class="logo" href="index.html" aria-label="جواهری علیپور">{MARK}<span class="logo__txt"><b>ALIPOUR</b><i>JEWELRY</i></span></a>
    <button class="navbtn" data-menu aria-expanded="false">فهرست</button>
  </div>
</header>

<div class="menu" role="dialog" aria-label="فهرست" aria-hidden="true">
  <button class="menu__x" data-menu-close>بستن</button>
  <span class="logo logo--stack menu__logo" aria-hidden="true">{MARK}</span>
  <a href="index.html#serpent">کالکشن مار</a>
  <a href="products.html">جواهرات</a>
  <a href="blog.html">روایت‌ها</a>
  <a href="index.html#atelier">کارگاه</a>
  <a href="account.html">حساب کاربری</a>
</div>
'''

FOOT = '''
<footer class="foot">
  <div class="wrap foot__in">
    <a class="logo" href="index.html" aria-label="جواهری علیپور">''' + MARK + '''<span class="logo__txt"><b>ALIPOUR</b><i>JEWELRY</i></span></a>
    <nav aria-label="پیوندها">
      <a href="index.html">خانه</a>
      <a href="products.html">جواهرات</a>
      <a href="blog.html">روایت‌ها</a>
      <a href="index.html#visit">گالری</a>
      <a href="https://instagram.com/alipour.jewelry" target="_blank" rel="noopener">اینستاگرام</a>
    </nav>
    <p class="micro faint">© <span data-year>۱۴۰۴</span> جواهری علیپور</p>
  </div>
</footer>

<nav class="tabbar" aria-label="پیمایش اصلی"></nav>

<script src="js/shell.js" defer></script>
<script src="js/app.js" defer></script>
</body>
</html>
'''

def blocks(body):
    out = []
    for b in body:
        t = b['text']
        if b['type'] == 'h':      out.append(f'<h2>{t}</h2>')
        elif b['type'] == 'quote': out.append(f'<blockquote>{t}</blockquote>')
        else:                      out.append(f'<p>{t}</p>')
    return '\n      '.join(out)

# ── journal index ───────────────────────────────────────────────────────────
posts = BLOG['posts']
def card(p, lead=False):
    cls = 'post post--lead' if lead else 'post'
    return f'''<a class="{cls}" href="blog-{p['slug']}.html">
        <span class="post__m"><img loading="lazy" src="{p['image']}" alt=""></span>
        <span class="post__k"><span>{p['kicker']}</span><span class="faint">{p['date']}</span></span>
        <span class="post__t">{p['title']}</span>
        <span class="post__e">{p['excerpt']}</span>
      </a>'''

blog_html = head('روایت‌ها | جواهری علیپور', BLOG['intro'].replace('"', '&quot;')) + f'''
<main id="main" class="page">
  <div class="wrap">
    <div class="page__head">
      <span class="kick">۰۶ — روایت‌ها</span>
      <h1 class="d1">روایت‌ها</h1>
      <p class="body dim" style="margin-top:20px;max-width:52ch">{BLOG['intro']}</p>
    </div>
    <div class="posts stag in">
      {card(posts[0], lead=True)}
      {chr(10).join('      ' + card(p) for p in posts[1:])}
    </div>
  </div>
</main>
''' + FOOT
open(os.path.join(ROOT, 'blog.html'), 'w', encoding='utf-8').write(blog_html)

# ── one page per post ───────────────────────────────────────────────────────
for i, p in enumerate(posts):
    nxt = posts[(i + 1) % len(posts)]
    art = head(f"{p['title']} | جواهری علیپور", re.sub('<[^>]+>', '', p['excerpt'])) + f'''
<main id="main" class="page">
  <div class="wrap">
    <p style="margin-bottom:26px"><a class="lnk" href="blog.html">همهٔ روایت‌ها</a></p>
    <div class="article">
      <span class="kick">{p['kicker']} — {p['date']} · {p['readMin']} دقیقه</span>
      <h1 class="d1" style="margin-bottom:34px">{p['title']}</h1>
    </div>
    <div class="article__hero"><img src="{p['image']}" alt="" loading="lazy"></div>
    <div class="article">
      {blocks(p['body'])}
      <div class="markrule" style="margin:clamp(48px,6vw,86px) 0">
        <svg viewBox="0 0 149 42" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.7" stroke-linejoin="miter" stroke-miterlimit="10" d="M20.5 2.2 H38 L73.5 38.8 L109 2.2 H128.5 A18.3 18.3 0 0 1 128.5 38.8 H109 L73.5 2.2 L38 38.8 H20.5 A18.3 18.3 0 0 1 20.5 2.2 Z"/></svg>
      </div>
      <p class="micro" style="color:var(--metal-dim);margin-bottom:10px">روایت بعدی</p>
      <a class="post__t" style="display:block" href="blog-{nxt['slug']}.html">{nxt['title']}</a>
    </div>
  </div>
</main>
''' + FOOT
    open(os.path.join(ROOT, f"blog-{p['slug']}.html"), 'w', encoding='utf-8').write(art)

# ── bag ─────────────────────────────────────────────────────────────────────
B = UI['bag']
bag_html = head(f"{B['title']} | جواهری علیپور", 'سبد خرید جواهری علیپور') + f'''
<main id="main" class="page">
  <div class="wrap" style="max-width:1080px">
    <div class="page__head">
      <span class="kick">سبد</span>
      <h1 class="d1">{B['title']}</h1>
    </div>
    <div data-bag-mount></div>
  </div>
</main>
''' + FOOT
open(os.path.join(ROOT, 'bag.html'), 'w', encoding='utf-8').write(bag_html)

# ── account ─────────────────────────────────────────────────────────────────
A = UI['account']
fields = '\n        '.join(
    f'''<label class="field"><span>{f['label']}</span>'''
    f'''<input type="{f['type']}" name="{f['key']}" placeholder="{f['placeholder']}" '''
    f'''{'required' if f['key'] in ('fullName','mobile') else ''}></label>'''
    for f in A['fields'])
benefits = '\n          '.join(f'<li>{b}</li>' for b in A['benefits'])

acc_html = head('حساب کاربری | جواهری علیپور', A['signedOutBody'][:150]) + f'''
<main id="main" class="page">
  <div class="wrap" style="max-width:1080px">
    <div class="page__head">
      <span class="kick">حساب</span>
      <h1 class="d1">{A['signedOutTitle']}</h1>
    </div>
    <div data-account-mount
         data-signin="{A['signInLabel']}" data-register="{A['registerLabel']}">
      <div class="acct__grid">
        <form class="acct__form" data-auth novalidate>
          <div class="seg" role="tablist">
            <button type="button" class="on" data-mode="in">{A['signInLabel']}</button>
            <button type="button" data-mode="up">{A['registerLabel']}</button>
          </div>
          {fields}
          <button class="btn btn--wide" type="submit">{A['signInLabel']}</button>
          <p class="form-note">این نسخهٔ نمایشی است؛ اطلاعات فقط روی همین دستگاه ذخیره می‌شود و به جایی ارسال نمی‌گردد.</p>
        </form>
        <aside class="acct__why">
          <p class="body dim">{A['signedOutBody']}</p>
          <ul class="ticks">
          {benefits}
          </ul>
        </aside>
      </div>
    </div>
  </div>
</main>
''' + FOOT
open(os.path.join(ROOT, 'account.html'), 'w', encoding='utf-8').write(acc_html)

print('wrote blog.html, %d posts, bag.html, account.html' % len(posts))
