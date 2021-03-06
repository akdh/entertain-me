
# Description

A server that negotiates between users seeking personalized recommendations and multiple recommendation services.

# Registering a Service

First you must issue an HTTP request to create your new service:

```POST /api/services```

The body of the request should be a JSON object with a password, email, and username. It is not required that you use a working email address, just one that you will remember (although if you provide us with a valid email address and forget your password we will be able to reset it for you). If you are a TREC participant your username should correspond to your TREC group ID:

    {
      "password": "password",
      "email": "service@example.com",
      "username": "group44"
    }

If you receive a 200 response code your service was successfully created, the response body will contain your service id:

    {
      "email": "service@example.com",
      "username": "group44",
      "id": 1
    }

You must then login with the same credentials used above:

```POST /api/services/login```

The body of the request should be a JSON object with the same password and email:

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

Where ```:id``` is the service id returned when you created your service and ACCESS_TOKEN is the token returned in the login request. The body should contain a callback_url field which requests will be sent to, and a run field used to as a name for this subscription (if you are a TREC participant this is your run ID).

    {
      "callback_url": "http://example.com/suggestions",
      "run": "runA"
    }

Your server will be sent a suggestion request immediately to this URL, the server must respond to this request, without errors, in order to successfully subscribe.

If you receive a 200 response code your server was successfully subscribed. The response code will contain a subscription id.

    {
      "callback_url": "http://example.com/suggestions",
      "id": 1,
      "serviceId": 1
    }

Your server must respond to POST requests sent to the callback URL.

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
            "rating": 3,
            "tags": ["Shopping"]
          }
        ]
      },
      "type": null,
      "duration": "Day trip",
      "group": "Friends",
      "season": null
    }

The response to the request should be a list of valid point-of-interest IDs:

    {"suggestions": [42817, 53189, 24572, ...]}

Note that each ID should be valid, if you want to test if an ID is valid you can check with:

```GET /api/documents/:id```

If you recieve a 200 response code then the ID is valid, however you should **not** be making these requests during a suggestion response because this will slow down your response time and you are expected to respond resonably quickly (you are given a couple minutes).

If you register multiple callback URLs each time a user wants a list of suggestions one of the URLs will be selected at random.

Additionally you can get a list of callback URLs which you have subscribed with the following request:

```GET /api/services/:id/subscriptions?access_token=ACCESS_TOKEN```

You can also unsubscribe callback URLs with the following request

```DELETE /api/services/:service_id/subscriptions/:subscription_id?access_token=ACCESS_TOKEN```

(where ```:subscription_id``` is the id you received when you initially subscribed the callback URL)

If there is an error during a request to one of the URLs you have subscribed your suggestions will not be sent to users. You are responsible for ensuring that errors are not being generated during your requests. You can check this using:

```GET /api/services/:service_id/subscriptions/:subscription_id/requests?access_token=ACCESS_TOKEN```

Which will return a list of requests:

    {
      "responses": [
        {
          "body": {
            "suggestions": [5847, 20850, ...]
          },
          "requestId": 1,
          "subscriptionId": 1,
          "error": "Timed out!",
          "updated": "2015-03-14T20:35:52.438Z",
          "id": 1,
          "request": {
            ...
          }
        },
      ]
    }

If the error field in these requests is not ```null``` an error was generated by this request.

A basic Python service that makes random suggestions can be accessed here: https://github.com/akdh/entertain-me/tree/master/basic_service_py. You can use this to get started making your service.

This API can be accessed at: http://entertainme.akdh.ca

WARNING: You may register a service and use the server, however until we announce otherwise the data on this server may be deleted at any time.

Additionally the user interface can be accessed at http://entertainme.akdh.ca/client so once you have registed a service you can register a user account and ask for suggestions to be made in order to try out your service. You may have to make 2 or 3 suggestions requests before your service gets a request because not all user requests are passed on to every service. You can tell if we attempted to query your service using the API call mentioned above.
