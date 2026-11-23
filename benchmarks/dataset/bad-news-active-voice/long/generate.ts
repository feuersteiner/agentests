// Writes the long material of this entry's long tasks: transcripts of Ledgerline's support calls from
// 19 October to 13 November 2026, one Markdown file each, under support/calls/. Deterministic: fixed
// seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) throw new Error('Usage: bun long/generate.ts <dir>');

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
type Rand = () => number;
const int = (r: Rand, low: number, high: number) => low + Math.floor(r() * (high - low + 1));
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]!;
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
const pad = (value: number) => String(value).padStart(2, '0');
const money = (pounds: number) => {
	const [whole, pence] = pounds.toFixed(2).split('.');
	return `£${whole!.replace(/\B(?=(\d{3})+$)/g, ',')}.${pence}`;
};

const agents = ['Priya', 'Marcus', 'Siobhan', 'Tolu', 'Hannah', 'Greg', 'Yusuf'];
const firstNames = ['Alison', 'Deepak', 'Morag', 'Stefan', 'Chidi', 'Bronwen', 'Farah', 'Lewis', 'Oksana', 'Trevor', 'Niamh', 'Rashid', 'Gemma', 'Piotr', 'Yvonne', 'Callum', 'Shreya', 'Desmond', 'Katya', 'Owen', 'Maribel', 'Arjun', 'Lorna', 'Kwame', 'Ingrid', 'Bashir', 'Tamsin', 'Elliot', 'Roisin', 'Hamza', 'Cerys', 'Dominic', 'Ayesha', 'Fergus', 'Linh', 'Rosalind'];
const surnames = ['Whitlock', 'Banerjee', 'Okonkwo', 'Prentice', 'Kowalczyk', 'Haldane', 'Mistry', 'Trevelyan', 'Abara', 'Lindqvist', 'Farrow', 'Qureshi', 'Dunmore', 'Nakamura', 'Ellery', 'Castellanos', 'Brathwaite', 'Sorensen', 'Achebe', 'Marchetti'];
const companyHeads = ['Harbour', 'Thistle', 'Brightside', 'Oakfield', 'Copperbeech', 'Northgate', 'Larkrise', 'Saltmarsh', 'Greenfinch', 'Millrace', 'Hollybank', 'Stonebridge', 'Fernhill', 'Tidewater', 'Kingfisher', 'Elmwood', 'Redcliffe', 'Wayland', 'Ashdown', 'Pennine'];
const companyTails = ['Dental Practice', 'Joinery', 'Veterinary Group', 'Nursery', 'Bakehouse', 'Cycles', 'Garden Centre', 'Print Works', 'Physiotherapy', 'Architects', 'Motor Services', 'Care at Home', 'Brewing Co', 'Opticians', 'Electrical', 'Accountancy', 'Coffee Roasters', 'Roofing', 'Language School', 'Framing Studio'];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const months = ['July', 'August', 'September', 'October'];

interface Topic {
	who: 'employer' | 'employee';
	/** How the caller states it, two ways. */
	open: [string, string];
	/** Exchanges, in order: what the caller says, what the agent says. */
	turns: [string, string][];
	/** What Ledgerline does after the call when it cannot finish on the call, as "I will ...". */
	owe: string;
	/** What the caller has to do themselves, as "you will need to ...". */
	act: string;
	/** The team a hard case goes to. */
	team: string;
}

// Slots: {emp} an employee's full name, {amt} and {amt2} amounts, {day} a weekday, {payday} a date,
// {month} a month, {co} the employer, {n} a small number.
const topics: Topic[] = [
	{
		who: 'employer',
		open: ['We have a new starter, {emp}, who joined on the {n}th, and I am not sure how to pay her for a part month.', 'I need to add somebody who started halfway through the month. {emp}. I do not want to overpay.'],
		turns: [
			['Her salary is {amt} a year. Do I work out the days myself?', 'No, you do not need to. Add her under Employees with her real start date and the annual salary, and the run works out the part month for you.'],
			['Does it count calendar days or working days? Our contract says working days.', 'By default we use calendar days. You can switch your company to working days under Settings, Pay rules, and it applies to every part month from then on.'],
			['She has not given me a P45 yet.', 'That is fine. Choose the starter declaration she gives you on the new starter form and we use the matching tax code until HMRC sends a new one.'],
			['And the pension? Does she go in straight away?', 'We assess her on her first pay day. If she is eligible we enrol her and send her the letter, unless you have set a postponement period.']
		],
		owe: 'check the part-month figure on the draft run once you have added her and email you the breakdown',
		act: 'add her with the real start date before you approve the run',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['Someone is leaving us at the end of next week and I have never done a leaver on your system.', 'I need to process a leaver, {emp}, and get the P45 out.'],
		turns: [
			['Where do I put the leaving date?', 'Open the employee, select Mark as leaver and enter the last working day. The final payslip goes into the next run for that date.'],
			['He has {n} days of holiday he has not taken. Do I add that as a bonus?', 'Use the Holiday pay line, not Bonus, so it shows properly on the payslip. Enter the number of days and we calculate the amount from his salary.'],
			['When does he get the P45?', 'We produce it as soon as the final run is paid. He gets it in his portal and by email, and you can download a copy from his record.'],
			['He still has a cycle scheme balance of {amt2}.', 'You can take the outstanding amount from the final pay if your agreement with him allows it. Add it as a deduction on the final payslip, and check it does not take him below minimum wage.']
		],
		owe: 'look at the draft final payslip with the holiday pay on it and confirm the figures by email',
		act: 'mark him as a leaver before the run is approved',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['We want to move pay day from the 28th to the last working day of the month.', 'Can we change from monthly to four-weekly pay? Half the staff are asking.'],
		turns: [
			['Can I change it for the run that is coming up?', 'You can change it for any run that you have not approved yet. Go to Settings, Pay schedule. Runs you have already approved keep their dates.'],
			['Will it affect the tax?', 'Tax and National Insurance follow the pay date, so a different date can move a payment into another tax month. We show you the effect before you confirm.'],
			['Do I need to tell the staff anything?', 'It is good practice to give them notice in writing, and their contract may require it. We update the pay day shown in their portal on the day you change it.'],
			['What about the direct debit?', 'We collect two working days before pay day, so the collection moves with it. You will see the new collection date on the schedule page.']
		],
		owe: 'send you a worked example of the first period under the new schedule',
		act: 'change the schedule yourself under Settings before the next run is approved',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['One of my staff wants to opt out of the pension and I do not know what I am supposed to do.', 'I have had a letter from the pension regulator about re-enrolment and it has frightened me a bit.'],
		turns: [
			['Can I just untick her in the system?', 'Not quite. She has to opt out with the pension provider herself, within one month of being enrolled. Once the provider tells us, we stop the deductions and refund what she paid.'],
			['And if she is past the month?', 'Then she can stop contributing, which is called ceasing membership, but what she has already paid stays in the pot. You record that on her record under Pension.'],
			['What is re-enrolment?', 'Every three years you put back in anyone who opted out and is still eligible. We work out who that is on your re-enrolment date and show you the list to confirm.'],
			['Do I have to tell the regulator?', 'Yes, you complete a re-declaration of compliance on their website within five months of the date. We give you the figures it asks for in the pension report.']
		],
		owe: 'send you the pension report for the last three years with the people affected marked',
		act: 'ask her to opt out with the provider directly and complete the re-declaration yourself',
		team: 'pensions desk'
	},
	{
		who: 'employer',
		open: ['{emp} has been off sick for nearly two weeks and I need to know how to put that through.', 'How do I record sick pay? I have a fit note and nothing else.'],
		turns: [
			['Is it from the first day?', 'Statutory sick pay starts on the fourth qualifying day. The first three are waiting days. Enter the absence dates and his usual working days and we do the counting.'],
			['We pay full pay for the first week under the contract.', 'Then add company sick pay as well. Put the dates under Absence, choose Company sick pay for that week, and we top the statutory amount up to full pay.'],
			['How long can it go on?', 'Statutory sick pay runs for up to 28 weeks. We warn you at week 22 so that you can send him the form he needs to claim benefits afterwards.'],
			['He works different days each week.', 'In that case agree the qualifying days with him, in writing if you can, and enter those. If there is no pattern at all, most employers use Monday to Friday.']
		],
		owe: 'check the absence once you have entered it and tell you what the payslip will show',
		act: 'enter the absence dates and his qualifying days on his record',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['I have my first ever maternity leave to deal with and a MATB1 form on my desk.', 'A member of staff has told me she is pregnant. What do I need to set up, and when?'],
		turns: [
			['What do you need from the form?', 'The expected week of childbirth and the date she wants her leave to start. Enter both under Absence, Maternity, and we work out whether she qualifies and what she gets each week.'],
			['How much is it?', 'For the first six weeks, 90 percent of her average weekly earnings. Then the statutory weekly rate, or 90 percent if that is lower, for 33 weeks.'],
			['Do I get any of it back?', 'You reclaim 92 percent, or 103 percent if you qualify for small employers\' relief. We reduce what you pay HMRC each month by that amount and show it on the P32.'],
			['She wants to come in for a few days during leave.', 'She can work up to ten keeping-in-touch days. Add each one as a KIT day with the pay you have agreed, and her maternity pay carries on.']
		],
		owe: 'send you the week-by-week schedule of her maternity pay once the dates are in',
		act: 'enter the expected week and the leave start date from the MATB1',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['Our part-timers work whatever shifts we have, and I am told I have been getting their holiday pay wrong.', 'How does holiday pay work for someone on zero hours? The app is showing me a percentage and I do not follow it.'],
		turns: [
			['What is the 12.07 percent?', 'For irregular-hours workers you can pay holiday pay as you go, at 12.07 percent of what they earn in each pay period. It shows as its own line on the payslip.'],
			['Do I have to do it that way?', 'No. The other way is to pay them when they take leave, based on their average pay over the last 52 weeks in which they were paid. You choose per employee under Pay rules.'],
			['Some of them have been here for years on the old method.', 'You can leave them as they are. If you move someone to the percentage method, do it from the start of their leave year and tell them in writing.'],
			['Does overtime count?', 'Regular overtime counts towards the average. We include every pay element you have marked as counting for holiday pay, and you can see which those are on the Pay elements page.']
		],
		owe: 'go through your irregular-hours staff and send you a list of who is on which method',
		act: 'choose the method for each of them under Pay rules',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['I am the director and the only person on the payroll. My National Insurance has jumped this month and I do not see why.', 'My accountant says directors\' NI is worked out differently. Is your system doing that?'],
		turns: [
			['What is different about it?', 'A director\'s National Insurance is assessed on the whole year, not month by month. You pay nothing until your earnings pass the annual threshold, and then you pay on everything above it.'],
			['So that is why it was nothing and now it is {amt2}?', 'Exactly. You passed the threshold this month. You can see the cumulative figures on the payslip under the NI section.'],
			['Can I spread it?', 'Yes. Switch your record to the alternative method and we calculate it like an ordinary employee each month, then true it up in March. It is under your record, Tax and NI.'],
			['Does it change the total?', 'No, the total for the year is the same either way. Only the timing changes.']
		],
		owe: 'send you both calculations side by side for the rest of the tax year',
		act: 'switch the method on your own record if you want it spread',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['HMRC have sent me a notice saying a submission was late, and I thought you did all that.', 'I have a penalty warning from HMRC for a late FPS. Can you tell me what happened?'],
		turns: [
			['Which month are they talking about?', 'Looking at your submissions, we sent September\'s on the pay date, the 28th, and HMRC accepted it the same minute. The notice is about {month}, when the run was approved two days after the pay date you had set.'],
			['So that one is on me.', 'The approval came after the pay date, yes, so the submission went in after it too. We send the submission at the moment you approve, and we cannot send it before.'],
			['Can I appeal?', 'You can, through your HMRC online account, and a first late submission in a year does not usually attract a penalty. If you have a reasonable excuse, say what it was.'],
			['How do I stop it happening again?', 'Turn on approval reminders, and add a second approver in case you are away. Both are under Settings, Approvals.']
		],
		owe: 'email you the submission receipts for the last six months, with the times, so you can attach them to an appeal',
		act: 'appeal through your HMRC online account if you want to contest it',
		team: 'compliance team'
	},
	{
		who: 'employer',
		open: ['I have a tax code notice for {emp} and I want to check you have picked it up.', 'One of the team says her tax code changed and her pay did not. Where do I look?'],
		turns: [
			['Do I type the new code in?', 'You should not need to. HMRC send the notices to us electronically and we apply them to the next run. I can see one for her dated the {n}th, and it is on the draft run already.'],
			['It did not apply last month.', 'The notice arrived after you approved last month\'s run, so it took effect from this one. Any tax she overpaid comes back to her automatically in this payslip.'],
			['Can I see the notice myself?', 'Yes, under her record, Tax, there is a history of every code with the date we received it and the run in which we first used it.'],
			['She thinks the code is wrong anyway.', 'Only HMRC can change it. She can check it and tell them about any error through her personal tax account, and they then send us a new notice.']
		],
		owe: 'check that the new code is on the draft run and email you a screenshot of her tax history',
		act: 'ask her to raise the code itself with HMRC',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['We want to pay a one-off bonus to four people this month, and I do not want it treated as a pay rise.', 'How do I add a Christmas bonus without it going through pension and everything else?'],
		turns: [
			['Where does it go?', 'On the draft run, open each person and add a pay element of type Bonus with the amount. It applies to that run only and their salary stays as it is.'],
			['Is it taxed?', 'Yes, a cash bonus is taxed and has National Insurance like any other pay. If you want them to receive {amt2} after deductions, use the net-to-gross option and we work out the gross.'],
			['Does pension come off it?', 'That depends on your scheme\'s definition of pensionable pay. Yours is set to qualifying earnings, so the bonus counts. You can see that under Settings, Pension.'],
			['Can I pay it separately, a week early?', 'You can add a supplementary run with its own pay date. The usual cut-off applies, 15:00 on the working day before.']
		],
		owe: 'work out the gross amounts for a net bonus and send them to you',
		act: 'add the bonus to each person on the draft run',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['We are starting a cycle-to-work scheme and I need to set up the salary sacrifice.', 'How do I put an electric car scheme through payroll? The provider has sent me a schedule of amounts.'],
		turns: [
			['Is it just a deduction?', 'It is a salary sacrifice, which is different from a deduction. It reduces her gross pay before tax and National Insurance. Add it under her record, Salary sacrifice, with the monthly amount and the number of months.'],
			['It is {amt2} a month for twelve months.', 'Enter exactly that. We stop it by itself after the twelfth month, and we warn you if it would take her below the minimum wage in any month.'],
			['Does it affect her pension?', 'It can. If your pension is based on her pay after sacrifice, her contributions fall slightly. Some employers keep a reference salary so that nothing else changes, and you can set one on the same page.'],
			['What if she leaves partway through?', 'The final payslip shows the outstanding balance, and you decide whether to take it from her final pay, according to the agreement she signed.']
		],
		owe: 'check the first payslip with the sacrifice on it before you approve and email you what changed',
		act: 'enter the amount and the number of months on her record',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['I have a letter telling me to start taking student loan repayments from {emp}.', 'A new starter ticked a student loan box on the form and I do not know which plan to choose.'],
		turns: [
			['There are about five plans. Which is it?', 'The start notice from HMRC names the plan. If you only have the starter form, use the plan she ticked there. Enter it on her record under Deductions, Student loan.'],
			['How much comes off?', 'Nine percent of what she earns above the threshold for her plan in each pay period. Below the threshold nothing comes off. We calculate it on every run.'],
			['She says she has nearly paid it off.', 'We carry on until HMRC send a stop notice, and we cannot stop on her word. If she is close to the end she can ask the loans company to switch her to direct debit so that she does not overpay.'],
			['Will you tell me when it stops?', 'Yes. The stop notice comes to us electronically, we apply it to the next run, and you get an email saying so.']
		],
		owe: 'confirm by email which plan HMRC have on the notice we received for her',
		act: 'enter the plan from the notice on her record',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['I have received a court order to take money from an employee\'s wages. I have never seen one before.', 'There is an attachment of earnings order here for one of my staff. What do I do with it?'],
		turns: [
			['Do I have to act on it?', 'Yes, it is a legal obligation on you as the employer. Add it under his record, Deductions, Court order, with the reference, the normal deduction rate and the protected earnings rate from the order.'],
			['What is protected earnings?', 'The amount he must be left with after the deduction. If his pay is low in one month we take less, or nothing, and carry the difference forward where the type of order allows it.'],
			['Who do I pay it to?', 'The order names the court or the agency. We do not pay it for you. The run gives you the amount and the reference, and you send the payment yourself each month.'],
			['Can I charge him for the admin?', 'You can deduct one pound each time you make a deduction under the order. There is a tick box for it on the same page.']
		],
		owe: 'check the order once it is entered and email you the figures the first run will show',
		act: 'enter the order on his record and make the payment to the court each month',
		team: 'compliance team'
	},
	{
		who: 'employer',
		open: ['I want to query our invoice. It is higher than last month and we have not changed anything.', 'Can you explain the subscription charge? I thought we were on the small plan.'],
		turns: [
			['Last month it was {amt2} less.', 'The price follows the number of people you paid in the month. You paid {n} more people in this run than in the last one, and the per-employee part of the invoice went up to match.'],
			['Two of those were leavers getting their final pay.', 'They still count for the month in which you pay them. From next month they drop off and the invoice comes down again.'],
			['Is there a cheaper plan?', 'At your size the Essentials plan would cost less, but it has no pension reports and only one admin user. You can compare the plans under Settings, Billing.'],
			['Can I have the invoices sent to our accountant?', 'Yes. Add a billing contact under Settings, Billing, and we send every invoice there as well as to you.']
		],
		owe: 'send you a line-by-line comparison of the last two invoices',
		act: 'add the billing contact or change plan yourself under Settings, Billing',
		team: 'billing team'
	},
	{
		who: 'employer',
		open: ['I would like to give our accountant access so that she can run payroll when I am away.', 'How do I add a second person to the account? My business partner needs to be able to approve.'],
		turns: [
			['Does she need her own login?', 'Yes, everyone has their own. Go to Settings, Users, select Invite user and enter her email address. She sets her own password.'],
			['Can I limit what she sees?', 'There are three roles. An Approver can approve runs and see everything. A Preparer can build a run but not approve it. A Viewer can only read reports.'],
			['Is there a charge?', 'Your plan includes three admin users. A fourth and beyond are {amt2} a month each.'],
			['What if she leaves the accountancy firm?', 'Remove her under Users and her access ends at once. Nothing she prepared is lost.']
		],
		owe: 'check that the invitation has gone out and resend it if it has not arrived by tomorrow',
		act: 'invite her from Settings, Users, and choose her role',
		team: 'account team'
	},
	{
		who: 'employer',
		open: ['We have changed bank and I need payroll to come out of the new account from this month.', 'I have opened a new business account. How do I move the payroll direct debit across?'],
		turns: [
			['Where do I change it?', 'Under Settings, Bank account, select Change account and enter the new sort code and account number. We text a code to the account holder to confirm.'],
			['The run for this month is already scheduled.', 'Then make the change before 15:00 on the working day before pay day, and that run uses the new account. After that, the run collects from the old one.'],
			['Do I need to cancel the old direct debit?', 'No, leave it. We set up a new instruction on the new account and cancel the old one ourselves once the first collection has gone through.'],
			['The account holder is my co-director and she is abroad.', 'The code goes to the mobile number we hold for her. If she cannot receive texts, she can confirm from the email we send her at the same time.']
		],
		owe: 'confirm by email as soon as the new instruction is active',
		act: 'make the change under Settings before the cut-off and have the account holder confirm the code',
		team: 'payments team'
	},
	{
		who: 'employer',
		open: ['You took {amt} from our account on {day} and I was expecting less. Can you tell me what it was for?', 'The direct debit came out two days before pay day. Why so early?'],
		turns: [
			['Why before pay day?', 'We collect two working days before pay day so that the money has cleared before we pay your staff. The collection date is on the schedule page and in the reminder email.'],
			['The amount is more than the net pay.', 'It also includes the pension contributions, yours and the staff\'s, which we pass to the provider. The run summary lists the three parts: net pay, pension and our fee.'],
			['And HMRC? Is that in there?', 'No. You pay HMRC yourself, by the 22nd of the following month. The amount is on the P32 report, with the payment reference to use.'],
			['Can you collect on pay day instead?', 'Not by direct debit. If you would rather keep the money until the last moment, you can pay us by bank transfer, and it has to reach us by 12:00 on the working day before pay day.']
		],
		owe: 'email you the breakdown of that collection against the run summary',
		act: 'pay HMRC yourself by the 22nd using the reference on the P32',
		team: 'payments team'
	},
	{
		who: 'employer',
		open: ['An ex-employee is asking me for a P60 for last year and I cannot find where they are.', 'Where do I find P60s? And do you do P11Ds, because we have started giving people health cover?'],
		turns: [
			['Where are last year\'s P60s?', 'Under Reports, Year end, choose the tax year and you can download them one by one or all together. Each employee also has theirs in the portal.'],
			['He left in February. Does he get one?', 'No. A P60 is only for people employed on the 5th of April. Someone who left before then has their P45 instead, which shows their pay and tax to the leaving date.'],
			['And P11Ds?', 'We do not produce P11Ds. You can either payroll the benefit through us, so that the tax is collected each month and no P11D is needed, or file P11Ds through HMRC\'s own service.'],
			['How do I payroll the benefit?', 'Register with HMRC before the tax year starts, then add the benefit on each person\'s record with its annual value. We spread the tax over the year.']
		],
		owe: 'send him a statement of earnings for the part of the year he worked, which mortgage lenders usually accept',
		act: 'download the P45 copy from his record and send it to him',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['I overpaid somebody last month. I typed {amt} where it should have been {amt2}.', 'There is a mistake in last month\'s run, my mistake, and I need to get the money back from an employee.'],
		turns: [
			['Can I reverse the run?', 'Not once we have paid it. What you do is correct it in the next run. Open his draft payslip and add a pay element of type Overpayment recovery with the gross amount you overpaid.'],
			['Will the tax sort itself out?', 'Yes. The recovery reduces his taxable pay this month, so the tax and National Insurance he overpaid come back to him in the same payslip.'],
			['It is a lot to take in one go.', 'You can agree to recover it over several months. Enter the total and the number of months, and get his agreement in writing first.'],
			['Do I need to tell HMRC?', 'No. The corrected figures go to them with the next submission and the year-to-date totals come out right.']
		],
		owe: 'check the recovery on the draft payslip and confirm the net effect to you by email',
		act: 'agree the repayment with him in writing and add the recovery to the next run',
		team: 'payroll specialists'
	},
	{
		who: 'employer',
		open: ['I am trying to import our staff from a spreadsheet and it rejects the file every time.', 'We are moving to you from another provider with 40 people. Is there a quicker way than typing them all in?'],
		turns: [
			['It says row 7 is invalid and nothing else.', 'I have the import log open. Row 7 has a National Insurance number with a space in the middle. The importer wants it without spaces, two letters, six digits and a letter.'],
			['And the dates?', 'Day, month, year with slashes, or the ISO format. A spreadsheet often turns them into American dates when it saves as CSV, so check that column in a text editor before you upload.'],
			['We are partway through the tax year.', 'Then include each person\'s year-to-date pay and tax from their last payslip with the old provider. There are columns for those in the template, and we need them to get the first run right.'],
			['Can you do it for us?', 'On your plan the assisted import is a one-off charge of {amt2}. You send us the old provider\'s export and we load it and send you a report to check.']
		],
		owe: 'go through your file against the template and send back a list of the rows to fix',
		act: 'fix the rows the log lists and upload the file again',
		team: 'onboarding team'
	},
	{
		who: 'employer',
		open: ['There is a red warning on the run saying someone is below minimum wage, and she is on a salary.', 'The app will not let me approve without ticking a box about minimum wage. What is that about?'],
		turns: [
			['She is salaried. How can she be under?', 'We divide her pay for the period by the hours on her record. She has just had a birthday, so the rate for her age band went up, and at 40 hours a week her salary now works out a few pence under it.'],
			['The cycle scheme is coming off her pay as well.', 'That is part of it. A salary sacrifice reduces the pay that counts for minimum wage. Without the sacrifice she would be above the rate.'],
			['What are my choices?', 'Raise her salary, reduce her contracted hours on the record if she really works fewer, or pause the sacrifice. The warning clears as soon as the figures are above the rate.'],
			['Can I approve anyway?', 'You can, by ticking the box to say you have seen the warning. We record that you did. Paying below the minimum wage is an offence, so I would sort it out first.']
		],
		owe: 'send you the calculation for her, with the rate and the hours we used',
		act: 'correct her salary, hours or sacrifice before approving',
		team: 'compliance team'
	},
	{
		who: 'employer',
		open: ['My accountant says we should be claiming employment allowance and I cannot see that we are.', 'How do I claim the employment allowance through you?'],
		turns: [
			['Is it automatic?', 'No, you have to claim it each tax year. Under Settings, HMRC, tick Claim employment allowance and we send the claim with your next submission.'],
			['We are in October. Have I missed it?', 'No. You can claim at any point in the year and it applies from the start of the tax year. What you have already paid shows as a credit on your HMRC account.'],
			['Are we eligible? I am a director and there is one employee.', 'With a director and at least one other employee paid above the secondary threshold, usually yes. A company whose only paid person is a director is not. Your accountant can confirm for your case.'],
			['How do I get the credit back?', 'HMRC set it against what you owe in the following months. The P32 shows the allowance used and what remains.']
		],
		owe: 'check after the next submission that HMRC have accepted the claim and let you know',
		act: 'tick the claim under Settings, HMRC, before the next run',
		team: 'payroll specialists'
	},
	{
		who: 'employee',
		open: ['I cannot get into the portal. It says my email is not recognised.', 'I am trying to see my payslip and the login keeps sending me round in circles.'],
		turns: [
			['I am using my Gmail address.', 'That will be it. The portal knows you by the email address your employer entered, which looks like your work one. Try that, and use Forgot password if you need to.'],
			['I do not have a work email. I work in the kitchen.', 'Then your employer may have entered a different personal address, or none. I cannot change it from here, for security. Ask whoever does your payroll to update it on your record.'],
			['How long does that take?', 'It works as soon as they save it. You then get an email from us with a link to set your password. The link lasts 48 hours.'],
			['Can you not just send me the payslip?', 'I am not able to send payslips by email from this line. Your employer can download any of them for you today while the login is sorted out.']
		],
		owe: 'email your employer\'s payroll contact to ask them to check the address on your record',
		act: 'ask your employer to correct the email address on your record',
		team: 'account team'
	},
	{
		who: 'employee',
		open: ['I need my last three payslips for a flat rental and I cannot find them.', 'Where do I get a copy of a payslip from the summer? The letting agent wants them by {day}.'],
		turns: [
			['I only have the emails and they have no attachment.', 'The email is a notification. The payslips themselves are in the portal, at my.ledgerline.example, under Payslips. Choose the month and select Download PDF.'],
			['Does it go back far enough?', 'It holds every payslip your employer has run through us. I can see yours go back to {month} last year.'],
			['The agent wants them stamped by the employer.', 'We cannot stamp them, but each PDF carries a verification code at the foot, and the agent can check it on our website. Most agents accept that.'],
			['I have changed jobs. Can I still get in?', 'Yes. Your login keeps working after you leave, for the payslips and P45 from that employer.']
		],
		owe: 'send you the link to the verification page to pass on to the agent',
		act: 'download them yourself from the portal under Payslips',
		team: 'account team'
	},
	{
		who: 'employee',
		open: ['My tax code has a W1 on the end and I have paid far more tax than usual.', 'I started a new job last month and I think I am on an emergency tax code.'],
		turns: [
			['Why would it be an emergency code?', 'It usually means your employer did not have a P45 or a starter declaration from you when they first paid you, so the system used a code that ignores what you earned earlier in the year.'],
			['I gave them my P45 on day one.', 'I can only see what is on your record, and there is no P45 on it. Ask them to enter it. Once they do, the next payslip uses your proper code.'],
			['Do I get the tax back?', 'Yes. When the right code goes on, the tax you overpaid comes back in your next pay, without you doing anything else.'],
			['Can you change the code?', 'No. Only HMRC or your employer can. You can also check your code in your personal tax account on the government website and tell HMRC about a new job there.']
		],
		owe: 'email your employer\'s payroll contact to say there is no P45 on your record',
		act: 'ask your employer to enter your P45, or contact HMRC about the code',
		team: 'payroll specialists'
	},
	{
		who: 'employee',
		open: ['I have changed bank and I need my wages to go to the new account.', 'How do I update my bank details for my pay? I cannot see where in the portal.'],
		turns: [
			['Can I do it myself?', 'That depends on your employer. Some switch on self-service, and then there is a Bank details page in your portal. Yours has not, so they need to change it for you.'],
			['Can I give you the details now?', 'I am not able to take bank details over the phone. Give them to whoever runs your payroll, and do it in person or by phone, not in an email.'],
			['Pay day is {day}. Is that too late?', 'They can change it up to the moment they approve the run. Once they approve, that month goes to the old account.'],
			['The old account is closing.', 'If a payment goes to a closed account the bank sends it back to us, normally within three working days, and we tell your employer the same day so that they can pay you again.']
		],
		owe: 'let your employer\'s payroll contact know that you need your details changed before the next run',
		act: 'give your new details to your employer before they approve the run',
		team: 'payments team'
	},
	{
		who: 'employee',
		open: ['My pay is {amt2} lower this month and nobody has told me why.', 'I got less than usual this month. Same hours, same job. What has changed?'],
		turns: [
			['What is different on the payslip?', 'Comparing this month with last, your gross pay is the same. The difference is in the deductions. There is a pension contribution this month, and there was none before.'],
			['I never asked for a pension.', 'Employers have to enrol eligible staff automatically. You should have had a letter from us on behalf of your employer. You can opt out with the pension provider within a month and get this contribution back.'],
			['The tax looks different too.', 'It is slightly lower, because pension contributions reduce your taxable pay. So the fall in your take-home pay is smaller than the contribution.'],
			['Who decided the amount?', 'Your employer chose the scheme and the rates. Yours is 5 percent from you and 3 percent from them. For anything about the rates, ask them.']
		],
		owe: 'send you a comparison of your last two payslips, line by line',
		act: 'contact the pension provider if you want to opt out, within a month of the letter',
		team: 'pensions desk'
	},
	{
		who: 'employee',
		open: ['The mortgage broker wants proof of earnings and a P60. Where do I get them?', 'I need my P60 from April and the paper one has gone missing.'],
		turns: [
			['Is the P60 in the portal?', 'Yes, under Documents, Year end. There is one for each tax year you were with this employer on the 5th of April.'],
			['The broker wants it certified.', 'The PDF has a verification code at the foot that the broker can check on our website. If they insist on a signature, that has to come from your employer.'],
			['They also want an employment reference.', 'We do not give references, as we are only the payroll provider. Your employer does that. You can download a statement of earnings for any period from the portal and send it with the request.'],
			['How quickly can I get the statement?', 'Straight away. Under Documents, select Statement of earnings, choose the dates, and it downloads as a PDF.']
		],
		owe: 'email you the steps and the link to the verification page for the broker',
		act: 'download the P60 and the statement from the portal and ask your employer for the reference',
		team: 'account team'
	},
	{
		who: 'employee',
		open: ['I want to put more into my pension and I do not know who to ask.', 'How much is my employer putting into my pension? The payslip only shows my part.'],
		turns: [
			['Where is the employer\'s part?', 'It is on the payslip, lower down, under Employer contributions. It does not come out of your pay, which is why it is not in the deductions column.'],
			['Can I raise mine to 8 percent?', 'Your employer sets that on your record. Ask them, and they can change it from the next run. Some employers match higher contributions, so ask about that too.'],
			['Where does the money actually go?', 'We pass it to the pension provider your employer chose, a few days after each pay day. The provider\'s name and your member number are on the enrolment letter in your portal.'],
			['Can I see the pot?', 'Not with us. The provider has its own website for members, where you see the balance and choose your funds.']
		],
		owe: 'send you a copy of your enrolment letter with the provider\'s details',
		act: 'ask your employer to change your contribution rate',
		team: 'pensions desk'
	},
	{
		who: 'employee',
		open: ['I finished paying my student loan in the summer and it is still coming out of my wages.', 'Why am I still paying student loan? I had a letter saying the balance was nil.'],
		turns: [
			['Can you stop it?', 'Neither we nor your employer can stop it without a stop notice from HMRC. The loans company tells HMRC, and HMRC tell us. It can take a few weeks to come through.'],
			['So I just keep paying?', 'Until the notice arrives, yes. The loans company refunds anything you pay after the balance reached nil. Ring them, as you do not need to wait for them to notice.'],
			['Has the notice arrived yet?', 'There is nothing on your record yet. The last notice we hold for you is the original start notice.'],
			['Will I be told?', 'When it arrives we apply it to the next run and the deduction disappears from your payslip. Your employer gets an email, and you see it in the payslip.']
		],
		owe: 'check your record again in a week and email you if the stop notice has arrived',
		act: 'ring the loans company to chase the stop notice and claim the refund',
		team: 'payroll specialists'
	},
	{
		who: 'employee',
		open: ['I have two jobs and I am paying a fortune in tax on the second one.', 'My second job uses a BR tax code. Is that right? I lose 20 percent of everything.'],
		turns: [
			['Why BR?', 'BR means all the pay from that job is taxed at the basic rate, with no tax-free amount. HMRC give your whole personal allowance to one job, usually the main one.'],
			['Neither job uses the full allowance.', 'Then you can ask HMRC to split the allowance between the two. You do that in your personal tax account or by phone, and they send both employers a new code.'],
			['Can my employer do it?', 'No, and nor can we. The codes come from HMRC, and we apply what they send.'],
			['Will I get back what I have overpaid?', 'Once the new codes are in place the overpaid tax comes back through your pay over the rest of the tax year, or HMRC refund it after April.']
		],
		owe: 'send you the page in the portal that shows which code each payslip used',
		act: 'ask HMRC to split your allowance between the two jobs',
		team: 'payroll specialists'
	}
];

// Generic lines.
const greetings = ['Good {part}, Ledgerline support, {agent} speaking. How can I help?', 'Ledgerline, you are through to {agent}. What can I do for you today?', 'Thank you for calling Ledgerline. My name is {agent}. How can I help you?', 'Hello, Ledgerline support, this is {agent}.'];
const hellos = ['Hello, yes. I hope you can help.', 'Hi {agent}. I have been on hold a while, so I will get straight to it.', 'Morning. Bear with me, I have my notes somewhere.', 'Oh, hello. I was expecting a machine.', 'Hi. I am not sure I have the right department.', 'Hello. Sorry about the noise, I am in the van.'];
const verifyEmployer = ['Before I open the account, can you give me the company name and the last three characters of your PAYE reference?', 'I need to take you through security first. Which company is it, and what is the postcode we hold for the business?', 'Can I take the company name, and your own name as it appears on the account?'];
const verifyEmployee = ['For security, can you confirm your full name, your employer and your date of birth?', 'I need to check a few details first. Who is your employer, and what is the postcode on your payslip?', 'Can I take your name, your employer\'s name and the last three characters of your National Insurance number?'];
const verified = ['Thank you, that matches. I have the record open.', 'Lovely, thank you. You are through security.', 'That is all correct, thanks. One moment while it loads.', 'Thanks. I have you on screen now.'];
const holds = [
	['Can I put you on hold for a minute while I check that?', 'Go on.', 'Thanks for holding. I have it now.'],
	['Bear with me, the page is slow today.', 'No rush.', 'There we are.'],
	['I want to check that with a colleague so that I do not tell you something wrong. Two minutes?', 'That is fine.', 'Thank you for waiting. My colleague agrees with what I was about to say.'],
	['Let me bring up the run so that we are looking at the same thing.', 'OK.', 'Right, I have it in front of me.']
];
const asides = [
	['Sorry, someone has just come into the office. One second. Right, I am back.', 'No problem at all.'],
	['The line is breaking up a little. Can you still hear me?', 'I can hear you. If we get cut off I will ring you back on the number you called from.'],
	['I am writing this down as we go, so forgive the pauses.', 'Take your time. I can also email you a summary afterwards.'],
	['I should say I am new to this. The person who did payroll before me left in the summer.', 'That is all right. Stop me whenever I use a word that means nothing to you.'],
	['Is this call recorded? Only I may want to listen to it again.', 'It is, for training and quality. We cannot send you the recording, but I can email you the main points.'],
	['You are the third person I have spoken to this week, I should say.', 'I am sorry you have had to repeat yourself. I can see the notes from the other calls, so you do not need to start again.'],
	['Hang on, my other phone is going. I will ignore it.', 'Of course.'],
	['I had your chat open as well but it timed out on me.', 'The chat closes after ten minutes without a message. We can finish it here.'],
	['My accountant normally does this, but she is on holiday until the {n}th.', 'We can go through it together. It is less complicated than it looks.'],
	['Do you close at five? I do not want to be cut off halfway.', 'The lines are open until 18:00 on weekdays, so we have time.'],
	['Can I ask your name again? I like to keep a note of who I spoke to.', 'It is {agent}. I will put it in the email as well, with this call\'s reference.'],
	['Is there a direct number for you, in case I need to come back?', 'We do not have direct lines, but anyone who answers can see my notes. Quote the reference from the email.'],
	['I am going to put you on speaker so my colleague can hear. Is that all right?', 'That is fine. Hello to your colleague.'],
	['Sorry, I am reading the help article at the same time and it has just made me more confused.', 'Leave the article for now. I will send you the one that matches your set-up afterwards.'],
	['Do you mind if I repeat that back to you? I want to be sure I have it.', 'Please do. It is the best way to check.'],
	['You will have to speak up a little, the coffee machine is going.', 'I will. Tell me if you miss anything.'],
	['I tried to do this in the app on my phone, by the way, and could not find it at all.', 'The phone app only shows payslips and approvals. For settings you need the website.'],
	['Is this the sort of thing I should have emailed about instead?', 'Either is fine. On the phone we can look at it together, which is usually quicker.'],
	['Last time I rang, the person said something different, I think.', 'I can see the note from that call. It was about another employee, which is why the answer was not the same.'],
	['Give me a moment, the page has logged me out.', 'It does that after fifteen minutes without activity. Take your time.']
];
const backstories = [
	'I should explain that I only took this over in September, and the handover was a page of notes.',
	'I did look at your help pages first. I found three articles and they seemed to disagree with each other.',
	'I asked in the chat last week and got an answer I did not fully understand, so I thought I would ring.',
	'It is probably simple. I just do not want to press the wrong button with real money involved.',
	'My manager asked me to find out, and she wants an answer before the end of the day.',
	'I have been meaning to ring about this for a fortnight and something always got in the way.',
	'We are a small place, so there is nobody else here to ask.',
	'I rang yesterday as well, but the queue was forty minutes and I gave up.',
	'I have the screen open in front of me, if that helps you.',
	'Somebody at work said you would be able to tell me straight away.',
	'I do this once a month and by the next month I have forgotten how.',
	'I am only in two days a week, so today is my one chance to sort it out.',
	'I have it all written on the back of an envelope here, so bear with me.',
	'This is the first time I have had to ring you in two years, which I suppose is a good sign.'
];
const listening = [
	'That is fine. Let me look at what we hold.',
	'No problem. Give me a second to open the right page.',
	'I can help with that. Tell me a bit more.',
	'OK. I have the record here, so ask away.',
	'Understood. We can go through it step by step.',
	'Right. I get asked this a lot, so you are in good company.',
	'Thanks for explaining. Go ahead.',
	'Of course. What would you like to know first?'
];
const bridges = ['While I have you, there is something else.', 'Can I ask about another thing while I am on?', 'One more, if you have a minute.', 'Actually, that reminds me of a different question.', 'Before you go, a colleague asked me to check something too.'];
const acks = ['Right, that makes sense.', 'OK, I follow.', 'I see. I did not know that.', 'Fine. Thank you.', 'Good, that is clearer than the help page.', 'That is what I was hoping you would say.', 'Hmm. All right.', 'OK. Let me write that down.'];

// How the main matter ends. The kind is never written in the file.
type Outcome = 'resolved' | 'owed' | 'caller' | 'team' | 'dropped';
const resolvedLines = [
	['So that is everything for that one?', 'It is. You have done what was needed and there is nothing left for either of us to do.', 'Brilliant. That was easier than I feared.'],
	['I have done that now, while we were talking. Does it look right at your end?', 'It does. I can see the change on the record, and the draft has updated.', 'Good. Then I am sorted.'],
	['So I do not need to do anything else?', 'Nothing else. It is all in place.', 'Thank you. I will stop worrying about it.']
];
const owedLines = [
	['Can you check that for me and get back to me? I do not want to guess.', 'Yes. I will {owe}. You will have it from me by {day}, at the address on the account.', 'By {day}. Fine. I will look out for it.'],
	['I would rather have it in writing, to be honest.', 'Of course. I will {owe}, and I will do it today, before I finish.', 'Thank you, that would help.'],
	['I cannot stay on much longer. Can you finish this without me?', 'I can. I will {owe}, by {day} at the latest.', 'Perfect. Email is best.']
];
const callerLines = [
	['So the next step is mine?', 'It is. You will need to {act}. Once that is done there is nothing more for us to do.', 'Right. I will do that this afternoon.'],
	['Can you do that part for me?', 'I am afraid that part I cannot do from here. You will need to {act}.', 'OK. I had hoped you could, but fine.'],
	['What happens if I leave it?', 'Nothing changes until you do it. You will need to {act}, and ideally before the next run.', 'Understood. I will put it in the diary.']
];
const teamLines = [
	['This does not sound like something you can answer on the spot.', 'Not safely, no. I am passing it to our {team}, with my notes, so that you will not have to explain it again. They will ring you within two working days.', 'Two working days. All right. Same number as today.'],
	['I think this is more complicated than the usual case.', 'I agree, and I would rather the {team} looked at it than give you half an answer. I have opened a case for them now. They contact you by {day}.', 'Fine. As long as somebody does.']
];
const droppedLines = [['Sorry, I am going into a tunnel, I might', '[line lost]'], ['Hold on, there is someone at the door, I will just', '[caller left the line and did not return; call ended after four minutes of silence]'], ['My battery is about to', '[line lost]']];
const droppedNotes = ['Rang back twice on the number shown, no answer. No voicemail left, as the greeting did not give a name.', 'Rang back once and reached voicemail. Left a message asking the caller to ring us and quote this call\'s reference.', 'No number shown for this call, so no call back was possible.'];
const closers = [
	['Is there anything else I can help with today?', 'No, that is everything. Thanks for your help, {agent}.', 'You are welcome. Have a good {part}.'],
	['Anything else while you are on?', 'That is all. Thank you.', 'Thanks for calling Ledgerline. Goodbye.'],
	['Was there anything else?', 'No. You have been very patient, thank you.', 'Not at all. Take care.'],
	['Can I help with anything else?', 'No, I had better get on. Cheers.', 'Thanks, {first}. Goodbye.']
];

const workdays: string[] = [];
for (const [month, from, to] of [['10', 19, 30], ['11', 2, 13]] as const)
	for (let day = from; day <= to; day++) {
		const weekday = new Date(`2026-${month}-${pad(day)}T12:00:00Z`).getUTCDay();
		if (weekday >= 1 && weekday <= 5) workdays.push(`2026-${month}-${pad(day)}`);
	}

const outcomes: Outcome[] = ['resolved', 'owed', 'caller', 'resolved', 'team', 'owed', 'resolved', 'caller', 'dropped', 'owed', 'resolved', 'caller', 'team'];

const call = (index: number, date: string, sequence: number): { name: string; text: string } => {
	const r = mulberry32(0x1ed9e000 + index * 104729);
	const main = topics[(index * 7 + int(r, 0, 4)) % topics.length]!;
	const sameSide = topics.filter((topic) => topic.who === main.who && topic !== main);
	const extras = shuffle(r, sameSide).slice(0, r() < 0.25 ? 1 : 2);
	const outcome = outcomes[(index * 3 + int(r, 0, 3)) % outcomes.length]!;
	const agent = pick(r, agents);
	const first = pick(r, firstNames);
	const last = pick(r, surnames);
	const company = `${pick(r, companyHeads)} ${pick(r, companyTails)}`;
	const hour = int(r, 8, 17);
	const minute = int(r, 0, 59);
	const salary = int(r, 21, 58) * 1000 + int(r, 0, 9) * 100;
	const slots = (): Record<string, string> => ({
		agent,
		first,
		co: company,
		emp: `${pick(r, firstNames)} ${pick(r, surnames)}`,
		amt: money(salary + int(r, 0, 900)),
		amt2: money(int(r, 18, 640) + int(r, 0, 99) / 100),
		day: pick(r, weekdays),
		payday: `${int(r, 20, 30)} ${pick(r, months)}`,
		month: pick(r, months),
		n: String(int(r, 4, 19)),
		part: hour < 12 ? 'morning' : 'afternoon',
		owe: main.owe,
		act: main.act,
		team: main.team
	});
	const fill = (text: string, values = slots()) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? key);
	const lines: string[] = [];
	const a = (text: string) => lines.push(`**${agent}:** ${fill(text)}`);
	const c = (text: string) => lines.push(`**Caller:** ${fill(text)}`);
	const aside = () => {
		if (r() < 0.5) {
			const [said, reply] = pick(r, asides);
			c(said);
			a(reply);
		} else {
			const [ask, ok, back] = pick(r, holds);
			a(ask);
			c(ok);
			lines.push(`*[on hold, ${int(r, 1, 6)} min ${pad(int(r, 0, 59))} s]*`);
			a(back);
		}
	};
	const discuss = (topic: Topic, count: number) => {
		const from = topic.turns.length - count <= 0 ? 0 : int(r, 0, topic.turns.length - count);
		topic.turns.slice(from, from + count).forEach(([said, reply], position) => {
			c(said);
			a(reply);
			if (r() < 0.45) c(pick(r, acks));
			if (position === 1 && r() < 0.6) aside();
		});
	};

	a(pick(r, greetings));
	c(pick(r, hellos));
	if (main.who === 'employer') {
		a(pick(r, verifyEmployer));
		c(`It is ${company}. [gives the details asked for] My name is ${first} ${last}.`);
	} else {
		a(pick(r, verifyEmployee));
		c(`${first} ${last}. I work for ${company}. [gives the details asked for]`);
	}
	a(pick(r, verified));
	// A quick extra question first, in about a third of calls, so the main matter is not always the first one raised.
	const early = extras.length > 1 && r() < 0.35 ? extras.pop()! : undefined;
	if (early) {
		c(`A quick one first, before the real reason I rang. ${fill(pick(r, early.open))}`);
		a(pick(r, listening));
		discuss(early, 2);
		c('Thanks. Now, the main thing.');
	}
	c(pick(r, main.open));
	if (r() < 0.7) c(pick(r, backstories));
	a(pick(r, listening));
	if (r() < 0.5) aside();
	discuss(main, main.turns.length);

	if (outcome === 'dropped') {
		const [said, note] = pick(r, droppedLines);
		c(said);
		lines.push(`*${note}*`);
		lines.push(`*Agent's note after the call: ${pick(r, droppedNotes)}*`);
	} else {
		for (const extra of extras) {
			c(`${pick(r, bridges)} ${fill(pick(r, extra.open))}`);
			a(pick(r, listening));
			discuss(extra, int(r, 2, 4));
			if (r() < 0.3) aside();
		}
		// The main matter is settled only now, after the other questions, so its outcome sits near the end.
		const pool = outcome === 'resolved' ? resolvedLines : outcome === 'owed' ? owedLines : outcome === 'caller' ? callerLines : teamLines;
		const [said, reply, last] = pick(r, pool);
		const values = slots();
		c(`Going back to what I rang about. ${fill(said, values)}`);
		a(fill(reply, values));
		c(fill(last, values));
		const [ask, bye, end] = pick(r, closers);
		a(ask);
		c(bye);
		a(end);
	}

	// The account as the agent's screen showed it.
	const table: string[] = [];
	if (main.who === 'employer') {
		const staff = int(r, 2, 46);
		table.push(`Account: ${company} · ${staff} employees · monthly, paid on the ${int(r, 24, 28)}th · plan: ${pick(r, ['Essentials', 'Standard', 'Standard', 'Plus'])}`, '', '| Run | Pay date | Employees | Gross | Net | Approved |', '| --- | --- | ---: | ---: | ---: | --- |');
		months.forEach((month) => {
			const people = staff + int(r, -2, 2);
			const gross = people * (salary / 12) * (0.8 + r() * 0.4);
			table.push(`| ${month} 2026 | ${int(r, 24, 30)} ${month} | ${Math.max(1, people)} | ${money(gross)} | ${money(gross * (0.72 + r() * 0.06))} | ${int(r, 20, 23)} ${month}, ${pad(int(r, 9, 16))}:${pad(int(r, 0, 59))} |`);
		});
	} else {
		table.push(`Record: ${first} ${last} · employer: ${company} · paid monthly · tax code ${pick(r, ['1257L', '1257L', '1257L', 'BR', '1257L W1', '1185L', 'K310'])}`, '', '| Payslip | Gross | Tax | NI | Pension | Other | Net |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
		for (const month of months) {
			const gross = (salary / 12) * (0.9 + r() * 0.2);
			const tax = gross * (0.1 + r() * 0.06);
			const ni = gross * (0.05 + r() * 0.03);
			const pension = r() < 0.8 ? gross * 0.05 : 0;
			const other = r() < 0.25 ? int(r, 20, 160) : 0;
			table.push(`| ${month} 2026 | ${money(gross)} | ${money(tax)} | ${money(ni)} | ${money(pension)} | ${money(other)} | ${money(gross - tax - ni - pension - other)} |`);
		}
	}

	const contacts = ['', '| Earlier contact | Channel | Length | Handled by |', '| --- | --- | ---: | --- |'];
	for (let i = int(r, 3, 8), day = int(r, 1, 9); i > 0; i--, day += int(r, 1, 6))
		contacts.push(`| ${Math.min(day, 30)} ${pick(r, ['August', 'September'])} | ${pick(r, ['phone', 'phone', 'chat', 'email'])} | ${int(r, 2, 31)} min | ${pick(r, agents)} |`);
	table.push(...contacts);
	if (main.who === 'employer') {
		table.push('', '| Employee | Started | Basis | Weekly hours | Pension |', '| --- | --- | --- | ---: | --- |');
		for (let i = int(r, 6, 14); i > 0; i--)
			table.push(`| ${pick(r, firstNames)} ${pick(r, surnames)} | ${pick(r, ['January', 'March', 'April', 'June', 'September', 'November'])} ${int(r, 2014, 2026)} | ${pick(r, ['salaried', 'salaried', 'hourly'])} | ${pick(r, [16, 20, 24, 30, 37.5, 37.5, 40])} | ${pick(r, ['enrolled', 'enrolled', 'opted out', 'not eligible'])} |`);
	}

	const reference = `C-${date.slice(5, 7)}${date.slice(8)}-${pad(sequence)}${int(r, 10, 99)}`;
	const duration = Math.round(lines.join(' ').length / 16) + int(r, 30, 240);
	const text = [
		`# Call ${reference}`,
		`${date} at ${pad(hour)}:${pad(minute)} · ${Math.floor(duration / 60)} min ${pad(duration % 60)} s · answered by ${agent}`,
		'## On screen',
		table.join('\n'),
		'## Transcript',
		lines.join('\n\n')
	].join('\n\n');
	return { name: `${date}-${reference.toLowerCase()}.md`, text: `${text}\n` };
};

const total = 250;
const folder = join(root, 'support', 'calls');
mkdirSync(folder, { recursive: true });
const perDay = new Map<string, number>();
for (let index = 0; index < total; index++) {
	const date = workdays[Math.floor((index * workdays.length) / total)]!;
	const sequence = (perDay.get(date) ?? 0) + 1;
	perDay.set(date, sequence);
	const { name, text } = call(index, date, sequence);
	writeFileSync(join(folder, name), text);
}
writeFileSync(
	join(folder, 'README.md'),
	`# Call transcripts\n\nTranscripts of the ${total} calls the phone system recorded between 19 October and 13 November 2026, one file\neach, as the transcription service returned them. "On screen" is the account or record the agent had open.\nSecurity answers are left out. The phone system keeps no wrap-up codes, so a call's subject and outcome are\nonly in the transcript.\n`
);
