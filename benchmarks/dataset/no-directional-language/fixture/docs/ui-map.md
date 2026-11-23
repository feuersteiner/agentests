# Mapleform UI map

From the design team, for release 4.2. Internal: it describes the screens for writers and support.
Names in bold are the labels users see in the app.

## Navigation rail

A narrow rail on the left of every screen, top to bottom: **Forms**, **Responses**,
**Integrations**, then **Settings** (gear icon) at the bottom. The user's avatar under it opens
**Account**.

## Form editor

Opens when you select a form in **Forms**. Three areas side by side:

| Area               | Where                                     | What it holds                                                                                                                  |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Fields** panel   | left column                               | Every field type, grouped as Basic, Choice and Advanced. Drag a field onto the canvas, or select it to add it at the end.      |
| Canvas             | centre                                    | The form as respondents see it. Select a field to edit it.                                                                     |
| **Settings** panel | right column, opens when a field is selected | Three tabs for the selected field: **Field** (label, help text, **Required**), **Logic** and **Style** (**Align left**, **Align centre**). |

Top bar, left to right: the form's name (select it to rename the form), **Preview** (eye icon),
**Share**, and **Publish**, the green button in the top right corner.

### Logic tab

- **Add rule**, the blue button with a plus sign at the bottom of the tab, adds a rule to the selected field.
- A rule reads: **When** [field] [condition] [value], **then** [**Show** / **Hide** / **Skip to**] [field or page].
- Conditions: **is**, **is not**, **contains**, **is empty**, **is greater than**, **is less than**.
- A rule can only use a field that comes before the selected field in the form.
- One field can have several rules; they apply in the order listed. Drag a rule by its handle (six dots, to the left of the rule) to move it.
- **Delete rule** is the trash-can icon at the right end of each rule.
- A field with rules shows a small lightning icon on the canvas.
- **Preview** runs the rules, so you can try the form before publishing.
- Logic is on every plan.

## Publishing

**Publish** opens the **Publish form** dialog: choose **Who can respond** (**Anyone with the
link** or **People in my workspace**), then select **Publish form**. The form is live at once and
the **Share** tab opens, with **Copy link**, **QR code** and **Embed**. A published form shows a
green **Live** badge next to its name in **Forms**.

A form needs at least one field to publish. Free workspaces can have 3 published forms at a time.

## Workspace settings (new layout in 4.2)

**Settings** now opens on tabs along the top: **General**, **Members**, **Domains** and
**Billing**.

- Custom domains moved from **General** to the new **Domains** tab. Only workspace owners see the tab, and custom domains need the Business plan.
- **Add domain**, in the top right corner of the tab, replaces the old **Custom domain** field and its **Save** button. It opens a dialog: enter the address, then select **Add**.
- Each domain is a row in the **Domains** table with its **Status**: **Pending DNS**, **Verifying** or **Active**.
- **Check DNS**, a blue button in the row's right-hand cell, replaces the old **Verify** button.
- **Remove** is in the row's three-dots menu, at the far right of the row. The menu's label is **More**.
- The CNAME value is still `custom.mapleform.example`, and the dialog now shows it with a **Copy** button.

## Onboarding tour (planned for 4.2)

Product wants a five-step tooltip tour the first time someone opens the editor, one step per area,
in this order: **Fields** panel, canvas, **Settings** panel, **Preview**, **Publish**. Each step has
a title and a body. The tour's buttons already have strings under `tour.controls`.
