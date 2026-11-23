---
name: google-no-speculative-generality
description: Use when adding a feature, integration or behaviour change to application source code, in particular TypeScript under src/, for example a new notification or third-party API call, an export or report format, a pricing or discount change, caching, or a new command. Covers how much structure to build, that is, when a plain function is enough and when an interface, registry, factory, options object or extra parameter is not wanted. Applies even when the request does not mention design or architecture.
---

# No speculative generality

## The rule

Build what the task needs now; do not add options, interfaces with a single implementation, registries, factories or parameters for hypothetical future cases.

- The codebase calls each integration directly: `src/mailer.ts` and `src/notify/email.ts` are plain modules of functions, and there is no interface, registry, factory or plugin layer anywhere.

## Why

Code written for a case nobody has asked for has to be read, tested and maintained today, and the
guess about the future case is usually wrong: when the second case arrives it rarely fits the
abstraction that was built for it. A direct function is quick to review and cheap to generalise
later, once two real cases show what they have in common.

## How to apply it

Before you add any of these, name the step of the request that needs it today. If you cannot,
leave it out.

- **An interface, abstract class or function type** in front of one implementation. Write the
  function and call it. Two implementations that the request asks for justify an interface; one
  implementation plus a mock or a "future" one does not.
- **A registry, factory, strategy map or plugin lookup** with one entry. Call the one thing.
- **A generic helper or class** (a cache, a client, an exporter, a rules engine) for a single
  use. Write the specific code where it is used.
- **An option, a defaulted or optional parameter, a config object or an environment variable with
  a fallback** for a value the request fixes. Make it a named constant. A value the request says
  comes from outside, such as credentials, is not a knob.
- **Extra cases** nobody asked for: more formats, channels, currencies or commands.

A parameter that lets a test you are writing supply the time or stand in for the network is a
real need, not a hypothetical one.

Follow the shape of the code that is already there: a module of plain exported functions, called
directly by the code that needs them.

## Example

The request: "Post a message to our Slack channel when a payment fails. The webhook URL is in
SLACK_WEBHOOK_URL."

Violating: a layer and two knobs around one case.

```ts
export interface AlertSink {
	send(alert: Alert): Promise<void>;
}

export class SlackAlertSink implements AlertSink {
	constructor(private options: { webhookUrl?: string; retries?: number } = {}) {}
	async send(alert: Alert): Promise<void> {
		/* the only implementation */
	}
}

const sinks = new Map<string, AlertSink>([['slack', new SlackAlertSink()]]);

export function createAlertSink(kind = 'slack'): AlertSink {
	return sinks.get(kind)!;
}
```

Compliant: the one thing the request needs.

```ts
export async function postPaymentFailed(paymentId: string): Promise<void> {
	const response = await fetch(process.env.SLACK_WEBHOOK_URL!, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text: `Payment ${paymentId} failed.` })
	});
	if (!response.ok) throw new Error(`Slack answered ${response.status}`);
}
```

## Before you commit

Read your staged diff once more. For every new interface, class, type parameter, map of
handlers, options object, optional or defaulted parameter and environment variable, point to the
step of the request that uses it today. Remove the ones you cannot point to, inline what is left
with a single use, and read the diff again.
