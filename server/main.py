from flask import Flask, jsonify, render_template, request, g, session, redirect, abort
import requests, json, sqlite3, random

DB_FILENAME = '../collection14.db'
FALLBACK_URL = 'http://127.0.0.1:5001/suggestions'

app = Flask(__name__)

def get_locations():
    conn = get_conn()
    db = conn.cursor()

    db.execute('SELECT id, name, state FROM locations')
    rows = db.fetchall()

    return [{'id': row[0], 'name': ', '.join(row[1:])} for row in rows]

def get_profile(user_id):
    conn = get_conn()
    db = conn.cursor()

    rows = db.execute('SELECT value FROM preferences WHERE user_id = ? ORDER BY updated_on DESC', (user_id, ))
    attraction_ids = set()
    preferences = []
    for row in rows:
        row = json.loads(row[0])
        if row['attraction_id'] in attraction_ids:
            continue
        attraction_ids.add(row['attraction_id'])
        preferences.append(row)

    profile = {
        'id': user_id,
        'preferences': preferences
    }

    return profile

def get_suggestions(user_id, location_id):
    profile = get_profile(user_id)
    request_data = {
        'location': location_id,
        'profile': profile
    }

    conn = get_conn()
    db = conn.cursor()

    db.execute('SELECT url FROM servers')
    rows = db.fetchall()
    if len(rows) == 0:
        url = FALLBACK_URL
    else:
        url = random.choice(rows)[0]

    try:
        r = requests.post(url, json=request_data)
    except Timeout:
        r = requests.post(FALLBACK_URL, json=request_data)
    response_data = r.json()
    suggestions = response_data['suggestions']

    db.execute('INSERT INTO suggestions (request, response) VALUES (?, ?)', (json.dumps(request_data), json.dumps(response_data)));
    conn.commit()

    data = []
    for suggestion in suggestions:
        db.execute('SELECT id, title, url FROM documents WHERE id = ?', (suggestion, ))
        row = db.fetchone()
        data.append({'id': row[0], 'title': row[1], 'url': row[2]})

    return data

def get_conn():
    conn = getattr(g, 'conn', None)
    if conn is None:
        conn = g.conn = sqlite3.connect(DB_FILENAME)
    return conn

@app.teardown_request
def close_connection(exception):
    conn = getattr(g, 'conn', None)
    if conn is not None:
        conn.close()

@app.route('/login.html', methods=["GET", "POST"])
def login():
    if request.method == "POST":
        session['user'] = request.form['user']
        return redirect('/locations.html')
    return render_template('login.html')

@app.route('/logout.html', methods=["GET", "POST"])
def logout():
    if request.method == "POST":
        session.pop('user', None)
        return redirect('/locations.html')
    return render_template('logout.html')

@app.route('/locations.html')
def location():
    locations = get_locations()
    return render_template('locations.html', locations=locations)

@app.route('/locations.json')
def location_json():
    locations = get_locations()
    return jsonify(locations=locations)

@app.route('/profile.html')
@app.route('/<int:user_id>/profile.html')
def profile(user_id = None):
    if user_id is None and 'user' not in session:
        abort(401)
    if user_id is None:
        user_id = session['user']

    conn = get_conn()
    db = conn.cursor()

    profile = get_profile(user_id)
    preferences = profile['preferences']
    for i in range(len(preferences)):
        preference = preferences[i]
        db.execute('SELECT id, title, url FROM documents WHERE id = ?', (preference['attraction_id'], ))
        row = db.fetchone()
        preferences[i]['attraction_info'] = {'id': row[0], 'title': row[1], 'url': row[2]}

    return render_template('profile.html', preferences=preferences)

@app.route('/<int:location_id>/suggestions.html')
def suggestions(location_id):
    if 'user' not in session:
        abort(401)
    user_id = session['user']
    suggestions = get_suggestions(user_id, location_id)
    return render_template('suggestions.html', suggestions=suggestions)

@app.route('/<int:location_id>/suggestions.json')
def suggestions_json(location_id):
    if 'user' not in session:
        abort(401)
    user_id = session['user']
    suggestions = get_suggestions(user_id, location_id)
    return jsonify(suggestions=suggestions)

@app.route('/profile', methods=['GET', 'POST'])
@app.route('/<int:user_id>/profile', methods=['GET'])
def user_profile(user_id = None):
    if user_id is None and 'user' not in session:
        abort(401)
    if user_id is None:
        user_id = session['user']

    if request.method == 'GET':
        profile = get_profile(user_id)
        return jsonify(profile)
    elif request.method == 'POST':
        conn = get_conn()
        db = conn.cursor()

        data = request.get_json()
        if not set(data.keys()).issubset(set(['attraction_id', 'read', 'like', 'rating'])):
            abort(500)
        if 'attraction_id' not in data or type(data['attraction_id']) != int:
            abort(500)
        if 'read' in data and type(data['read']) != bool:
            abort(500)
        if 'like' in data and type(data['like']) != bool:
            abort(500)
        if 'rating' in data and data['rating'] not in [1, 2, 3, 4, 5]:
            abort(500)

        attraction_id = data['attraction_id']
        db.execute('SELECT value FROM preferences WHERE user_id = ? AND attraction_id = ? ORDER BY updated_on DESC LIMIT 1', (user_id, attraction_id))
        row = db.fetchone()
        if row is None:
            current = {'read': False, 'like': False, 'rating': None}
        else:
            current = json.loads(row[0])
        current.update(data)

        db.execute('INSERT INTO preferences (user_id, attraction_id, value, updated_on) VALUES (?, ?, ?, datetime())', (user_id, attraction_id, json.dumps(current)))
        conn.commit()

        return jsonify({'success': True})

@app.route('/<key>/registrations', methods=['GET', 'POST', 'DELETE'])
def registrations(key):
    conn = get_conn()
    db = conn.cursor()

    if request.method == 'GET':
        db.execute('SELECT url FROM servers WHERE key = ?', (key, ))
        rows = db.fetchall()
        urls = map(lambda row: {'callback_url': row[0]}, rows)
        return jsonify({'callback_urls': urls})
    elif request.method == 'POST':
        data = request.get_json()
        if 'callback_url' not in data:
            abort(500)
        url = data['callback_url']

        r = requests.get(url)
        if r.status_code != 200:
            abort(500)

        db.execute('INSERT INTO servers (key, url) VALUES (?, ?)', (key, url))
        conn.commit()
        return jsonify({'success': True})
    elif request.method == 'DELETE':
        data = request.get_json()
        if 'callback_url' not in data:
            abort(500)
        url = data['callback_url']
        db.execute('DELETE FROM servers WHERE key = ? AND url = ?', (key, url));
        conn.commit()
        return jsonify({'success': True})

if __name__ == '__main__':
    app.config['SECRET_KEY'] = "\xf7\xc2\x13\xc2_':\xd7\xb2l\xc7l\xc0\x13<\x04\xe7lP1\x95\xa9\xc8B"
    app.run(debug=True)
