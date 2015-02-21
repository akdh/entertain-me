from flask import Flask, jsonify, request
import json, random, requests, click

app = Flask(__name__)

API_BASE = 'http://localhost:3000/api'
MAX_ATTRACTION_ID = 75010

@app.route('/suggestions', methods=['POST'])
def suggestions():
    data = request.get_json()
    location = data['locationId']
    person = data['personId']
    suggestions = [random.randrange(0, MAX_ATTRACTION_ID) for i in range(10)]
    return jsonify({'suggestions': suggestions})

@click.group()
def cli():
    pass

@cli.command()
@click.argument('email')
@click.argument('password')
def create(email, password):
    r = requests.post(API_BASE + '/services', data={'email': email, 'password': password})
    print(r.status_code)
    print(r.json())

@cli.command()
@click.argument('email')
@click.argument('password')
def login(email, password):
    r = requests.post(API_BASE + '/services/login', data={'email': email, 'password': password})
    print(r.status_code)
    print(r.json())

@cli.command()
@click.argument('service_id')
@click.argument('access_token')
def register(service_id, access_token):
    r = requests.post(API_BASE + '/services/%s/subscriptions?access_token=%s' % (service_id, access_token), data={'callback_url': 'http://127.0.0.1:5002/suggestions'})
    print(r.status_code)
    print(r.json())

@cli.command()
def server():
    app.run(debug=True, threaded=True, port=5002)

if __name__ == '__main__':
    cli()
