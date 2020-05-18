const http = require("http");

const {
  TARGET_HOST,
  TARGET_PORT,
  NUMBER_OF_REQUESTS,
  REQUEST_INTERVAL_MS,
  TCP_KEEPALIVE_INTERVAL,
} = (({
  TARGET_HOST = "haproxy",
  TARGET_PORT = 80,
  NUMBER_OF_REQUESTS = 1,
  REQUEST_INTERVAL_MS = 20000,
  TCP_KEEPALIVE_INTERVAL = 5000,
}) => ({
  TARGET_HOST,
  TARGET_PORT: parseInt(TARGET_PORT, 10),
  NUMBER_OF_REQUESTS: parseInt(NUMBER_OF_REQUESTS, 10),
  REQUEST_INTERVAL_MS: parseInt(REQUEST_INTERVAL_MS, 10),
  TCP_KEEPALIVE_INTERVAL: parseInt(TCP_KEEPALIVE_INTERVAL, 10),
}))(process.env);

const options = {
  hostname: TARGET_HOST,
  port: TARGET_PORT,
  path: "/",
  method: "GET",
};

const socketsArray = [];
const sockets = new WeakMap();
const socketStats = new WeakMap();

const handleNewSocket = (socket, reqIndex, start) => {
  socketsArray.push(socket);
  socketStats.set(socket, { start, reqCount: 1 });
  sockets.set(socket, reqIndex);

  socket.on("end", (withError) => {
    const end = Date.now();
    const stats = socketStats.get(socket);
    socketStats.set(socket, {
      ...stats,
      endTime: end,
      timeToEndEvent: end - start,
      withError,
    });
  });
  socket.on("close", () => {
    const end = Date.now();
    const stats = socketStats.get(socket);
    socketStats.set(socket, {
      ...stats,
      closeTime: end,
      timeToCloseEvent: end - start,
    });
  });
  socket.on("error", (error) => {
    const end = Date.now();
    const stats = socketStats.get(socket);
    socketStats.set(socket, {
      ...stats,
      errorTime: end,
      timeToErrorEvent: end - start,
      error,
    });
  });
  socket.on("ready", () => {
    const end = Date.now();
    const stats = socketStats.get(socket);
    socketStats.set(socket, {
      ...stats,
      readyTime: end,
      timeToReadyEvent: end - start,
    });
  });
  socket.on("connect", () => {
    console.log("#%d new socket created", reqIndex, socket.remoteAddress);
    const end = Date.now();
    const stats = socketStats.get(socket);
    socketStats.set(socket, {
      ...stats,
      connectTime: end,
      timeToConnectEvent: end - start,
    });
  });
};

const printStats = () => {
  const stats = socketsArray
    .map((socket) => socketStats.get(socket))
    .map(
      ({
        start,
        endTime,
        closeTime,
        errorTime,
        readyTime,
        connectTime,
        ...rest
      }) => rest
    )
    .sort(({ reqIndex: a }, { reqIndex: b }) => b - a);

  console.table(stats);
};

const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: TCP_KEEPALIVE_INTERVAL,
});

const makeRequest = (count = 1) => {
  console.log("#%d starting request", count);

  const req = http.request({ ...options, agent }, (res) => {
    // console.log("#%d got response", count, res.statusCode);
    res.on("data", () => {});
    res.on("end", () => {
      // console.log("#%d finished response", count);
      if (count < NUMBER_OF_REQUESTS) {
        setTimeout(() => makeRequest(count + 1), REQUEST_INTERVAL_MS);
        return;
      }
      console.log(
        "all requests done, waiting %d seconds",
        REQUEST_INTERVAL_MS / 1000 + 1
      );
      setTimeout(printStats, REQUEST_INTERVAL_MS + 1000);
    });
  });

  req.on("socket", (socket) => {
    if (sockets.has(socket)) {
      // console.log("#%d reusing socket from", count, sockets.get(socket));
      const stats = socketStats.get(socket);
      const { reqCount } = stats;
      socketStats.set(socket, { ...stats, reqCount: reqCount + 1 });
      return;
    }
    handleNewSocket(socket, count, start);
  });

  const start = Date.now();
  req.end();
};

makeRequest();
