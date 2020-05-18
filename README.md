# Test timeout precedence for haproxy

This is an aiding repo for [discours](https://discourse.haproxy.org/t/timeout-precedence-in-1-8/5239/3)

## How to run

```sh
docker-compose up
```

starts `haproxy`, a simple backend service and a testing client in nodejs that per default executes a single http request and tries to keep the connection alive for 21s.
In the end, it prints statistics for the used tcp socket(s).

```sh
┌─────────┬──────────┬────────────────────┬──────────────────┬────────────────┬───────────┬──────────────────┐
│ (index) │ reqCount │ timeToConnectEvent │ timeToReadyEvent │ timeToEndEvent │ withError │ timeToCloseEvent │
├─────────┼──────────┼────────────────────┼──────────────────┼────────────────┼───────────┼──────────────────┤
│    0    │    1     │         10         │        10        │     10016      │ undefined │      10019       │
└─────────┴──────────┴────────────────────┴──────────────────┴────────────────┴───────────┴──────────────────┘
```

## How to configure

number of requests and intervals can be adjusted with these environment variables

```sh
TARGET_HOST = 'haproxy'
TARGET_PORT = 80
NUMBER_OF_REQUESTS = 1
REQUEST_INTERVAL_MS = 20000
TCP_KEEPALIVE_INTERVAL = 5000
```

## Further analysis

the haproxy instance's http port is mapped to port `8080` on your machine. Feel free to run node locally so it's easier to take tcpdumps for the req / resp cycles. Use env vars `TARGET_HOST=localhost` and `TARGET_PORT=8080` when running node on your docker host.
