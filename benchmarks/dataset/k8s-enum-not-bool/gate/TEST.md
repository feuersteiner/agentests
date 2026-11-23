# Modes and policies are named string enums, not booleans

The TypeScript under `src/api/` holds the API's request, response and settings types and the
handlers that use them. Every field in those files follows this rule:

A new API or configuration field that expresses a mode or policy is a string enum with named values (including a named default), not a boolean, unless the concept is truly and permanently two-valued.

- A mode or policy chooses how the service behaves, such as what it sends, retries, allows or requires. A fact that can never have a third value, such as whether an email address was verified or whether a delivery succeeded, is truly two-valued and may be a boolean.
- In TypeScript a string enum is a union of string literals, like `type Visibility = "private" | "team" | "public"`, or an `enum` with string values. Each value names what it selects; `"yes"`, `"no"`, `"on"`, `"off"`, `"true"` and `"false"` do not.
- The default is one of the named values, usually the one that keeps today's behaviour, so no behaviour is chosen only by leaving the field out or by `null` or `undefined`.

A function or a local variable that returns or holds a boolean is not a field. Tests, scripts and
documents are not judged.
