import os
import math
from datetime import datetime
from flask import Flask, render_template, abort, url_for
import markdown
import frontmatter

app = Flask(__name__)
POSTS_DIR  = os.path.join(app.root_path, 'posts')
KAJIAN_DIR = os.path.join(app.root_path, 'kajian')
POSTS_PER_PAGE = 5

# ─────────────────────────────────────────────────────────────────────────────
#  BLOG POSTS
# ─────────────────────────────────────────────────────────────────────────────

def get_all_posts():
    posts = []
    if not os.path.exists(POSTS_DIR):
        os.makedirs(POSTS_DIR)

    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md'):
            filepath = os.path.join(POSTS_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)

            html_content = markdown.markdown(
                post.content,
                extensions=['fenced_code', 'codehilite', 'tables', 'toc']
            )

            date_str = post.metadata.get('date', '2024-01-01')
            try:
                date_obj = datetime.strptime(str(date_str), '%Y-%m-%d')
            except ValueError:
                date_obj = datetime.now()

            posts.append({
                'title':    post.metadata.get('title', 'Untitled'),
                'slug':     filename[:-3],
                'date':     date_obj,
                'author':   post.metadata.get('author', 'Admin'),
                'summary':  post.metadata.get('summary', ''),
                'content':  html_content,
                'category': post.metadata.get('category', 'Kajian'),
            })

    posts.sort(key=lambda x: x['date'], reverse=True)
    return posts


# ─────────────────────────────────────────────────────────────────────────────
#  KAJIAN (Markdown-based schedule)
# ─────────────────────────────────────────────────────────────────────────────

def get_all_kajian():
    """Load all kajian markdown files from the /kajian directory."""
    items = []
    if not os.path.exists(KAJIAN_DIR):
        os.makedirs(KAJIAN_DIR)

    for filename in os.listdir(KAJIAN_DIR):
        if not filename.endswith('.md'):
            continue
        filepath = os.path.join(KAJIAN_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            doc = frontmatter.load(f)

        html_content = markdown.markdown(
            doc.content,
            extensions=['fenced_code', 'codehilite', 'tables', 'toc']
        )

        items.append({
            'slug':    filename[:-3],
            'title':   doc.metadata.get('title',   'Kajian'),
            'icon':    doc.metadata.get('icon',    'school'),
            'jadwal':  doc.metadata.get('jadwal',  '-'),
            'ustadz':  doc.metadata.get('ustadz',  '-'),
            'tempat':  doc.metadata.get('tempat',  'Masjid'),
            'status':  doc.metadata.get('status',  'aktif'),
            'summary': doc.metadata.get('summary', ''),
            'content': html_content,
        })

    # Preserve filesystem order (you can add an `order:` frontmatter field later)
    return items


def get_kajian_by_slug(slug):
    items = get_all_kajian()
    return next((k for k in items if k['slug'] == slug), None)


# ─────────────────────────────────────────────────────────────────────────────
#  CONTEXT PROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

@app.context_processor
def inject_now():
    return {'now': datetime.utcnow()}


# ─────────────────────────────────────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    recent_posts = get_all_posts()[:3]
    return render_template('index.html', recent_posts=recent_posts)


@app.route('/kajian/')
def kajian():
    kajian_list = get_all_kajian()
    return render_template('kajian.html', kajian_list=kajian_list)


@app.route('/kajian/<slug>/')
def kajian_detail(slug):
    item = get_kajian_by_slug(slug)
    if not item:
        abort(404)
    return render_template('kajian_detail.html', kajian=item)


@app.route('/donasi/')
def donasi():
    return render_template('donasi.html')


@app.route('/blog/')
@app.route('/blog/page/<int:page>/')
def blog(page=1):
    all_posts   = get_all_posts()
    total_posts = len(all_posts)
    total_pages = math.ceil(total_posts / POSTS_PER_PAGE) if total_posts > 0 else 1

    if page < 1 or page > total_pages:
        abort(404)

    start_idx = (page - 1) * POSTS_PER_PAGE
    posts     = all_posts[start_idx: start_idx + POSTS_PER_PAGE]

    return render_template('blog.html',
                           posts=posts,
                           page=page,
                           total_pages=total_pages)


@app.route('/post/<slug>/')
def post(slug):
    all_posts = get_all_posts()
    p = next((p for p in all_posts if p['slug'] == slug), None)
    if not p:
        abort(404)
    return render_template('post.html', post=p)


@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


if __name__ == '__main__':
    app.run(debug=True)
