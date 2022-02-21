import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { AWSAdapterStack } from '../lib/adapter-stack';

test('Empty Stack', () => {
  const app = new App();

  const stack = new AWSAdapterStack(app, 'MyTestStack', {
    FQDN: '',
  });

  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
