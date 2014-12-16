from flask import Flask, jsonify, render_template, request, g, session, redirect, abort
import requests, json, sqlite3, random

DB_FILENAME = '../collection14.db'
FALLBACK_SERVER = '127.0.0.1:5001'

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

    db.execute('SELECT attraction_id, `like`, rating FROM preferences WHERE id = ?', (user_id, ))
    rows = db.fetchall()
    preferences = {}
    for row in rows:
        preferences[row[0]] = [row[1], row[2]]

    profile = {
        'id': user_id,
        'preferences': preferences
    }

    return profile

def get_suggestions(user_id, location_id):
    profile = get_profile(user_id)
    data = {
        'location': location_id,
        'profile': profile
    }

    conn = get_conn()
    db = conn.cursor()

    db.execute('SELECT address FROM servers')
    rows = db.fetchall()
    if len(rows) == 0:
        server = FALLBACK_SERVER
    else:
        server = random.choice(rows)[0]

    try:
        r = requests.post('http://%s/suggestions' % server, data=json.dumps(data))
    except Timeout:
        r = requests.post('http://%s/suggestions' % FALLBACK_SERVER, data=json.dumps(data))
    suggestions = r.json()

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

@app.route('/<int:user_id>/profile.html')
def profile(user_id):
    conn = get_conn()
    db = conn.cursor()

    profile = get_profile(user_id)
    preferences = profile['preferences']
    for attraction_id, preference in preferences.iteritems():
        db.execute('SELECT id, title, url FROM documents WHERE id = ?', (attraction_id, ))
        row = db.fetchone()
        preferences[attraction_id] = {'id': row[0], 'title': row[1], 'url': row[2], 'like': preference[0], 'rating': preference[1]}

    return render_template('profile.html', preferences=preferences)

@app.route('/<int:user_id>/profile.json')
def profile_json(user_id):
    profile = get_profile(user_id)
    return jsonify(profile['preferences'])

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

@app.route('/like/<int:attraction_id>.json', methods=['POST'])
def like(attraction_id):
    if 'user' not in session:
        abort(401)
    user_id = session['user']
    conn = get_conn()
    db = conn.cursor()
    db.execute('INSERT OR IGNORE INTO preferences (id, attraction_id, `like`) VALUES (?, ?, ?)', (user_id, attraction_id, 1));
    db.execute('UPDATE preferences SET `like` = ? WHERE id = ? AND attraction_id = ?', (1, user_id, attraction_id));
    conn.commit()
    return ''

@app.route('/rate/<int:attraction_id>.json', methods=['POST'])
def rate(attraction_id):
    if 'user' not in session:
        abort(401)
    user_id = session['user']
    rating = request.form.get('rating', type=int)
    conn = get_conn()
    db = conn.cursor()
    db.execute('INSERT OR IGNORE INTO preferences (id, attraction_id, rating) VALUES (?, ?, ?)', (user_id, attraction_id, rating));
    db.execute('UPDATE preferences SET rating = ? WHERE id = ? AND attraction_id = ?', (rating, user_id, attraction_id));
    conn.commit()
    return ''

@app.route('/register.json', methods=['POST'])
def register_json():
    data = request.get_json()
    address = data['address']
    conn = get_conn()
    db = conn.cursor()
    db.execute('INSERT INTO servers (address) VALUES (?)', (address, ));
    conn.commit()
    return ''

@app.route('/unregister.json', methods=['POST'])
def unregister_json():
    data = request.get_json()
    address = data['address']
    conn = get_conn()
    db = conn.cursor()
    db.execute('DELETE FROM servers WHERE address = ?', (address, ));
    conn.commit()
    return ''

if __name__ == '__main__':
    app.config['SECRET_KEY'] = "\xf7\xc2\x13\xc2_':\xd7\xb2l\xc7l\xc0\x13<\x04\xe7lP1\x95\xa9\xc8B"
    app.run(debug=True)
