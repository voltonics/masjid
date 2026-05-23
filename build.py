import math
from flask_frozen import Freezer
from app import app, get_all_posts, POSTS_PER_PAGE

app.config['FREEZER_DESTINATION'] = 'generated'
app.config['FREEZER_RELATIVE_URLS'] = True

freezer = Freezer(app)

@freezer.register_generator
def post():
    posts = get_all_posts()
    for p in posts:
        yield {'slug': p['slug']}

@freezer.register_generator
def blog():
    posts = get_all_posts()
    total_posts = len(posts)
    total_pages = math.ceil(total_posts / POSTS_PER_PAGE) if total_posts > 0 else 1
    

    yield {}
    
    for page in range(1, total_pages + 1):
        yield {'page': page}

if __name__ == '__main__':
    freezer.freeze()
