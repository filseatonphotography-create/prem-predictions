const { deliverWebPush, pushFailureDetails } = require("../pushTransport");

function harness(sendNotification) {
  const agents = [];
  const createAgent = jest.fn(options => {
    const agent = { options, destroy: jest.fn() };
    agents.push(agent);
    return agent;
  });
  return { client: { sendNotification }, agents, createAgent };
}

test("retries a connection failure over IPv4 and closes both attempts' connections", async () => {
  const send = jest.fn().mockRejectedValueOnce({ code: "ENETUNREACH" }).mockResolvedValueOnce({ statusCode: 201 });
  const { client, agents, createAgent } = harness(send);
  expect(await deliverWebPush(client, {}, "payload", { TTL: 300 }, { createAgent })).toEqual({ statusCode: 201 });
  expect(createAgent.mock.calls).toEqual([[{ keepAlive: false }], [{ keepAlive: false, family: 4 }]]);
  expect(send).toHaveBeenCalledTimes(2);
  expect(agents.every(agent => agent.destroy.mock.calls.length === 1)).toBe(true);
  expect(send.mock.calls[1][1]).toBe("payload");
});

test.each([
  { statusCode: 403 }, { statusCode: 404 }, { statusCode: 410 },
  new Error("The subscription must have auth and p256dh keys"),
])("does not retry permanent or validation failures (%j)", async error => {
  const send = jest.fn().mockRejectedValue(error);
  const { client, createAgent, agents } = harness(send);
  await expect(deliverWebPush(client, {}, "payload", {}, { createAgent })).rejects.toMatchObject({ attempts: 1 });
  expect(send).toHaveBeenCalledTimes(1);
  expect(agents[0].destroy).toHaveBeenCalledTimes(1);
});

test("a DNS/connect hang is bounded even if the library never settles", async () => {
  jest.useFakeTimers();
  try {
    const send = jest.fn(() => new Promise(() => {}));
    const { client, createAgent, agents } = harness(send);
    let failure;
    const sending = deliverWebPush(client, {}, "payload", {}, { createAgent }).catch(error => { failure = error; });
    await Promise.resolve();
    jest.advanceTimersByTime(12000);
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(2);
    expect(agents[0].destroy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(12000);
    await sending;
    expect(failure).toMatchObject({ code: "ETIMEDOUT", attempts: 2 });
    expect(agents[1].destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  } finally { jest.useRealTimers(); }
});

test("keeps useful aggregate network errors without exposing endpoint tokens", () => {
  const failure = pushFailureDetails({
    message: "Cannot connect to https://push.example/private-token",
    errors: [{ code: "ENETUNREACH" }, { code: "ETIMEDOUT" }], attempts: 2,
  });
  expect(failure.code).toBe("ENETUNREACH,ETIMEDOUT");
  expect(failure.attempts).toBe(2);
  expect(failure.message).not.toContain("private-token");
});

test("a socket timeout can retry even when the library supplies no error code", async () => {
  const send = jest.fn().mockRejectedValueOnce(new Error("Socket timeout")).mockResolvedValueOnce({ statusCode: 201 });
  const { client, createAgent } = harness(send);
  await deliverWebPush(client, {}, "payload", {}, { createAgent });
  expect(send).toHaveBeenCalledTimes(2);
});
