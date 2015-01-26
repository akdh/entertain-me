from flask import Flask, jsonify, render_template, request, g, session, redirect, abort
import requests, json, db, suggest, itertools

app = Flask(__name__)

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
    return app.send_static_file('login.html')

@app.route('/logout.html', methods=["GET", "POST"])
def logout():
    if request.method == "POST":
        session.pop('user', None)
        return redirect('/locations.html')
    return app.send_static_file('logout.html')

@app.route('/locations.html')
def location():
    return app.send_static_file('locations.html')

@app.route('/locations.json')
def location_json():
    locations = db.get_locations()
    return jsonify(locations=locations)

@app.route('/docs/_mult')
def get_mult_docs():
    ids = map(int, request.args['ids'].split(','))
    docs = db.get_documents(ids)
    return jsonify({'documents': docs})

@app.route('/<int:location_id>/suggestions.html')
def suggestions(location_id):
    return app.send_static_file('suggestions.html')

@app.route('/<int:location_id>/suggestions.json')
def suggestions_json(location_id):
    if 'user' not in session:
        abort(401)
    user_id = session['user']
    suggestions = suggest.get_suggestions(user_id, location_id)
    return jsonify(suggestions=suggestions)

@app.route('/<user_id>/profile.html')
def get_profile_html(user_id):
    return app.send_static_file('profile.html')

@app.route('/profile.json', methods=['GET'])
@app.route('/profile/<user_id>.json', methods=['GET'])
def get_profile(user_id=None):
    if user_id is None and 'user' in session:
        user_id = session['user']
    if user_id is None:
        abort(401)
    profile = db.get_profile(user_id)
    return jsonify(profile)

@app.route('/profile/<user_id>/<int:attraction_id>', methods=['POST'])
def update_profile(user_id, attraction_id):
    if 'user' not in session or session['user'] != user_id:
        abort(401)

    data = request.get_json()
    if not db.is_valid_profile(data):
        abort(500)
    db.update_profile(user_id, attraction_id, data)

    return ''

@app.route('/<key>/registrations', methods=['GET'])
def get_registrations(key):
    conn = db.get_conn()
    result = conn.execute('SELECT url FROM servers WHERE key = ?', (key, ))
    rows = result.fetchall()
    urls = list(map(lambda row: {'callback_url': row[0]}, rows))
    return jsonify({'callback_urls': urls})

@app.route('/<key>/registrations', methods=['POST'])
def update_registrations(key):
    conn = db.get_conn()
    data = request.get_json()
    if 'callback_url' not in data:
        abort(500)
    url = data['callback_url']

    r = requests.get(url)
    if r.status_code != 200:
        abort(500)

    conn.execute('INSERT INTO servers (key, url) VALUES (?, ?)', (key, url))
    conn.commit()
    return ''

@app.route('/<key>/registrations', methods=['DELETE'])
def delete_registrations(key):
    conn = db.get_conn()
    data = request.get_json()
    if 'callback_url' not in data:
        abort(500)
    url = data['callback_url']
    conn.execute('DELETE FROM servers WHERE key = ? AND url = ?', (key, url));
    conn.commit()
    return ''

if __name__ == '__main__':
    app.config['SECRET_KEY'] = "\xf7\xc2\x13\xc2_':\xd7\xb2l\xc7l\xc0\x13<\x04\xe7lP1\x95\xa9\xc8B"
    app.run(debug=True)
