#!/usr/bin/env python3
"""Built-site link integrity: no broken routes, orphaned pages or buried content.
Forked from TIMELESS Grass & Greens (scripts/check-links.py) and adapted for NoCo's PRELAUNCH flag.

  python3 scripts/check-links.py dist
  python3 scripts/check-links.py dist --prelaunch no     # judge as if launched (default: src/data/site.ts)

Measured on the built HTML:

  BROKEN-1 FAIL  an internal href that resolves to no built page or file
  ORPHAN-1 FAIL  an indexable page with no inbound <a href> from the body of any other page
  DEPTH-1  FAIL  an indexable page more than --max-depth clicks from / (default 3), or unreachable
  SLASH-1  WARN  an internal link to a page without its trailing slash (a redirect hop on Netlify)
  THIN-1   WARN  an indexable content page under --min-words in <main> (default 600; hubs and / exempt).
                 Length alone cannot establish whether a page is useful — content review decides.
                 --thin-fail makes it a failure.

Utility routes (/404/, /thanks/, /review/) are deliberately unlinked and unindexed: they are exempt
from ORPHAN-1, DEPTH-1 and THIN-1. BROKEN-1 applies to every page.

PRELAUNCH: every page carries noindex, so "indexable" cannot be read from the robots meta. While
PRELAUNCH is true, every non-utility page is judged as it will be at launch, and ORPHAN-1 / DEPTH-1
are reported as warnings — the holding homepage links nowhere until gate 6. After launch, indexable
means "not noindex" and both are failures.

Sitewide chrome (header, menu, footer) links every page from every page, which would make ORPHAN-1
and DEPTH-1 vacuous, so both are measured on links inside <main> only.
"""
import sys, re, html, pathlib, argparse
from collections import deque

REPO = pathlib.Path(__file__).resolve().parent.parent
UTILITY = {'/404/', '/thanks/', '/review/'}
HUBS = {'/', '/services/', '/areas/', '/guides/', '/work/', '/tools/'}
LINK = re.compile(r'<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|\'([^\']*)\')', re.I)


def read_prelaunch():
    try:
        src = (REPO / 'src/data/site.ts').read_text()
    except OSError:
        return None
    m = re.search(r'export\s+const\s+PRELAUNCH\s*(?::\s*boolean\s*)?=\s*(true|false)', src)
    return (m.group(1) == 'true') if m else None


def main_segment(raw):
    m = re.search(r'(?is)<main\b[^>]*>(.*?)</main>', raw)
    return m.group(1) if m else None


def visible_words(seg):
    seg = re.sub(r'(?is)<(script|style|noscript|template)\b.*?</\1>', ' ', seg or '')
    return len(html.unescape(re.sub(r'(?s)<[^>]+>', ' ', seg)).split())


def links(seg):
    return [html.unescape(a or b) for a, b in LINK.findall(seg or '')]


def route_of(path, root):
    rel = path.relative_to(root).as_posix()
    if rel == 'index.html':
        return '/'
    if rel.endswith('/index.html'):
        return '/' + rel[: -len('index.html')]
    if rel == '404.html':
        return '/404/'
    return '/' + rel


def normalise(href, host):
    """A site-root path, or None when the link leaves the site (or is a fragment/scheme link)."""
    href = href.strip().split('#')[0].split('?')[0]
    if not href or href.startswith('//'):
        return None
    if re.match(r'^(mailto|tel|sms|javascript|data):', href, re.I):
        return None
    if re.match(r'^https?://', href, re.I):
        m = re.match(r'^https?://([^/]+)(/.*)?$', href, re.I)
        if host and m and m.group(1).lower() == host.lower():
            return m.group(2) or '/'
        return None
    if not href.startswith('/'):
        return None  # relative links are not used by this site; BROKEN-1 would need the base
    return href


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out', nargs='?', default='dist')
    ap.add_argument('--min-words', type=int, default=600, help='THIN-1 floor for an indexable content page; 0 disables it.')
    ap.add_argument('--thin-fail', action='store_true', help='make THIN-1 a failure instead of a warning')
    ap.add_argument('--max-depth', type=int, default=3)
    ap.add_argument('--prelaunch', choices=['auto', 'yes', 'no'], default='auto')
    ap.add_argument('--warn-only', action='store_true')
    a = ap.parse_args()

    root = pathlib.Path(a.out)
    if not root.is_dir():
        print(f'error: {a.out} is not a directory', file=sys.stderr)
        return 2

    prelaunch = {'yes': True, 'no': False}.get(a.prelaunch, read_prelaunch())
    if prelaunch is None:
        prelaunch = False

    files = {'/' + p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    pages = {}
    for f in sorted(root.rglob('*.html')):
        rel = f.relative_to(root).as_posix()
        if rel != 'index.html' and not rel.endswith('/index.html') and rel != '404.html':
            continue  # verification files and other loose HTML are not pages
        raw = f.read_text(errors='ignore')
        seg = main_segment(raw)
        canon = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', raw, re.I) or \
            re.search(r'<link[^>]+href="([^"]+)"[^>]+rel="canonical"', raw, re.I)
        pages[route_of(f, root)] = {
            'words': visible_words(seg) if seg is not None else visible_words(raw),
            'noindex': bool(re.search(r'<meta[^>]+name="robots"[^>]+content="[^"]*noindex', raw, re.I)),
            'main_links': links(seg),
            'all_links': links(raw),
            'canonical': canon.group(1) if canon else None,
        }

    if '/' not in pages:
        print('error: no homepage in the build', file=sys.stderr)
        return 2

    host = None
    if pages['/']['canonical']:
        h = re.match(r'^https?://([^/]+)', pages['/']['canonical'])
        host = h.group(1) if h else None

    def resolve(href):
        """(target, kind): kind is 'page', 'file', 'slash' (page reached without its slash) or None (broken)."""
        p = normalise(href, host)
        if p is None:
            return None, 'external'
        if p in pages:
            return p, 'page'
        if p in files:
            return p, 'file'
        if not p.endswith('/') and p + '/' in pages:
            return p + '/', 'slash'
        return p, None

    if prelaunch:
        indexable = {r for r in pages if r not in UTILITY}
    else:
        indexable = {r for r, p in pages.items() if not p['noindex'] and r not in UTILITY}

    fails, warns = [], []

    # BROKEN-1 / SLASH-1 — every internal href lands on something built
    for route, p in sorted(pages.items()):
        for href in sorted(set(p['all_links'])):
            target, kind = resolve(href)
            if kind is None:
                fails.append(f'BROKEN-1 {route} → {href} (no such page or file in the build)')
            elif kind == 'slash':
                warns.append(f'SLASH-1 {route} → {href} (link {target} with its trailing slash)')

    # ORPHAN-1 / DEPTH-1 — reachability through page bodies, not chrome
    inbound = {r: set() for r in pages}
    for route, p in pages.items():
        for href in p['main_links']:
            target, kind = resolve(href)
            if kind in ('page', 'slash') and target != route:
                inbound[target].add(route)

    depth = {'/': 0}
    q = deque(['/'])
    while q:
        cur = q.popleft()
        for href in pages[cur]['main_links']:
            target, kind = resolve(href)
            if kind in ('page', 'slash') and target not in depth:
                depth[target] = depth[cur] + 1
                q.append(target)

    reach = warns if prelaunch else fails
    for route in sorted(indexable):
        p = pages[route]
        if a.min_words > 0 and p['words'] < a.min_words and route not in HUBS:
            (fails if a.thin_fail else warns).append(f'THIN-1 {route} — {p["words"]} words in <main>, floor is {a.min_words}')
        if route != '/' and not inbound[route]:
            reach.append(f'ORPHAN-1 {route} — no inbound link from the body of any page')
        d = depth.get(route)
        if route == '/':
            continue
        if d is None:
            reach.append(f'DEPTH-1 {route} — unreachable from / through page bodies')
        elif d > a.max_depth:
            reach.append(f'DEPTH-1 {route} — {d} clicks from /, max is {a.max_depth}')

    words = sorted(pages[r]['words'] for r in indexable)
    stats = f'words in <main>: min {words[0]}, median {words[len(words) // 2]}, max {words[-1]}' if words else 'no indexable pages'
    print(f'{len(pages)} pages · {len(indexable)} {"indexable at launch (PRELAUNCH)" if prelaunch else "indexable"} · {stats}')

    for f_ in fails:
        print(f'  x FAIL {f_}')
    for w in warns:
        print(f'  ! WARN {w}')
    if fails:
        print(f'\nLINK CHECK FAILED: {len(fails)} failure(s).')
        return 0 if a.warn_only else 1
    print(f'\nLINKS OK ({len(warns)} warning(s))')
    return 0


if __name__ == '__main__':
    sys.exit(main())
