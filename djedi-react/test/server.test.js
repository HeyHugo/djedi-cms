/**
 * @jest-environment node
 */

import React from "react";
import dedent from "dedent";
import renderer from "react-test-renderer";

import { Node, djedi, md } from "../src";

import { fetch, resetAll, simpleNodeResponse, wait } from "./helpers";

jest.useFakeTimers();

jest.spyOn(Date, "now");

beforeEach(() => {
  resetAll();
  Date.now.mockReset();
});

test("it renders loading and then the node", async () => {
  fetch(
    simpleNodeResponse(
      "test",
      dedent`
        <h1>Heading</h1>
        <p>And a <a href="{url}">link</a>.</p>
      `
    )
  );
  const component = renderer.create(
    <Node uri="test" url="https://example.com/">{md`
      # Heading

      And a [link]({url}).
    `}</Node>
  );
  djedi.options.baseUrl = "http://internal:3210";
  expect(component.toJSON()).toMatchSnapshot("loading");
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  expect(component.toJSON()).toMatchSnapshot("with value");
  expect(typeof window).toBe("undefined");
});

test("djedi.injectAdmin does not do anything", async () => {
  const injected = await djedi.injectAdmin();
  expect(injected).toBe(false);
  expect(fetch.mockFn).toHaveBeenCalledTimes(0);
  expect(typeof document).toBe("undefined");
});

test("when rendering the same view twice, djedi.prefetch results in the same nodes", async () => {
  fetch({
    ...simpleNodeResponse("1", "1"),
    ...simpleNodeResponse("2", "2"),
  });

  function Page() {
    return (
      <div>
        <Node uri="1" />
        <Node uri="2" />
      </div>
    );
  }

  djedi.reportPrefetchableNode({ uri: "1", value: undefined });
  djedi.reportPrefetchableNode({ uri: "2", value: undefined });

  const nodes1 = await djedi.prefetch();
  expect(fetch.mockFn).toHaveBeenCalledTimes(1);
  const component1 = renderer.create(<Page />);
  const tree1 = component1.toJSON();

  await wait();

  const nodes2 = await djedi.prefetch();
  expect(fetch.mockFn).toHaveBeenCalledTimes(1);
  const component2 = renderer.create(<Page />);
  const tree2 = component2.toJSON();

  expect(nodes2).toEqual(nodes1);
  expect(tree2).toEqual(tree1);
});

test("cache ttl", async () => {
  fetch(simpleNodeResponse("test", "test"));

  const start = new Date("2018-01-01").getTime();

  Date.now.mockReturnValue(start);
  djedi.addNodes(simpleNodeResponse("test", "test"));

  // We just added the node so it hasn't expired and the callback is called
  // immediately.
  const callback1 = jest.fn();
  djedi.get({ uri: "test", value: "test" }, callback1);
  expect(callback1).toHaveBeenCalledTimes(1);

  // The default server ttl is short.
  const callback2 = jest.fn();
  Date.now.mockReturnValue(start + 60e3);
  djedi.get({ uri: "test", value: "test" }, callback2);
  expect(callback2).toHaveBeenCalledTimes(0);
  await wait();
  expect(callback2).toHaveBeenCalledTimes(1);
});
