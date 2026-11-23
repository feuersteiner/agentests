# Incident notices state concrete impact

Incident and outage notices say concretely what is and is not affected for the customer (data, orders, payments) and what is being done, instead of vague reassurance such as "don't worry, it's temporary".

Every notice Shelfwise gives merchants about an incident or outage, whether a status page post, an email, an in-app banner or a support macro, says:

- what is affected, in terms a merchant would notice: which feature is failing and what merchants or their shoppers see, not "some issues", "technical difficulties" or "a service disruption";
- whether each of checkout, orders, payments and data is affected, saying so also when it is not;
- what Shelfwise is doing about it and when the next update will come, or, once the incident is over, that it is resolved and what was fixed.

Reassurance never stands in for these facts: no "don't worry", "rest assured", "it's only temporary" or "everything will be back to normal soon". A fact that reassures, such as "no data has been lost", is what the rule asks for.

This applies to the status page posts under `content/status/`, the emails under `emails/`, the
in-app strings under `locales/` and the support macros under `support/macros/`, and within them
only to notices about a Shelfwise incident or outage. Other messages in those files, such as a
welcome email or an error for a single failed save, are out of scope, and so are notices that
other companies send about their own products.

Internal incident notes under `docs/`, the changelog, the README, configuration and scripts are
not shown to merchants and are out of scope.
