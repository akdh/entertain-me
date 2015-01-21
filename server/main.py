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
    return render_template('login.html')

@app.route('/logout.html', methods=["GET", "POST"])
def logout():
    if request.method == "POST":
        session.pop('user', None)
        return redirect('/locations.html')
    return render_template('logout.html')

@app.route('/locations.html')
def location():
    locations = db.get_locations()
    locations = sorted(locations, key=lambda x: x['state'])
    locations = [(k, list(g)) for k, g in itertools.groupby(locations, key=lambda x: x['state'])]
    return render_template('locations.html', locations=locations)

@app.route('/locations.json')
def location_json():
    locations = db.get_locations()
    return jsonify(locations=locations)

@app.route('/<int:location_id>/suggestions.html')
def suggestions(location_id):
    if 'user' not in session:
        abort(401)
    user_id = session['user']
    suggestions = suggest.get_suggestions(user_id, location_id)
    return render_template('suggestions.html', suggestions=suggestions, user_id=user_id)

@app.route('/<int:location_id>/suggestions.json')
def suggestions_json(location_id):
    if 'user' not in session:
        abort(401)
    user_id = session['user']
    suggestions = suggest.get_suggestions(user_id, location_id)
    return jsonify(suggestions=suggestions)

@app.route('/<user_id>/profile.html')
def get_profile_html(user_id):
    profile = db.get_profile(user_id)
    preferences = profile['preferences']
    attraction_ids = [preference['attraction_id'] for preference in preferences]
    attractions = db.get_documents(attraction_ids)
    for i in range(len(preferences)):
        preferences[i]['attraction_info'] = attractions[i]

    return render_template('profile.html', preferences=preferences)

@app.route('/<user_id>/profile', methods=['GET'])
def get_profile(user_id):
    profile = db.get_profile(user_id)
    return jsonify(profile)

@app.route('/<user_id>/profile', methods=['POST'])
def update_profile(user_id):
    if 'user' not in session or session['user'] != user_id:
        abort(401)

    data = request.get_json()
    if not db.is_valid_profile(data):
        abort(500)
    db.update_profile(user_id, data)

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
