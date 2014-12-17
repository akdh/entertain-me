from flask import Flask, jsonify, request
import json, random, requests

app = Flask(__name__)

API_KEY = 'DEMOKEY'
REGISTRATION_URL = 'http://127.0.0.1:5000/%s/registrations' % API_KEY
MAX_ATTRACTION_ID = 75010

@app.route('/suggestions', methods=['GET', 'POST'])
def suggestions():
    if request.method == 'GET':
        return jsonify({'success': True})
    elif request.method == 'POST':
        data = request.get_json()
        location = data['location']
        profile = data['profile']
        user_id = profile['id']
        preferences = profile['preferences']
        suggestions = [random.randrange(0, MAX_ATTRACTION_ID) for i in range(10)]
        return jsonify({'suggestions': suggestions})

@app.route('/register', methods=['GET'])
def register():
    r = requests.post(REGISTRATION_URL, json={'callback_url': 'http://127.0.0.1:5002/suggestions'})
    return str(r.status_code)

if __name__ == '__main__':
    app.run(debug=True, threaded=True, port=5002)
