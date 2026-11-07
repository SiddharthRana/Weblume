// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Weblume';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navNewScan => 'New scan';

  @override
  String get navHistory => 'History';

  @override
  String get navAccount => 'Account';

  @override
  String get loading => 'Loading…';

  @override
  String get tryAgain => 'Try again';

  @override
  String get offlineBanner => 'You’re offline. Showing saved data.';

  @override
  String get errorNetwork => 'We couldn’t reach Weblume. Check your connection and try again.';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorSessionExpired => 'Your session has expired. Please log in again.';

  @override
  String get emailLabel => 'Email';

  @override
  String get passwordLabel => 'Password';

  @override
  String get invalidEmail => 'Enter a valid email address.';

  @override
  String get enterEmailPassword => 'Enter your email and password.';

  @override
  String get captchaNotReady => 'Please wait for the security check above to finish, then try again.';

  @override
  String get passwordHint => 'At least 10 characters, with upper- and lowercase letters and a number.';

  @override
  String passwordNeeds(String items) {
    return 'Your password needs $items.';
  }

  @override
  String get loginTitle => 'Log in';

  @override
  String get loginButton => 'Log in';

  @override
  String get googleButton => 'Continue with Google';

  @override
  String get googleOpening => 'Opening Google…';

  @override
  String get orDivider => 'or';

  @override
  String get loggingIn => 'Logging in…';

  @override
  String get forgotPasswordLink => 'Forgot your password?';

  @override
  String get noAccountPrompt => 'New to Weblume?';

  @override
  String get createAccountLink => 'Create a free account';

  @override
  String get signupTitle => 'Create your free account';

  @override
  String get signupButton => 'Create account';

  @override
  String get creatingAccount => 'Creating account…';

  @override
  String get termsNotice => 'By creating an account you agree to the Terms of service and Privacy policy.';

  @override
  String get haveAccountPrompt => 'Already have an account?';

  @override
  String get checkEmailTitle => 'Check your email';

  @override
  String checkEmailBody(String email) {
    return 'If $email can be used for a new account, we’ve sent a confirmation link to it. Open the link on this device to finish.';
  }

  @override
  String get resetTitle => 'Reset your password';

  @override
  String get resetButton => 'Send reset link';

  @override
  String get sending => 'Sending…';

  @override
  String get resetSent =>
      'If an account exists for that email, we’ve sent a link to reset the password. Open it on this device.';

  @override
  String get backToLogin => 'Back to log in';

  @override
  String get newPasswordTitle => 'Choose a new password';

  @override
  String get newPasswordLabel => 'New password';

  @override
  String get confirmPasswordLabel => 'Confirm new password';

  @override
  String get savePassword => 'Save new password';

  @override
  String get saving => 'Saving…';

  @override
  String get passwordsDontMatch => 'The passwords don’t match.';

  @override
  String get passwordUpdated => 'Your password has been updated.';

  @override
  String get authNotConfiguredTitle => 'Accounts aren’t configured';

  @override
  String get authNotConfiguredBody =>
      'This build of the app has no account server configured, so you can’t sign in. You can still run a free scan on the Weblume website.';

  @override
  String get dashboardWelcome => 'Welcome back';

  @override
  String get dashboardWelcomeNew => 'Welcome to Weblume';

  @override
  String dashboardGreeting(String name) {
    return 'Hi, $name';
  }

  @override
  String planName(String plan) {
    return '$plan plan';
  }

  @override
  String retentionDays(int days) {
    return 'Reports are kept for $days days.';
  }

  @override
  String get retentionYear => 'Reports are kept for 12 months.';

  @override
  String get usageTitle => 'Scans this period';

  @override
  String usageCount(int used, int limit) {
    return '$used of $limit used';
  }

  @override
  String usageRemaining(int remaining, String date) {
    return '$remaining left · resets $date';
  }

  @override
  String usageNoneLeft(String date) {
    return 'No scans left · resets $date';
  }

  @override
  String usageSemantics(int used, int limit) {
    return '$used of $limit scans used';
  }

  @override
  String get recentScans => 'Recent scans';

  @override
  String get viewAll => 'View all';

  @override
  String get dashboardEmptyTitle => 'No scans yet';

  @override
  String get dashboardEmptyBody => 'Run your first scan to see a report here.';

  @override
  String get newScanTitle => 'New scan';

  @override
  String get urlLabel => 'Website address';

  @override
  String get urlHint => 'example.com';

  @override
  String get scanButton => 'Scan website';

  @override
  String get starting => 'Starting…';

  @override
  String get scanDisclaimer => 'We check one public page. Only scan websites you own or are allowed to evaluate.';

  @override
  String get urlErrorEmpty => 'Enter a website address, for example example.com.';

  @override
  String get urlErrorTooLong => 'That address is too long (maximum 2048 characters).';

  @override
  String get urlErrorInvalid => 'That doesn’t look like a valid web address.';

  @override
  String get urlErrorScheme => 'Only http:// and https:// addresses can be scanned.';

  @override
  String get urlErrorCredentials => 'Addresses containing a username or password can’t be scanned.';

  @override
  String get urlErrorPort => 'Only standard web ports (80 and 443) can be scanned.';

  @override
  String get urlErrorHost => 'Enter a public website address with a domain name, like example.com.';

  @override
  String get scanningLabel => 'Scanning';

  @override
  String get scanQueued => 'Waiting to start…';

  @override
  String get scanRunning => 'Scan in progress…';

  @override
  String get scanStepFetch => 'Fetching the page and reading its HTML';

  @override
  String get scanStepContent => 'Checking titles, headings, links and metadata';

  @override
  String get scanStepLinks => 'Checking up to 50 links, robots.txt and the sitemap';

  @override
  String get scanStepSpeed => 'Measuring speed with Google PageSpeed Insights';

  @override
  String get scanLeaveOpen => 'This usually takes under a minute. The report appears here when it’s ready.';

  @override
  String scanElapsed(String time) {
    return 'Elapsed time $time';
  }

  @override
  String get scanTakingLong => 'This is taking longer than expected.';

  @override
  String get checkAgain => 'Check again';

  @override
  String get scanFailedTitle => 'Scan failed';

  @override
  String get scanFailedNoData => 'No report was produced, and no scores or findings have been estimated.';

  @override
  String get retryScan => 'Retry scan';

  @override
  String get retrying => 'Retrying…';

  @override
  String get reportNotAvailableTitle => 'Report not available';

  @override
  String get reportNotAvailableBody => 'This report doesn’t exist or has expired.';

  @override
  String get reportTitle => 'Website report';

  @override
  String scannedAt(String date) {
    return 'Scanned $date';
  }

  @override
  String get partialNotice =>
      'Some checks couldn’t be completed. See audit coverage. Everything shown is real data from the checks that did run.';

  @override
  String get lighthouseTitle => 'Lighthouse scores';

  @override
  String get lighthouseSource => 'Measured by Google PageSpeed Insights';

  @override
  String get lighthouseUnavailable =>
      'Lighthouse scores aren’t available for this scan, so none are shown. See audit coverage for the reason.';

  @override
  String get strategyMobile => 'Mobile';

  @override
  String get strategyDesktop => 'Desktop';

  @override
  String get scorePerformance => 'Performance';

  @override
  String get scoreAccessibility => 'Accessibility';

  @override
  String get scoreSeo => 'SEO';

  @override
  String get scoreBestPractices => 'Best practices';

  @override
  String get scoreNotMeasured => 'not measured';

  @override
  String get scoreGood => 'Good';

  @override
  String get scoreNeedsWork => 'Needs work';

  @override
  String get scorePoor => 'Poor';

  @override
  String scoreSemantics(String label, int score, String band) {
    return '$label: $score out of 100, $band';
  }

  @override
  String get findingsSummary => 'Findings summary';

  @override
  String passedChecks(int count) {
    return '$count of Weblume’s own checks passed.';
  }

  @override
  String get topPriorities => 'Start here: top priorities';

  @override
  String get allFindings => 'All findings';

  @override
  String filterAll(int count) {
    return 'All ($count)';
  }

  @override
  String filterCategory(String category, int count) {
    return '$category ($count)';
  }

  @override
  String get categoryPerformance => 'Performance';

  @override
  String get categorySeo => 'SEO';

  @override
  String get categoryAccessibility => 'Accessibility';

  @override
  String get categoryTechnical => 'Technical health';

  @override
  String get noFindingsInCategory => 'No findings in this category.';

  @override
  String get coverageTitle => 'Audit coverage';

  @override
  String get limitationsTitle => 'Limitations';

  @override
  String get limitationsBody =>
      'This is an automated audit of a single page. “Measured” results are Lighthouse lab measurements, which vary between runs. “Detected” findings come from automated checks, which find only some accessibility barriers, can’t guarantee search rankings, and don’t test security.';

  @override
  String get sourcePageFetch => 'Page fetch & HTML checks';

  @override
  String get sourcePsiMobile => 'Lighthouse via PageSpeed Insights (mobile)';

  @override
  String get sourcePsiDesktop => 'Lighthouse via PageSpeed Insights (desktop)';

  @override
  String get sourceLinkCheck => 'Link check (up to 50 links)';

  @override
  String get sourceRobotsSitemap => 'robots.txt & sitemap';

  @override
  String get sourceOk => 'Completed';

  @override
  String get sourceNotConfigured => 'Not available (not configured on this server)';

  @override
  String get sourceDisabled => 'Turned off';

  @override
  String get sourceTimeout => 'Didn’t finish in time';

  @override
  String get sourceQuota => 'Daily quota reached. Try again later';

  @override
  String get sourceUpstream => 'The service returned an error';

  @override
  String get sourceUnavailable => 'Unavailable';

  @override
  String get whatItMeans => 'What this means';

  @override
  String get whyItMatters => 'Why it matters';

  @override
  String get howToFix => 'How to fix it';

  @override
  String get whatWeFound => 'What we found';

  @override
  String get learnMore => 'Learn more';

  @override
  String get kindMeasured => 'Measured';

  @override
  String get kindDetected => 'Detected automatically';

  @override
  String get kindRecommendation => 'Recommendation';

  @override
  String get historyTitle => 'Your scans';

  @override
  String get historySearch => 'Search by address';

  @override
  String get search => 'Search';

  @override
  String get loadMore => 'Load more';

  @override
  String get noMatches => 'No scans match that search';

  @override
  String get historyEmptyTitle => 'No saved scans yet';

  @override
  String get historyEmptyBody => 'Scans you run will be listed here so you can revisit them.';

  @override
  String get statusQueued => 'Queued';

  @override
  String get statusRunning => 'Running';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusPartial => 'Partial';

  @override
  String get statusFailed => 'Failed';

  @override
  String get accountTitle => 'Account';

  @override
  String get profileSection => 'Profile';

  @override
  String signedInAs(String email) {
    return 'Signed in as $email';
  }

  @override
  String get displayNameLabel => 'Display name';

  @override
  String get saveName => 'Save name';

  @override
  String get saved => 'Saved.';

  @override
  String get planSection => 'Plan and usage';

  @override
  String planDetails(int scans) {
    return '$scans scans per period';
  }

  @override
  String get paidComingSoon => 'Paid plans with more scans, PDF reports and share links are coming soon.';

  @override
  String get dataSection => 'Your data';

  @override
  String get logOut => 'Log out';

  @override
  String get legalSection => 'Legal';

  @override
  String get legalOpenInBrowser => 'Open in browser';

  @override
  String get legalLoadFailed => 'We couldn’t load this page. Check your connection and try again.';

  @override
  String get appearanceSection => 'Appearance';

  @override
  String get appearanceBody => 'Choose light or dark, or follow your phone’s setting.';

  @override
  String get themeSystem => 'Phone';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get accountPrivacy => 'Privacy policy';

  @override
  String get accountTerms => 'Terms of service';

  @override
  String get deleteSection => 'Delete account';

  @override
  String get deleteWarning =>
      'This permanently deletes your account, your saved reports and your settings. It can’t be undone. If you subscribed through Google Play, cancel the subscription in Google Play first, because deleting your account doesn’t cancel it.';

  @override
  String get deleteConfirmLabel => 'Type \"DELETE\" to confirm';

  @override
  String get deleteButton => 'Permanently delete my account';

  @override
  String get deleting => 'Deleting…';

  @override
  String get deleteTypeError => 'Type DELETE (in capitals) to confirm.';

  @override
  String get accountDeleted => 'Your account and its data have been deleted.';

  @override
  String get accountDeletionPending =>
      'Your account data has been deleted. Your sign-in record will be removed shortly.';

  @override
  String accountVersion(String version) {
    return 'Version $version';
  }

  @override
  String criticalHighCount(int count) {
    return '$count critical/high';
  }

  @override
  String get subscriptionTitle => 'Upgrade to Starter';

  @override
  String get subscriptionUnavailable => 'Paid plans aren’t available in the app yet.';

  @override
  String get storeUnavailable =>
      'Google Play Billing isn’t available on this device right now. Check that Google Play is installed and you’re signed in, then try again.';

  @override
  String planFeatureScans(int scans) {
    return '$scans scans per billing period';
  }

  @override
  String planFeatureMonitoring(int sites) {
    return 'Monitor $sites sites daily, with email alerts';
  }

  @override
  String get planFeatureRetention => 'Reports kept for 12 months';

  @override
  String get planFeatureCompare => 'Compare scans over time';

  @override
  String get planFeaturePdf => 'PDF reports and private share links';

  @override
  String get offerMonthly => 'Monthly';

  @override
  String get offerAnnual => 'Yearly';

  @override
  String perMonth(String price) {
    return '$price / month';
  }

  @override
  String perYear(String price) {
    return '$price / year';
  }

  @override
  String get subscribe => 'Subscribe';

  @override
  String get restorePurchases => 'Restore purchases';

  @override
  String get playBillingNote =>
      'Payment is charged to your Google Play account. Your subscription renews automatically until you cancel it in Google Play.';

  @override
  String get purchasePendingTitle => 'Waiting for your payment';

  @override
  String get purchasePending =>
      'Google Play is still processing your payment. Your plan updates as soon as it’s done, even if you leave this screen.';

  @override
  String get purchaseVerifyingTitle => 'Confirming your purchase';

  @override
  String get purchaseVerifyingBody => 'This usually takes a few seconds. Please keep the app open.';

  @override
  String get purchaseSuccessTitle => 'You’re on Starter';

  @override
  String get purchaseSuccessBody => 'Thank you! Your new limits and features are ready to use.';

  @override
  String get purchaseFailedTitle => 'Purchase not completed';

  @override
  String get purchaseDelayedTitle => 'Still confirming your purchase';

  @override
  String get purchaseDuplicate =>
      'You now have more than one active subscription (web and Google Play). Cancel the one you don’t need to avoid paying twice.';

  @override
  String get purchaseFailed => 'The purchase didn’t go through. You haven’t been charged.';

  @override
  String get purchaseAccountMismatch => 'This Google Play purchase belongs to a different Weblume account.';

  @override
  String get purchaseVerifyFailed =>
      'We couldn’t confirm your purchase yet. It will be checked again automatically, and you won’t be charged twice.';

  @override
  String get subscribedOnWeb =>
      'You’re subscribed through the Weblume website. You can update your payment details or cancel with our payment partner.';

  @override
  String get subscribedOnPlay => 'You’re subscribed through Google Play.';

  @override
  String get manageOnWeb => 'Manage subscription';

  @override
  String get manageInPlay => 'Manage in Google Play';

  @override
  String get upgradeButton => 'Upgrade to Starter';

  @override
  String subscriptionStatusLine(String channel, String status) {
    return '$channel · $status';
  }

  @override
  String get channelWeb => 'Web';

  @override
  String get channelPlay => 'Google Play';

  @override
  String get subStatusActive => 'Active';

  @override
  String get subStatusTrial => 'Trial';

  @override
  String get subStatusGrace => 'Payment issue (still active)';

  @override
  String get subStatusOnHold => 'On hold: payment failed';

  @override
  String get subStatusPaused => 'Paused';

  @override
  String get subStatusCanceled => 'Cancelled (active until the period ends)';

  @override
  String get subStatusEnded => 'Ended';

  @override
  String get subStatusRefunded => 'Refunded';

  @override
  String get manageSubscription => 'Manage subscription';

  @override
  String get reportActionShare => 'Share link';

  @override
  String get reportActionCompare => 'Compare';

  @override
  String get reportUpsell => 'Share links, PDF reports and before/after comparisons are part of Starter.';

  @override
  String get reportActionDownloadPdf => 'Download PDF';

  @override
  String get reportActionSharePdf => 'Share PDF';

  @override
  String get pdfSaved => 'PDF saved.';

  @override
  String get pdfFailed => 'Couldn’t save the PDF on this device. Try Share PDF instead.';

  @override
  String get shareTitle => 'Share a read-only copy';

  @override
  String get shareBody =>
      'Anyone with the link can view this report without an account. Your email and other reports stay private.';

  @override
  String get shareExpiryLabel => 'Link works for';

  @override
  String shareDays(int days) {
    return '$days days';
  }

  @override
  String get shareOneYear => '1 year';

  @override
  String get shareCreate => 'Create link';

  @override
  String get shareCreating => 'Creating…';

  @override
  String get shareCreated => 'Link created and copied. For security it’s shown only once, so paste it somewhere now.';

  @override
  String get shareCopy => 'Copy';

  @override
  String get shareCopied => 'Copied';

  @override
  String get shareActive => 'Active links';

  @override
  String get shareNone => 'No active links.';

  @override
  String get shareTurnOff => 'Turn off';

  @override
  String shareTurnOffSemantics(String date) {
    return 'Turn off link created $date';
  }

  @override
  String shareCreatedOn(String date) {
    return 'Created $date';
  }

  @override
  String shareExpiresOn(String date) {
    return 'expires $date';
  }

  @override
  String get shareRetentionNote =>
      'A link also stops working when this report reaches the end of its retention period.';

  @override
  String get compareTitle => 'Compare scans';

  @override
  String comparePick(String date) {
    return 'Choose another scan of this address to compare with the one from $date.';
  }

  @override
  String get compareNoOther =>
      'There’s no other finished scan of this address yet. Run a new scan after making changes, then compare the two.';

  @override
  String compareFindingCount(int count) {
    return '$count findings';
  }

  @override
  String compareRange(String from, String to) {
    return '$from → $to';
  }

  @override
  String get compareResolved => 'Resolved';

  @override
  String get compareNew => 'New issues';

  @override
  String get compareStillOpen => 'Still open';

  @override
  String get compareNotComparable => 'Couldn’t compare';

  @override
  String get compareNotComparableBody =>
      'These come from a check that didn’t run in one of the two scans, so we can’t say whether they’re new or fixed.';

  @override
  String compareGroupTitle(String title, int count) {
    return '$title ($count)';
  }

  @override
  String get compareNone => 'None.';

  @override
  String get compareScores => 'Lighthouse scores';

  @override
  String get compareNoScores => 'Neither scan has Lighthouse scores, so no score changes are shown.';

  @override
  String get compareScoresVary => 'Lab scores vary by a few points between runs even when nothing changed.';

  @override
  String compareScoreChange(String before, String after, String change) {
    return '$before → $after ($change)';
  }

  @override
  String compareWasSeverity(String severity) {
    return 'Was $severity';
  }

  @override
  String get seePlans => 'See plans';

  @override
  String get newScanHeadline => 'Audit any website';

  @override
  String get newScanSubtitle => 'Performance, SEO, accessibility and technical health, explained in plain language.';

  @override
  String get whatWeCheck => 'What we check';

  @override
  String get starterTagline => 'For freelancers and agencies who send reports to clients.';

  @override
  String get choosePlan => 'Choose how to pay';

  @override
  String get monitoringTitle => 'Monitoring';

  @override
  String get monitoringSubtitle => 'We re-scan these sites automatically and email you when something changes.';

  @override
  String get monitoringEmpty =>
      'Get an email when new issues appear on your site or its scores change. Scheduled scans don’t use your monthly scans.';

  @override
  String get monitoringPaused => 'Paused';

  @override
  String monitoringNext(String frequency, String date) {
    return '$frequency · next scan $date';
  }

  @override
  String monitoringCount(int used, int limit) {
    return '$used of $limit monitored';
  }

  @override
  String get frequencyDaily => 'Every day';

  @override
  String get frequencyWeekly => 'Every week';

  @override
  String get frequencyMonthly => 'Every month';

  @override
  String get monitoringSkipPlan => 'Paused: your plan doesn’t include monitoring.';

  @override
  String get monitoringSkipLimit => 'Paused: your plan includes fewer monitored sites.';

  @override
  String get monitoringSkipBusy => 'The last run was skipped because the one before was still going.';

  @override
  String get monitoringAddButton => 'Monitor a site';

  @override
  String get monitoringAddBody =>
      'We’ll re-scan it automatically and email you a short summary when something changes. Scheduled scans don’t use your monthly scans.';

  @override
  String get monitoringFrequencyLabel => 'How often';

  @override
  String get monitoringAlertLabel => 'Email me when';

  @override
  String get alertAnyChange => 'Anything changes';

  @override
  String get alertNewFindings => 'New issues appear';

  @override
  String get alertScoreDrop => 'A score drops';

  @override
  String get alertNone => 'Never (just scan)';

  @override
  String get alertAnyChangeHint =>
      'We email you when a scan finds new issues, finds that issues were fixed, or a score moves by 5 points or more. We also tell you if a scan can’t reach your site.';

  @override
  String get alertNewFindingsHint =>
      'We email you only when a scan finds an issue that wasn’t there last time. We also tell you if a scan can’t reach your site.';

  @override
  String get alertScoreDropHint =>
      'We email you only when a Performance, Accessibility, SEO or Best practices score falls by 5 points or more. We also tell you if a scan can’t reach your site.';

  @override
  String get alertNoneHint =>
      'We keep scanning on schedule and save every report, but never email you. Check the latest report on your dashboard.';

  @override
  String get monitoringStart => 'Start monitoring';

  @override
  String get monitoringStarting => 'Starting…';

  @override
  String get monitoringStarted => 'Monitoring started. We’ll email you when something changes.';

  @override
  String get monitoringSettingsTitle => 'Monitoring settings';

  @override
  String get monitoringPause => 'Pause';

  @override
  String get monitoringResume => 'Resume';

  @override
  String get monitoringPausedNote => 'No scans or emails while paused.';

  @override
  String get monitoringOpenLatest => 'Open the latest report';

  @override
  String get monitoringStop => 'Stop monitoring';

  @override
  String get monitoringStopConfirmTitle => 'Stop monitoring this site?';

  @override
  String monitoringStopConfirmBody(String url) {
    return 'Scheduled scans and emails for $url will end. Its past reports are kept.';
  }

  @override
  String monitoringFull(int limit) {
    String _temp0 = intl.Intl.pluralLogic(
      limit,
      locale: localeName,
      other: 'All $limit monitored sites are in use. Stop one to add another.',
      one: 'Your plan’s monitored site is in use. Stop it to add a different one.',
    );
    return '$_temp0';
  }

  @override
  String get monitoringThisSite => 'Monitor this site';

  @override
  String monitoringActive(String frequency) {
    return 'Monitored · $frequency';
  }

  @override
  String get monitoringSaved => 'Saved.';

  @override
  String get exportBody =>
      'Download a copy of everything Weblume holds about your account (your profile, plan, saved reports and monitored sites) as a JSON file.';

  @override
  String get exportDownload => 'Download my data';

  @override
  String get exportShare => 'Share my data';

  @override
  String get exportSaved => 'Your data was saved.';

  @override
  String get exportFailed => 'Couldn’t save the file on this device. Try Share my data instead.';

  @override
  String get portalOpening => 'Opening…';
}
