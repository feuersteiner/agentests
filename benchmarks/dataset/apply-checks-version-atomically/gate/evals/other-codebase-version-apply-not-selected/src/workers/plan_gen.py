"""Generates meal plans for the week (Oatley Kitchen)."""

def plans_for(week, households):
    return {household.id: household.preferences.pick(week) for household in households}
