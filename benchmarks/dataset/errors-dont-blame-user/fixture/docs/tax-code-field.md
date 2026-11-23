# Employee form: tax code field

Engineering notes for the tax code field added to the employee form in the 2026-11 release. The
label and the help text are already in `locales/en.json`; the error messages are not. The form
looks them up under `employee.errors`.

| Key              | When it shows                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `taxCodeEmpty`   | The user saved the form without a tax code. The field is required for every employee.                                     |
| `taxCodeFormat`  | The user typed something that is not a tax code, e.g. the NI number, or "1257 L" with a space. Valid examples: 1257L, BR, K475, S1257L. |
| `taxCodeScottish` | The user entered an S code for an employee whose address is outside Scotland (or the other way round). HMRC decides this from the home address; the employee's P45 or payslip has the right code. |

A tax code is made of letters and digits only, at most 7 characters. We upper-case it on save.
