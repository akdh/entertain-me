from flask import g
import sqlite3, random, json

DB_FILENAME = '../collection14.db'

def get_conn():
    conn = getattr(g, 'conn', None)
    if conn is None:
        conn = g.conn = sqlite3.connect(DB_FILENAME)
        conn.row_factory = sqlite3.Row
    return conn

def get_locations():
    conn = get_conn()

    result = conn.execute('SELECT id, name, state FROM locations')
    rows = result.fetchall()

    return [{'id': row['id'], 'name': row['name'], 'state': row['state']} for row in rows]

def is_valid_document(doc_id):
    conn = get_conn()

    result = conn.execute('SELECT id FROM documents WHERE id = ?', (doc_id, ))
    if result.fetchone() is None:
        return False
    return True

def get_documents(doc_ids):
    conn = get_conn()

    data = []
    for doc_id in doc_ids:
        result = conn.execute('SELECT id, title, url, description FROM documents WHERE id = ?', (doc_id, ))
        row = result.fetchone()
        data.append({'id': row['id'], 'title': row['title'], 'url': row['url'], 'description': row['description']})
    return data

def get_callback_urls():
    conn = get_conn()

    result = conn.execute('SELECT url FROM servers')
    rows = result.fetchall()

    random.shuffle(rows)

    urls = list(map(lambda row: row['url'], rows[:5]))

    return urls

def get_profile(user_id):
    conn = get_conn()

    result = conn.execute('SELECT value FROM preferences WHERE user_id = ? ORDER BY updated_on DESC', (user_id, ))
    rows = result.fetchall()

    attraction_ids = set()
    preferences = []
    for row in rows:
        row = json.loads(row['value'])
        if row['attraction_id'] in attraction_ids:
            continue
        attraction_ids.add(row['attraction_id'])
        preferences.append(row)

    profile = {
        'id': user_id,
        'preferences': preferences
    }

    return profile

def update_profile(user_id, data):
    conn = get_conn()

    attraction_id = data['attraction_id']
    result = conn.execute('SELECT value FROM preferences WHERE user_id = ? AND attraction_id = ? ORDER BY updated_on DESC LIMIT 1', (user_id, attraction_id))
    row = result.fetchone()
    if row is None:
        current = {'read': False, 'like': False, 'rating': None}
    else:
        current = json.loads(row[0])
    current.update(data)

    conn.execute('INSERT INTO preferences (user_id, attraction_id, value, updated_on) VALUES (?, ?, ?, datetime())', (user_id, attraction_id, json.dumps(current)))
    conn.commit()

def is_valid_profile(data):
    if not set(data.keys()).issubset(set(['attraction_id', 'read', 'like', 'rating'])):
        return False
    if 'attraction_id' not in data or type(data['attraction_id']) != int:
        return False
    if 'read' in data and type(data['read']) != bool:
        return False
    if 'like' in data and type(data['like']) != bool:
        return False
    if 'rating' in data and data['rating'] not in [1, 2, 3, 4, 5]:
        return False
    return True

def is_valid_suggestion(data):
    if list(data.keys()) != ['suggestions']:
        return False
    if type(data['suggestions']) != list or len(data['suggestions']) > 50:
        return False
    if any(not is_valid_document(suggestion_id) for suggestion_id in data['suggestions']):
        return False
    return True
