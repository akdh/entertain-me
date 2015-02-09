
# Description

A server that negotiates between users seeking personalized recommendations and multiple recommendation services.

# Service API Documentation

```GET /:key/registrations```

Returns a list of callback URLs registered to your API key:

    {
      "callback_urls": [
        {"callback_url": "http://127.0.0.1:5001/suggestions"},
        {"callback_url": "http://127.0.0.1:5002/suggestions"}
      ]
    }

```POST /:key/registrations?callback_url=URL```

Registers the URL as a callback URL. In order to be valid the callback URL must respond to GET and POST requests.

Immediately after making the registration request a GET request will be sent to this URL, it must respond with a 200 HTTP status code. The URL will not be registered if the response to this request is not received.

If the URL is successfully registered a POST request will be sent to this URL whenever a user wants a list of suggestions. This request will contain a profile and a location, for example:

    {
      "profile": {
        "id": "42",
        "preferences": [
          {
            "attraction_id": 35787,
            "rating": null,
            "read": false,
            "like": true
          },
          ...
        ]
      },
      "location": 145
}

The response to the request should be a list of valid point-of-interest IDs:

    {"suggestions": [42817, 53189, 24572, ...]}

If you register multiple callback URLs each time a user want a list of suggestions one of the URLs will be selected at random.

DELETE /:key/registrations?callback_url=URL

Unregisters the URL as a callback URL.

