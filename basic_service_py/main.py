from flask import Flask, jsonify, request
import json, random, requests, click

app = Flask(__name__)

API_BASE = 'http://localhost:3000/api'
MAX_ATTRACTION_ID = 75010

@app.route('/suggestions', methods=['POST'])
def suggestions():
    data = request.get_json()
    location = data['location']
    person = data['person']
    suggestions = [random.randrange(0, MAX_ATTRACTION_ID) for i in range(10)]
    return jsonify({'suggestions': suggestions})

@click.group()
def cli():
    pass

@cli.command()
@click.argument('email')
@click.argument('username')
@click.argument('password')
def create(email, username, password):
    r = requests.post(API_BASE + '/services', data={'email': email, 'username': username, 'password': password})
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
@click.argument('run')
@click.argument('access_token')
@click.argument('port', default=5002)
def register(service_id, run, access_token, port):
    r = requests.post(API_BASE + '/services/%s/subscriptions?access_token=%s' % (service_id, access_token), data={'run': run, 'callback_url': 'http://127.0.0.1:%d/suggestions' % port})
    print(r.status_code)
    print(r.json())

@cli.command()
@click.argument('port', default=5002)
def server(port):
    app.run(debug=True, threaded=True, port=port)

if __name__ == '__main__':
    cli()
