import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as Adapter from "../lib/adapter-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Adapter.AdapterStack(app, "MyTestStack", {
    staticPath: "",
    serverPath: "",
  });
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
