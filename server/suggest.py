from requests_futures.sessions import FuturesSession
import db, concurrent, json, requests.exceptions

FALLBACK_URL = 'http://127.0.0.1:5001/suggestions'

def merge_suggestions(suggestions):
    result = []
    i = 0
    while len(suggestions) != 0:
        item = suggestions[i%len(suggestions)].pop(0)
        if item not in result:
            result.append(item)
        if len(suggestions[i%len(suggestions)]) == 0:
            suggestions.remove([])
        else:
            i += 1
    return result

def fetch_suggestions(request_data):
    conn = db.get_conn()

    urls = db.get_callback_urls()
    urls.append(FALLBACK_URL)

    session = FuturesSession()
    headers = {'content-type': 'application/json'}
    futures = [session.post(url, headers=headers, data=json.dumps(request_data)) for url in urls]
    futures = concurrent.futures.wait(futures, timeout=1.0)
    futures = futures.done

    cursor = conn.execute('INSERT INTO suggestion_requests (body) VALUES (?)', (json.dumps(request_data), ))
    conn.commit()
    request_id = cursor.lastrowid

    for url in urls:
        conn.execute('INSERT INTO suggestion_responses (request_id, url, body) VALUES (?, ?, ?)', (request_id, url, None))
        conn.commit()

    all_suggestions = []

    for future in futures:
        try:
            result = future.result()
            request_url = result.request.url
            response_data = result.json()

            conn.execute('UPDATE suggestion_responses SET body = ? WHERE request_id = ? AND url = ?', (json.dumps(response_data), request_id, request_url))
            conn.commit()

            if len(futures) > 1 and request_url == FALLBACK_URL:
                continue
            if not db.is_valid_suggestion(response_data):
                continue
            suggestions = response_data['suggestions']
            all_suggestions.append(suggestions)
        except (ValueError, requests.exceptions.ConnectionError):
            continue

    return merge_suggestions(all_suggestions)[:50]

def get_suggestions(user_id, location_id):
    profile = db.get_profile(user_id)
    request_data = {
        'location': location_id,
        'profile': profile
    }

    suggestions = fetch_suggestions(request_data)
    return suggestions
