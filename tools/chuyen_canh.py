#!/usr/bin/env python3
"""Chuyển cảnh liền mạch giữa các trang (View Transitions giữa hai tài liệu), bước gần cuối của tools/build_all.py.

  python3 tools/chuyen_canh.py     chèn khối <style id="bg-vt"> và <script id="bg-vt-js"> vào mọi trang HTML được phục vụ

Vì sao: bấm một thẻ bài ở trang mục, màn hình trắng một nhịp rồi mới hiện màn tải của bài. Với khối này, trình duyệt hỗ trợ
(Chrome/Edge 126+, Safari 18.2+) hoà trang cũ sang trang mới, và ảnh bìa trên thẻ vừa bấm phóng lớn thành màn tải có cùng
ảnh bìa của bài (#bgs-load). Trình duyệt khác bỏ qua, chuyển trang như cũ. Người bật "giảm chuyển động" không có hiệu ứng.

Cách ghép: lúc rời trang (pageswap), tìm liên kết trỏ tới trang đích, đặt view-transition-name: bg-bia cho ảnh trong thẻ
chứa liên kết đó; trang bài đặt sẵn cùng tên cho #bgs-load. Mỗi lần chỉ một phần tử mang tên (xoá tên cũ trước khi đặt).
"""
import re, sys
import sw  # served(): danh sách tệp site phục vụ

CSS = ('<style id="bg-vt">@view-transition{navigation:auto}#bgs-load{view-transition-name:bg-bia}'
       '::view-transition-group(bg-bia){animation-duration:.42s;animation-timing-function:cubic-bezier(.2,.7,.2,1)}'
       '::view-transition-old(root),::view-transition-new(root){animation-duration:.24s}'
       '@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}</style>\n')
JS = ('<script id="bg-vt-js">addEventListener("pageswap",function(e){try{if(!e.viewTransition||!e.activation||!e.activation.entry)return;'
      'var n=function(u){return new URL(u,location.href).pathname.replace(/index\\.html$/,"")},p=n(e.activation.entry.url);'
      'document.querySelectorAll("img").forEach(function(i){if(i.style.viewTransitionName==="bg-bia")i.style.viewTransitionName=""});'
      'var as=document.querySelectorAll("a[href]");for(var k=0;k<as.length;k++){if(n(as[k].href)!==p)continue;'
      'var c=as[k].closest(".card,article,li")||as[k],im=c.querySelector("img");if(im&&im.getBoundingClientRect().width){im.style.viewTransitionName="bg-bia";break}}'
      '}catch(_){}});</script>\n')
MARK = re.compile(r'<style id="bg-vt">.*?</style>\n?|<script id="bg-vt-js">.*?</script>\n?', re.S)


def put(path):
    p = sw.ROOT / path; s = p.read_text(encoding='utf-8'); t = MARK.sub('', s)
    if '</head>' in t: t = t.replace('</head>', CSS + JS + '</head>', 1)
    else:
        m = re.search(r'<meta charset="?utf-8"?>\n?', t, re.I)
        if not m: return False
        t = t[:m.end()] + CSS + JS + t[m.end():]
    if t != s: p.write_text(t, encoding='utf-8')
    return True


if __name__ == '__main__':
    n = sum(put(f) for f in sw.served() if f.endswith('.html'))
    print(f'chuyển cảnh: {n} trang')
    sys.exit(0)
