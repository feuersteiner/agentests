---
title: Alerts
description: Alert rules on error rates and latency, with links to the traces behind them.
---

# Alerts

Write a rule, choose where it notifies, and open the traces behind it when it fires.

## Rules

A rule watches one service for an error rate or a latency percentile over a window of 1 to 60
minutes. Set a warning threshold and a critical threshold.

## Notifications

Send an alert to Slack, email, PagerDuty or a webhook. The first notification goes out when the
rule fires, and one more when it recovers. A rule that keeps firing does not notify again unless
you set a reminder interval.

## From the alert to the trace

An alert lists up to 20 traces that crossed the threshold, slowest first. Open one to see its
spans and its logs.

## Who can edit rules

Members can create and edit rules. Only admins can delete a rule or change where it notifies.

## Plans

Alerts are on every plan. Free has 3 rules, Team has 50, and Business has no limit.
