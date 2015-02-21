
# Description

A server that negotiates between users seeking personalized recommendations and multiple recommendation services.

# Registering a Service

First you must issue a request to create your new service:

```POST /api/services```

The body of the request should be a JSON object with a password and an email, it is not required that you use a working email address, just one that you will remember (although if you provide us with a valid email address and forget your password we will be able to reset it for you):

    {
      "password": "password",
      "email": "service@example.com"
    }

If you receive a 200 response code your service was successfully created, the response body will contain your service id:

    {
      "email": "service@example.com",
      "id": 1
    }

You must then login with the same credentials used above:

```POST /api/services/login```

Again, the body of the request should be a JSON object with the same password and email:

    {
      "password": "password",
      "email": "service@example.com"
    }

If you receive a 200 response code you successfully logged in, the response body will contain the access token you must you in subsequent requests (the id property).

    {
      "id": "CdpAiW4nrK2frtn3YnRoppdqHJdWMw0uhGOHVNdRvkpkeyacRnOHcPB6Bqebxkse",
      "ttl": 1209600,
      "created": "2015-02-19T17:26:32.769Z",
      "userId": 1
    }

Finally you must subscribe your server so that it receives suggestion requests:

```POST /api/services/:id/subscriptions?access_token=ACCESS_TOKEN```

(where ```:id``` is the service id returned when you created your service and ACCESS_TOKEN is the token returned in the login request)

    {
      "callback_url": "http://example.com/suggestions"
    }

If you receive a 200 response code your server was successfully subscribed. The response code will contain a subscription id.

    {
      "callback_url": "http://example.com/suggestions",
      "id": 1,
      "serviceId": 1
    }

Your server must respond to POST requests send to the callback URL.

If the URL is successfully registered a POST request will be sent to this URL whenever a user wants a list of suggestions. This request will contain a profile and a location, for example:

    {
      "location": {
        "lng": -80.0851,
        "lat": 42.1292,
        "name": "Erie",
        "state": "PA",
        "id": 101
      },
      "person": {
        "id": 1,
        "preferences": [
          {
            "documentId": 4536,
            "rating": 3
          }
        ]
      }
    }

The response to the request should be a list of valid point-of-interest IDs:

    {"suggestions": [42817, 53189, 24572, ...]}

If you register multiple callback URLs each time a user want a list of suggestions one of the URLs will be selected at random.

Additionally you can get a list of callback URLs which you have subscribed with the following request:

```GET /api/services/:id/subscriptions?access_token=ACCESS_TOKEN```

You can also unsubscribe callback URLs with the following request

```DELETE /api/services/:service_id/subscriptions/:subscription_id?access_token=ACCESS_TOKEN```

(where ```:subscription_id``` is the id you received when you initially subscribed the callback URL)
