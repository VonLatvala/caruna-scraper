import { chromium } from 'playwright';
import path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';

import { logger } from './logger';
import { toError } from './errors';
import { reportParser } from './reportParser';
import { waitForAnyVisible, fileExists, parseDateRangeFromEnv, } from './utilities';

logger.log({ msg: "Booting application" });
logger.log({ msg: `Loading environment from dotenv` });
dotenv.config();

const CARUNA_URL = 'https://plus.caruna.fi/';
const USERNAME = process.env.CARUNA_USERNAME;
const PASSWORD = process.env.CARUNA_PASSWORD;
const isDebug = process.env.DEBUG_MODE === 'true';
const isSlow = process.env.RUN_SLOWLY === 'true';
const OUTPUT_PATH = process.env.OUTPUT_PATH ? process.env.OUTPUT_PATH : path.join(__dirname, "output.json");
const NAVIGATION_TIMEOUT = process.env.NAVIGATION_TIMEOUT ? parseInt(process.env.NAVIGATION_TIMEOUT) : 5000;
const energyMonitoringUrl = 'https://plus.caruna.fi/person/energy-monitoring'
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

logger.log({ msg: `Validating environment.` });

if (!USERNAME || !PASSWORD) {
	logger.error(Error("Missing CARUNA_USERNAME or CARUNA_PASSWORD in environment variables."));
	process.exit(1);
}

let reportStartDate, reportEndDate;

try {
	({ start: reportStartDate, end: reportEndDate } = parseDateRangeFromEnv(process.env));
} catch (err: unknown) {
	logger.error(toError(err));
	process.exit(1);
}

logger.log({ msg: `Starting execution.` });

(async () => {
	logger.log({ msg: `Launching browser.`, browser: 'chromium' });
	const browser = await chromium.launch({
		headless: !isDebug,
		slowMo: isSlow ? 100 : 0,
	});
	logger.log({ msg: `Saturating browser context with storageState.`, authFile });
	const context = await browser.newContext(
		await fileExists(authFile) ? { storageState: authFile } : {}
	);
	logger.log({ msg: "Launching page." });
	const page = await context.newPage();

	try {
		logger.log({ msg: `Navigating.`, url: CARUNA_URL });
		await page.goto(CARUNA_URL, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT });
		page.screenshot({ path: "post-goto-caruna-url.png"})

		await page.screenshot({ path: "pre-cookie-check.png"})
		logger.log({ msg: "Looking for cookie dialog."});
		let cookieDialogOpen = true;
		try {
			await page.waitForSelector('.onetrust-pc-dark-filter', { state: 'visible', timeout: 2000 })
			cookieDialogOpen = true;
		} catch (err: unknown) {
			cookieDialogOpen = false;
			page.screenshot({ path: "cookie-check-timed-out.png"})
			logger.log({ msg: "Timed out waiting for cookie dialog"})
		}
		logger.log({ cookieDialogOpen })
		if(cookieDialogOpen === true) {
			page.screenshot({ path: "cookie-check-is-visible.png"})
			logger.log({ msg: "Selecting only nescessary cookies."})
			await page.getByRole('button', { name: 'Vain välttämättömät' }).click();
			logger.log({ msg: "Waiting for cookie dialog to disappear."})
			await page.waitForSelector('.onetrust-pc-dark-filter', { state: 'hidden', timeout: 2000 })
			logger.log({ msg: "Cookie dialog disappeared."})
		}

		logger.log({ msg: "Waiting for application to be loaded into login or dashboard views."})
		const dashboardLocator = page.locator('[data-test="click_menuEnergyMonitoring"]');
		const loginFormLocator = page.locator('.loginPanelContent');

		const visibleElement = await waitForAnyVisible(page, [
			dashboardLocator,
			loginFormLocator,
		]);

		logger.log({ msg: "Verifying login."});
		let isLoggedIn = false;
		if (visibleElement === dashboardLocator) {
			logger.log({ msg: 'Logged in.' });
			isLoggedIn = true;
			await page.screenshot({ path: "user-is-logged-in.png"})
		} else {
			logger.log({ msg: 'Login required.' });
			isLoggedIn = false;
			await page.screenshot({ path: "user-is-not-logged-in.png"})
		}

		if (!isLoggedIn) {
			logger.log({ msg: `Performing login.` });
			await page.waitForSelector('#ttqusername', { state: 'visible' })

			logger.log({ msg: "Filling in username." });
			// await page.locator('#ttqusername').click();
			await page.locator('#ttqusername').fill(USERNAME);

			logger.log({ msg: "Filling in password." });
			// await page.locator('#userPassword').click();
			await page.locator('#userPassword').fill(PASSWORD);

			logger.log({ msg: "Clicking login button."});
			await page.getByRole('link', { name: 'Kirjaudu' }).click();

			logger.log({ msg: `Waiting for logout link to appear.` });
			await page.waitForSelector('[data-test="click_logout"]', { state: 'visible' });
			logger.log({ msg: `Found logout link.` });

			logger.log({ msg: "Saving context.", authFile })
			await page.context().storageState({ path: authFile });
			logger.log({ msg: `Saved logged in context.`, authFile })
			await page.screenshot({ path: "post-login.png"})
		}

		logger.log({ msg: `Navigating to Energy Monitoring view.`, url: energyMonitoringUrl });
		await page.goto(energyMonitoringUrl);

		logger.log({ msg: "Getting metering point ID"});
		const meteringPointId = await page.locator('input[name=meteringPointId]').inputValue();
		logger.log({ msg: "Got metering point ID", meteringPointId });

		logger.log({ msg: `Activating report generation dialog.` });
		await page.locator('[data-test="click_downloadReport"]').click();

		logger.log({ msg: "Picking hour based report" })
		await page.getByRole('heading', { name: 'Tuntiraportti' }).click();

		logger.log({ msg: "Setting start date.", reportStartDate });
		await page.locator('[data-test="date_reportFromDate"] input[name="day"]').fill((reportStartDate.getDate()).toString());
		await page.locator('[data-test="date_reportFromDate"] input[name="month"]').fill((reportStartDate.getMonth()+1).toString());
		await page.locator('[data-test="date_reportFromDate"] input[name="year"]').fill((reportStartDate.getFullYear()).toString());

		logger.log({ msg: "Setting end date.", reportEndDate });
		await page.locator('[data-test="date_reportToDate"] input[name="day"]').fill((reportEndDate.getDate()).toString());
		await page.locator('[data-test="date_reportToDate"] input[name="month"]').fill((reportEndDate.getMonth()+1).toString());
		await page.locator('[data-test="date_reportToDate"] input[name="year"]').fill((reportEndDate.getFullYear()).toString());

		logger.log({ msg: "Clicking title of energy report dialog, to make datepickets disappear" });
		await page.locator('[data-test="energyReportDialog"]>div:nth-child(1)').click();

		logger.log({ msg: "Waiting for Report From datepicker to be hidden"});
		await page.locator('[data-test="date_reportFromDate"] .react-calendar').waitFor({ 'state': 'hidden', timeout: 1000 });

		logger.log({ msg: "Waiting for Report To datepicker to be hidden"});
		await page.locator('[data-test="date_reportToDate"] .react-calendar').waitFor({ 'state': 'hidden', timeout: 1000 });

		logger.log({ msg: "Watching for download." });
		const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });

		logger.log({ msg: "Clicking download link." })
		await page.locator('[data-test="click_energyReport"]').click();

		logger.log({ msg: "Waiting for download to commence." });
		const download = await downloadPromise;
		logger.log({ msg: "Download happened." })
		const downloadPath = await download.path();
		logger.log({ msg: `Downloaded file.`, filename: download.suggestedFilename(), downloadPath })
		logger.log({ msg: "Parsing report, adding meteringPointId, and building JSON out of if.", meteringPointId})
		const rows = (await reportParser(downloadPath)).map(row => ({ ...row, meteringPointId }));
		logger.log({ msg: "Built JSON", numRows: rows.length, firstRow: logger.stringify(rows[0]), lastRow: logger.stringify(rows[rows.length-1]) });

		const outputPath = OUTPUT_PATH;
		const json = JSON.stringify(rows, null, 2);
		logger.log({ msg: "Writing data to disk.", outputPath });
		await fs.writeFile(outputPath, json, 'utf-8');
		logger.log({ msg: `Data written to disk.`, outputPath });

	} catch (error) {
		await page.screenshot({ path: "error.png" });
		logger.error(toError(error));
	} finally {
		logger.log({ msg: "Closing browser" })
		await browser.close();
		logger.log({ msg: "Browser closed. Execution over."})
	}
})();
