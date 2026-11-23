---
name: k8s-enum-not-bool
description: Use when adding or changing a field in API request, response or settings types, or in a configuration or options object, in particular TypeScript types and handlers under src/api/. Covers new settings, options, flags, permissions and behaviour switches on a resource, how to type a field that chooses a behaviour (a string union with named values and a named default, not a boolean), and when a boolean is still right.
---

# Modes and policies are named string enums, not booleans

## The rule

A new API or configuration field that expresses a mode or policy is a string enum with named values (including a named default), not a boolean, unless the concept is truly and permanently two-valued.

- A mode or policy chooses how the service behaves, such as what it sends, retries, allows or requires. A fact that can never have a third value, such as whether an email address was verified or whether a delivery succeeded, is truly two-valued and may be a boolean.
- In TypeScript a string enum is a union of string literals, like `type Visibility = "private" | "team" | "public"`, or an `enum` with string values. Each value names what it selects; `"yes"`, `"no"`, `"on"`, `"off"`, `"true"` and `"false"` do not.
- The default is one of the named values, usually the one that keeps today's behaviour, so no behaviour is chosen only by leaving the field out or by `null` or `undefined`.

## Why

Many settings start as yes or no and later need a third option: "shared" becomes "private,
link, public"; "compressed" becomes "gzip, brotli, none". A boolean cannot grow without a
breaking change or a second flag that interacts with the first, while a union takes a new value
and every client keeps working. Named values also read better at the call site and in a JSON
body than `true`, and a negative flag such as `disableX: false` makes readers stop and work out
a double negative. The Kubernetes API conventions put it as "think twice about bool fields".

## How to apply it

When a request asks for "an option to", "a setting that", "allow X to", "skip", "disable" or
"require", ask whether the field chooses a behaviour. If it does:

1. Declare a union of string literals with a name, beside the other types, and give each value
   the name of the behaviour it selects.
2. Include today's behaviour as one of the values and make it the default, written where the
   other defaults are, so existing clients that leave the field out keep the old behaviour.
3. Validate incoming values against the list, as the other settings are validated.

Keep `boolean` for facts about the world that cannot gain a third value: whether something was
verified, delivered, found or enrolled.

## Example

The request: "Add a setting so an invoice can be emailed without the PDF attached."

Violating: a negative boolean, with today's behaviour hidden behind `false`.

```ts
export interface InvoiceSettings {
	currency: Currency;
	skipPdf: boolean; // default false
}
```

Compliant: a named enum, with today's behaviour as the named default.

```ts
export type InvoiceAttachment = 'pdf' | 'none';

export interface InvoiceSettings {
	currency: Currency;
	attachment: InvoiceAttachment;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
	currency: 'EUR',
	attachment: 'pdf'
};
```

Later, `'pdf-and-csv'` is one more value, not a second flag.

## Before you commit

Read the types your diff adds or changes. For every new `boolean` field, say whether it records
a fact or chooses a behaviour; turn each one that chooses a behaviour into a named union with a
named default, and check that no behaviour is left as "the field is missing" or `null`.
